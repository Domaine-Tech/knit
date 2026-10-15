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
