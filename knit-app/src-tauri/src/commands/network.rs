use crate::commands::{ipc, AppState};
use base64::Engine;
use knit_core::network::{ConnectedPeerInfo, KnitNetworkNode, RemoteNetworkEvent};
use knit_core::vault::identity::{
    configure_vault_git_author, load_or_create_profile, reset_custom_avatar, save_custom_avatar,
    save_profile, AvatarInfo, PeerIdentity, UserProfile,
};
use knit_core::vault::snapshot::{
    create_and_save_snapshot, list_snapshots_for_doc, load_latest_snapshot, DocSnapshot,
};
use std::path::Path;
use tauri::Emitter;

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

    let node = ipc(KnitNetworkNode::start(
        path,
        &display_name,
        vault_name.as_deref(),
        guard,
        true,
    )
    .await)?;

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
        ipc(node.get_invitation_code())
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
        ipc(node.connect_by_ticket(&invitation_code).await)
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
        ipc(node.sync_asset_from_peers(&rel_path, &blake3_hash).await)
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
        ipc(load_or_create_profile(path, "Moi"))
    }
}

#[tauri::command]
pub async fn save_user_profile(
    state: tauri::State<'_, AppState>,
    vault_path: String,
    profile: UserProfile,
) -> Result<(), String> {
    let path = Path::new(&vault_path);
    ipc(save_profile(path, &profile))?;

    let lock = state.network_node.read().await;
    if let Some(node) = lock.as_ref() {
        ipc(node.update_local_profile(profile).await)?;
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

    let avatar = ipc(save_custom_avatar(path, &bytes, &mime_type))?;

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
    let avatar = ipc(reset_custom_avatar(path))?;

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
    ipc(configure_vault_git_author(path, &name, &email))
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
            ipc(load_or_create_profile(path, "Moi"))?
        }
    };

    ipc(create_and_save_snapshot(
        path,
        &doc_id,
        &state_vector_base64,
        &yjs_snapshot_base64,
        &profile,
    ))
}

#[tauri::command]
pub async fn list_doc_snapshots(
    vault_path: String,
    doc_id: String,
) -> Result<Vec<DocSnapshot>, String> {
    let path = Path::new(&vault_path);
    ipc(list_snapshots_for_doc(path, &doc_id))
}

#[tauri::command]
pub async fn load_latest_doc_snapshot(
    vault_path: String,
    doc_id: String,
) -> Result<Option<DocSnapshot>, String> {
    let path = Path::new(&vault_path);
    ipc(load_latest_snapshot(path, &doc_id))
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
