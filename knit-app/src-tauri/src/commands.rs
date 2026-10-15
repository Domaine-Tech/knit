use knit_core::vault::{self, FileNode};
use std::path::Path;
use tauri_plugin_dialog::DialogExt;

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
    vault_path: String,
    rel_path: String,
    content: String,
) -> Result<(), String> {
    let path = Path::new(&vault_path);
    vault::write_file_content(path, &rel_path, &content).map_err(|e| e.to_string())
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

