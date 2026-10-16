use base64::Engine;
use knit_core::markdown::{
    collect_vault_tags as core_collect_tags, collect_vault_tasks as core_collect_tasks,
    find_backlinks_in_vault, parse_frontmatter as core_parse_fm,
    search_vault as core_search_vault, update_frontmatter_field as core_update_fm,
    update_task_status as core_update_task_status, FileSearchResult, FrontmatterDoc,
    LinkRefactorReport, TagInfo, TaskCard,
};
use knit_core::network::{ConnectedPeerInfo, KnitNetworkNode, RemoteNetworkEvent};
use knit_core::vault::identity::{
    configure_vault_git_author, load_or_create_profile, reset_custom_avatar, save_custom_avatar,
    save_profile, AvatarInfo, PeerIdentity, UserProfile,
};
use knit_core::vault::snapshot::{
    create_and_save_snapshot, list_snapshots_for_doc, load_latest_snapshot, DocSnapshot,
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
    pub network_node: Arc<tokio::sync::RwLock<Option<Arc<KnitNetworkNode>>>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            guard: WriteGuard::new(),
            watcher: Arc::new(Mutex::new(None)),
            network_node: Arc::new(tokio::sync::RwLock::new(None)),
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
pub async fn recover_vault_trash(vault_path: String) -> Result<Vec<String>, String> {
    let path = Path::new(&vault_path);
    vault::recover_orphaned_trash(path).map_err(|e| e.to_string())
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

#[tauri::command]
pub async fn start_p2p_network(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    vault_path: String,
    display_name: String,
    vault_name: Option<String>,
) -> Result<PeerIdentity, String> {
    let path = Path::new(&vault_path);
    let guard = state.guard.clone();

    let node = KnitNetworkNode::start(
        path,
        &display_name,
        vault_name.as_deref(),
        guard,
        true,
    )
    .await
    .map_err(|e| e.to_string())?;

    let mut events_rx = node.subscribe_events();
    let app_handle = app.clone();

    tokio::spawn(async move {
        while let Ok(event) = events_rx.recv().await {
            match event {
                RemoteNetworkEvent::PeerConnected(info) => {
                    let _ = app_handle.emit("p2p_peer_connected", info);
                }
                RemoteNetworkEvent::PeerDisconnected(peer_id) => {
                    let _ = app_handle.emit("p2p_peer_disconnected", serde_json::json!({ "peer_id": peer_id }));
                }
                RemoteNetworkEvent::YjsUpdate { doc_id, update, from_peer } => {
                    let b64 = base64::engine::general_purpose::STANDARD.encode(&update);
                    let _ = app_handle.emit(
                        "p2p_yjs_update",
                        serde_json::json!({ "doc_id": doc_id, "update": b64, "from_peer": from_peer }),
                    );
                }
                RemoteNetworkEvent::YjsAwareness { doc_id, awareness, from_peer } => {
                    let b64 = base64::engine::general_purpose::STANDARD.encode(&awareness);
                    let _ = app_handle.emit(
                        "p2p_awareness_update",
                        serde_json::json!({ "doc_id": doc_id, "awareness": b64, "from_peer": from_peer }),
                    );
                }
                RemoteNetworkEvent::AssetReceived { rel_path, from_peer } => {
                    let _ = app_handle.emit(
                        "p2p_asset_received",
                        serde_json::json!({ "rel_path": rel_path, "from_peer": from_peer }),
                    );
                }
                RemoteNetworkEvent::LanPeerDiscovered(lan_peer) => {
                    let _ = app_handle.emit("p2p_lan_peer_discovered", lan_peer);
                }
                RemoteNetworkEvent::SyncRequestReceived { doc_id, state_vector, from_peer } => {
                    let b64 = base64::engine::general_purpose::STANDARD.encode(&state_vector);
                    let _ = app_handle.emit(
                        "p2p_sync_request_received",
                        serde_json::json!({ "doc_id": doc_id, "state_vector": b64, "from_peer": from_peer }),
                    );
                }
                RemoteNetworkEvent::SyncResponseReceived { doc_id, update, from_peer } => {
                    let b64 = base64::engine::general_purpose::STANDARD.encode(&update);
                    let _ = app_handle.emit(
                        "p2p_sync_response_received",
                        serde_json::json!({ "doc_id": doc_id, "update": b64, "from_peer": from_peer }),
                    );
                }
                RemoteNetworkEvent::ProfileUpdated { from_peer, profile } => {
                    let _ = app_handle.emit(
                        "p2p_profile_updated",
                        serde_json::json!({ "from_peer": from_peer, "profile": profile }),
                    );
                }
            }
        }
    });

    let identity = node.identity.clone();
    let mut lock = state.network_node.write().await;
    *lock = Some(node);

    Ok(identity)
}

#[tauri::command]
pub async fn stop_p2p_network(state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut lock = state.network_node.write().await;
    if let Some(node) = lock.take() {
        node.stop().await;
    }
    Ok(())
}

#[tauri::command]
pub async fn get_p2p_invitation_code(state: tauri::State<'_, AppState>) -> Result<String, String> {
    let lock = state.network_node.read().await;
    if let Some(node) = lock.as_ref() {
        node.get_invitation_code().map_err(|e| e.to_string())
    } else {
        Err("Le réseau P2P n'est pas actif pour ce coffre".to_string())
    }
}

#[tauri::command]
pub async fn connect_p2p_peer(
    state: tauri::State<'_, AppState>,
    invitation_code: String,
) -> Result<ConnectedPeerInfo, String> {
    let node_opt = {
        let lock = state.network_node.read().await;
        lock.clone()
    };

    if let Some(node) = node_opt {
        node.connect_by_ticket(&invitation_code)
            .await
            .map_err(|e| e.to_string())
    } else {
        Err("Le réseau P2P n'est pas actif pour ce coffre".to_string())
    }
}

#[tauri::command]
pub async fn get_connected_peers(
    state: tauri::State<'_, AppState>,
) -> Result<Vec<ConnectedPeerInfo>, String> {
    let lock = state.network_node.read().await;
    if let Some(node) = lock.as_ref() {
        Ok(node.get_connected_peers().await)
    } else {
        Ok(Vec::new())
    }
}

#[tauri::command]
pub async fn broadcast_yjs_update(
    state: tauri::State<'_, AppState>,
    doc_id: String,
    update_base64: String,
) -> Result<(), String> {
    let lock = state.network_node.read().await;
    if let Some(node) = lock.as_ref() {
        let bytes = base64::engine::general_purpose::STANDARD
            .decode(&update_base64)
            .map_err(|e| format!("Erreur décodage base64 update: {}", e))?;
        node.broadcast_yjs_update(&doc_id, &bytes).await;
    }
    Ok(())
}

#[tauri::command]
pub async fn broadcast_awareness(
    state: tauri::State<'_, AppState>,
    doc_id: String,
    awareness_base64: String,
) -> Result<(), String> {
    let lock = state.network_node.read().await;
    if let Some(node) = lock.as_ref() {
        let bytes = base64::engine::general_purpose::STANDARD
            .decode(&awareness_base64)
            .map_err(|e| format!("Erreur décodage base64 awareness: {}", e))?;
        node.broadcast_awareness(&doc_id, &bytes).await;
    }
    Ok(())
}

#[tauri::command]
pub async fn sync_asset_from_peers(
    state: tauri::State<'_, AppState>,
    rel_path: String,
    blake3_hash: String,
) -> Result<bool, String> {
    let lock = state.network_node.read().await;
    if let Some(node) = lock.as_ref() {
        node.sync_asset_from_peers(&rel_path, &blake3_hash)
            .await
            .map_err(|e| e.to_string())
    } else {
        Ok(false)
    }
}

#[tauri::command]
pub async fn get_local_peer_identity(
    state: tauri::State<'_, AppState>,
) -> Result<Option<PeerIdentity>, String> {
    let lock = state.network_node.read().await;
    Ok(lock.as_ref().map(|node| node.identity.clone()))
}

#[tauri::command]
pub async fn get_user_profile(
    state: tauri::State<'_, AppState>,
    vault_path: String,
) -> Result<UserProfile, String> {
    let path = Path::new(&vault_path);
    let lock = state.network_node.read().await;
    if let Some(node) = lock.as_ref() {
        Ok(node.get_local_profile().await)
    } else {
        load_or_create_profile(path, "Moi").map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub async fn save_user_profile(
    state: tauri::State<'_, AppState>,
    vault_path: String,
    profile: UserProfile,
) -> Result<(), String> {
    let path = Path::new(&vault_path);
    save_profile(path, &profile).map_err(|e| e.to_string())?;

    let lock = state.network_node.read().await;
    if let Some(node) = lock.as_ref() {
        node.update_local_profile(profile).await.map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn upload_user_avatar(
    state: tauri::State<'_, AppState>,
    vault_path: String,
    image_base64: String,
    mime_type: String,
) -> Result<AvatarInfo, String> {
    let path = Path::new(&vault_path);
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(&image_base64)
        .map_err(|e| format!("Base64 invalide: {}", e))?;

    let avatar = save_custom_avatar(path, &bytes, &mime_type).map_err(|e| e.to_string())?;

    let lock = state.network_node.read().await;
    if let Some(node) = lock.as_ref() {
        let mut prof = node.get_local_profile().await;
        prof.avatar = avatar.clone();
        let _ = node.update_local_profile(prof).await;
    }

    Ok(avatar)
}

#[tauri::command]
pub async fn reset_user_avatar(
    state: tauri::State<'_, AppState>,
    vault_path: String,
) -> Result<AvatarInfo, String> {
    let path = Path::new(&vault_path);
    let avatar = reset_custom_avatar(path).map_err(|e| e.to_string())?;

    let lock = state.network_node.read().await;
    if let Some(node) = lock.as_ref() {
        let mut prof = node.get_local_profile().await;
        prof.avatar = avatar.clone();
        let _ = node.update_local_profile(prof).await;
    }

    Ok(avatar)
}

#[tauri::command]
pub async fn apply_profile_to_git(
    vault_path: String,
    name: String,
    email: String,
) -> Result<bool, String> {
    let path = Path::new(&vault_path);
    configure_vault_git_author(path, &name, &email).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_doc_snapshot(
    state: tauri::State<'_, AppState>,
    vault_path: String,
    doc_id: String,
    state_vector_base64: String,
    yjs_snapshot_base64: String,
) -> Result<DocSnapshot, String> {
    let path = Path::new(&vault_path);
    let profile = {
        let lock = state.network_node.read().await;
        if let Some(node) = lock.as_ref() {
            node.get_local_profile().await
        } else {
            load_or_create_profile(path, "Moi").map_err(|e| e.to_string())?
        }
    };

    create_and_save_snapshot(
        path,
        &doc_id,
        &state_vector_base64,
        &yjs_snapshot_base64,
        &profile,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_doc_snapshots(
    vault_path: String,
    doc_id: String,
) -> Result<Vec<DocSnapshot>, String> {
    let path = Path::new(&vault_path);
    list_snapshots_for_doc(path, &doc_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn load_latest_doc_snapshot(
    vault_path: String,
    doc_id: String,
) -> Result<Option<DocSnapshot>, String> {
    let path = Path::new(&vault_path);
    load_latest_snapshot(path, &doc_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn send_p2p_sync_step1(
    state: tauri::State<'_, AppState>,
    doc_id: String,
    state_vector_base64: String,
) -> Result<(), String> {
    let lock = state.network_node.read().await;
    if let Some(node) = lock.as_ref() {
        let bytes = base64::engine::general_purpose::STANDARD
            .decode(&state_vector_base64)
            .map_err(|e| format!("Base64 invalide: {}", e))?;
        node.send_sync_step1(&doc_id, &bytes).await;
    }
    Ok(())
}

#[tauri::command]
pub async fn send_p2p_sync_step2(
    state: tauri::State<'_, AppState>,
    peer_id: String,
    doc_id: String,
    update_base64: String,
) -> Result<(), String> {
    let lock = state.network_node.read().await;
    if let Some(node) = lock.as_ref() {
        let bytes = base64::engine::general_purpose::STANDARD
            .decode(&update_base64)
            .map_err(|e| format!("Base64 invalide: {}", e))?;
        node.send_sync_step2(&peer_id, &doc_id, &bytes).await;
    }
    Ok(())
}

#[tauri::command]
pub async fn load_avatar_base64(
    vault_path: String,
    hash: Option<String>,
) -> Result<Option<String>, String> {
    let p = Path::new(&vault_path);
    let avatar_file = if let Some(h) = hash {
        let png = p.join(".knit").join("cache").join("avatars").join(format!("{}.png", h));
        let jpg = p.join(".knit").join("cache").join("avatars").join(format!("{}.jpg", h));
        if png.exists() {
            png
        } else if jpg.exists() {
            jpg
        } else {
            return Ok(None);
        }
    } else {
        let png = p.join(".knit").join("identity").join("avatar.png");
        let jpg = p.join(".knit").join("identity").join("avatar.jpg");
        if png.exists() {
            png
        } else if jpg.exists() {
            jpg
        } else {
            return Ok(None);
        }
    };

    let bytes = std::fs::read(&avatar_file).map_err(|e| e.to_string())?;
    let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
    let mime = if avatar_file.extension().and_then(|e| e.to_str()) == Some("jpg") {
        "image/jpeg"
    } else {
        "image/png"
    };
    Ok(Some(format!("data:{};base64,{}", mime, b64)))
}

#[tauri::command]
pub async fn search_vault(vault_path: String, query: String) -> Result<Vec<FileSearchResult>, String> {
    let p = Path::new(&vault_path);
    core_search_vault(p, &query).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_vault_tasks(vault_path: String) -> Result<Vec<TaskCard>, String> {
    let p = Path::new(&vault_path);
    core_collect_tasks(p).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_task_status(
    state: tauri::State<'_, AppState>,
    vault_path: String,
    rel_path: String,
    new_status: String,
) -> Result<(), String> {
    let p = Path::new(&vault_path);
    core_update_task_status(p, &rel_path, &new_status, &state.guard).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_vault_tags(vault_path: String) -> Result<Vec<TagInfo>, String> {
    let p = Path::new(&vault_path);
    core_collect_tags(p).map_err(|e| e.to_string())
}



