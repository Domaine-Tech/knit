use base64::Engine;
use knit_core::markdown::{
    find_backlinks_in_vault, parse_frontmatter as core_parse_fm,
    update_frontmatter_field as core_update_fm, FrontmatterDoc, LinkRefactorReport,
};
use knit_core::vault::{self, FileNode};
use knit_core::watcher::{VaultWatchEvent, VaultWatcher, WriteGuard};
use std::path::Path;
use std::sync::{Arc, Mutex};
use tauri::Emitter;
use tauri_plugin_dialog::DialogExt;

pub struct AppState {
    pub guard: WriteGuard,
    pub watcher: Arc<Mutex<Option<VaultWatcher>>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            guard: WriteGuard::new(),
            watcher: Arc::new(Mutex::new(None)),
        }
    }
}

#[tauri::command]
pub async fn get_vault_tree(vault_path: String) -> Result<Vec<FileNode>, String> {
    let path = Path::new(&vault_path);
    vault::read_vault_tree(path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn read_vault_file(vault_path: String, rel_path: String) -> Result<String, String> {
    let path = Path::new(&vault_path);
    vault::read_file_content(path, &rel_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn write_vault_file(
    state: tauri::State<'_, AppState>,
    vault_path: String,
    rel_path: String,
    content: String,
) -> Result<(), String> {
    let path = Path::new(&vault_path);
    vault::write_file_content_with_guard(path, &rel_path, &content, &state.guard)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_vault_file(
    vault_path: String,
    rel_path: String,
    content: Option<String>,
) -> Result<(), String> {
    let path = Path::new(&vault_path);
    vault::create_file(path, &rel_path, content.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_vault_dir(vault_path: String, rel_path: String) -> Result<(), String> {
    let path = Path::new(&vault_path);
    vault::create_dir(path, &rel_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_vault_path(vault_path: String, rel_path: String) -> Result<(), String> {
    let path = Path::new(&vault_path);
    vault::delete_path(path, &rel_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn trash_vault_path(
    vault_path: String,
    rel_path: String,
) -> Result<vault::TrashRecord, String> {
    let path = Path::new(&vault_path);
    vault::trash_path(path, &rel_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn restore_vault_path(
    vault_path: String,
    trash_id: String,
) -> Result<String, String> {
    let path = Path::new(&vault_path);
    vault::restore_trash_path(path, &trash_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn commit_vault_trash(
    vault_path: String,
    trash_id: String,
) -> Result<(), String> {
    let path = Path::new(&vault_path);
    vault::commit_trash_to_os(path, &trash_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn pick_vault_folder(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let folder = app.dialog().file().blocking_pick_folder();
    match folder {
        Some(path) => Ok(Some(path.to_string())),
        None => Ok(None),
    }
}

#[tauri::command]
pub async fn reveal_in_explorer(vault_path: String, rel_path: String) -> Result<(), String> {
    let path = Path::new(&vault_path);
    let target = if rel_path.is_empty() {
        path.to_path_buf()
    } else {
        vault::resolve_safe_path(path, &rel_path).map_err(|e| e.to_string())?
    };

    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        if target.is_dir() {
            Command::new("explorer")
                .arg(&target)
                .spawn()
                .map_err(|e| e.to_string())?;
        } else {
            Command::new("explorer")
                .arg(format!("/select,{}", target.display()))
                .spawn()
                .map_err(|e| e.to_string())?;
        }
    }

    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        if target.is_dir() {
            Command::new("open")
                .arg(&target)
                .spawn()
                .map_err(|e| e.to_string())?;
        } else {
            Command::new("open")
                .args(["-R", &target.to_string_lossy()])
                .spawn()
                .map_err(|e| e.to_string())?;
        }
    }

    #[cfg(target_os = "linux")]
    {
        use std::process::Command;
        let parent = if target.is_dir() {
            &target
        } else {
            target.parent().unwrap_or(&target)
        };
        Command::new("xdg-open")
            .arg(parent)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub async fn start_vault_watcher(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    vault_path: String,
) -> Result<(), String> {
    let path = Path::new(&vault_path);
    let guard = state.guard.clone();
    let app_handle = app.clone();

    let (watcher, mut rx) = VaultWatcher::new(path, guard, move |event| {
        match event {
            VaultWatchEvent::FileChanged { path, content } => {
                let _ = app_handle.emit(
                    "vault_file_changed",
                    serde_json::json!({ "path": path, "content": content }),
                );
            }
            VaultWatchEvent::FileDeleted { path } => {
                let _ = app_handle.emit(
                    "vault_file_deleted",
                    serde_json::json!({ "path": path }),
                );
            }
            VaultWatchEvent::TreeChanged => {
                let _ = app_handle.emit("vault_tree_changed", ());
            }
        }
    })
    .map_err(|e| e.to_string())?;

    // Écoute de fond pour vider le channel si nécessaire
    tokio::spawn(async move {
        while let Some(_ev) = rx.recv().await {}
    });

    let mut lock = state.watcher.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
    *lock = Some(watcher);

    Ok(())
}

#[tauri::command]
pub async fn stop_vault_watcher(state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut lock = state.watcher.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
    *lock = None;
    Ok(())
}

#[tauri::command]
pub async fn save_vault_asset(
    state: tauri::State<'_, AppState>,
    vault_path: String,
    filename_hint: Option<String>,
    base64_data: String,
) -> Result<String, String> {
    let path = Path::new(&vault_path);

    // Extraction des données brutes en enlevant l'en-tête data:image/...;base64, si présent
    let raw_b64 = if let Some((_, rest)) = base64_data.split_once(',') {
        rest
    } else {
        &base64_data
    };

    let decoded = base64::engine::general_purpose::STANDARD
        .decode(raw_b64.trim())
        .map_err(|e| format!("Erreur décodage base64 image : {}", e))?;

    vault::assets::save_asset(path, filename_hint.as_deref(), &decoded, Some(&state.guard))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn rename_vault_file(
    state: tauri::State<'_, AppState>,
    vault_path: String,
    old_rel_path: String,
    new_rel_path: String,
) -> Result<LinkRefactorReport, String> {
    let path = Path::new(&vault_path);
    vault::rename_file_and_refactor(path, &old_rel_path, &new_rel_path, &state.guard)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn parse_frontmatter(content: String) -> Result<FrontmatterDoc, String> {
    Ok(core_parse_fm(&content))
}

#[tauri::command]
pub async fn update_frontmatter(
    content: String,
    key: String,
    value: String,
) -> Result<String, String> {
    Ok(core_update_fm(&content, &key, &value))
}

#[tauri::command]
pub async fn get_file_backlinks(
    vault_path: String,
    rel_path: String,
) -> Result<Vec<String>, String> {
    let path = Path::new(&vault_path);
    find_backlinks_in_vault(path, &rel_path).map_err(|e| e.to_string())
}
