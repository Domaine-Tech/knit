use crate::commands::{ipc, AppState};
use base64::Engine;
use knit_core::markdown::LinkRefactorReport;
use knit_core::vault::{self, FileNode};
use std::path::Path;
use tauri_plugin_dialog::DialogExt;

#[tauri::command]
pub async fn get_vault_tree(vault_path: String) -> Result<Vec<FileNode>, String> {
    let path = Path::new(&vault_path);
    ipc(vault::read_vault_tree(path))
}

#[tauri::command]
pub async fn read_vault_file(vault_path: String, rel_path: String) -> Result<String, String> {
    let path = Path::new(&vault_path);
    ipc(vault::read_file_content(path, &rel_path))
}

#[tauri::command]
pub async fn write_vault_file(
    state: tauri::State<'_, AppState>,
    vault_path: String,
    rel_path: String,
    content: String,
) -> Result<(), String> {
    let path = Path::new(&vault_path);
    ipc(vault::write_file_content_with_guard(
        path,
        &rel_path,
        &content,
        &state.guard,
    ))
}

#[tauri::command]
pub async fn create_vault_file(
    state: tauri::State<'_, AppState>,
    vault_path: String,
    rel_path: String,
    content: Option<String>,
) -> Result<(), String> {
    let path = Path::new(&vault_path);
    ipc(vault::create_file_with_guard(
        path,
        &rel_path,
        content.as_deref(),
        &state.guard,
    ))
}

#[tauri::command]
pub async fn create_vault_dir(
    state: tauri::State<'_, AppState>,
    vault_path: String,
    rel_path: String,
) -> Result<(), String> {
    let path = Path::new(&vault_path);
    ipc(vault::create_dir_with_guard(path, &rel_path, &state.guard))
}

#[tauri::command]
pub async fn delete_vault_path(
    state: tauri::State<'_, AppState>,
    vault_path: String,
    rel_path: String,
) -> Result<(), String> {
    let path = Path::new(&vault_path);
    ipc(vault::delete_path_with_guard(path, &rel_path, &state.guard))
}

#[tauri::command]
pub async fn trash_vault_path(
    state: tauri::State<'_, AppState>,
    vault_path: String,
    rel_path: String,
) -> Result<vault::TrashRecord, String> {
    let path = Path::new(&vault_path);
    ipc(vault::trash_path_with_guard(path, &rel_path, &state.guard))
}

#[tauri::command]
pub async fn restore_vault_path(
    state: tauri::State<'_, AppState>,
    vault_path: String,
    trash_id: String,
) -> Result<String, String> {
    let path = Path::new(&vault_path);
    ipc(vault::restore_trash_path_with_guard(
        path,
        &trash_id,
        &state.guard,
    ))
}

#[tauri::command]
pub async fn commit_vault_trash(
    vault_path: String,
    trash_id: String,
) -> Result<(), String> {
    let path = Path::new(&vault_path);
    ipc(vault::commit_trash_to_os(path, &trash_id))
}

#[tauri::command]
pub async fn recover_vault_trash(vault_path: String) -> Result<Vec<String>, String> {
    let path = Path::new(&vault_path);
    ipc(vault::recover_orphaned_trash(path))
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
        ipc(vault::resolve_safe_path(path, &rel_path))?
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

    ipc(vault::assets::save_asset(
        path,
        filename_hint.as_deref(),
        &decoded,
        Some(&state.guard),
    ))
}

#[tauri::command]
pub async fn rename_vault_file(
    state: tauri::State<'_, AppState>,
    vault_path: String,
    old_rel_path: String,
    new_rel_path: String,
) -> Result<LinkRefactorReport, String> {
    let path = Path::new(&vault_path);
    ipc(vault::rename_file_and_refactor(
        path,
        &old_rel_path,
        &new_rel_path,
        &state.guard,
    ))
}
