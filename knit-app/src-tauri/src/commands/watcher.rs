use crate::commands::{ipc, AppState};
use knit_core::watcher::{VaultWatchEvent, VaultWatcher};
use std::path::Path;
use tauri::Emitter;

#[tauri::command]
pub async fn start_vault_watcher(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    vault_path: String,
) -> Result<(), String> {
    let path = Path::new(&vault_path);
    let guard = state.guard.clone();
    let app_handle = app.clone();

    let (watcher, mut rx) = ipc(VaultWatcher::new(path, guard, move |event| {
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
    }))?;

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
