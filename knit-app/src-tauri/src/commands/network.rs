use crate::commands::{ipc, AppState};
use base64::Engine;
use knit_core::network::{ConnectedPeerInfo, KnitNetworkNode, RemoteNetworkEvent};
use knit_core::network::ReplicationReport;
use knit_core::vault::crdt_state::{
    load_crdt_state as read_crdt_blob, store_crdt_state as write_crdt_blob,
};
use knit_core::vault::identity::{
    configure_vault_git_author, load_or_generate_identity_in, save_avatar_in,
    AvatarInfo, PeerIdentity, UserProfile, UNNAMED_DISPLAY_NAME,
};
use knit_core::vault::person::{peek_primary_profile, save_primary_profile};
use std::path::PathBuf;
use tauri::Manager;
use knit_core::vault::snapshot::{
    create_and_save_snapshot, list_snapshots_for_doc, load_latest_snapshot, DocSnapshot,
};
use std::path::Path;
use std::sync::Arc;
use tauri::Emitter;

const P2P_INACTIVE: &str = "Le réseau P2P n'est pas actif pour ce coffre";

fn profiles_root(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let base = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&base).map_err(|e| e.to_string())?;
    Ok(base.join("profiles"))
}

fn unnamed_profile() -> UserProfile {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    UserProfile {
        first_name: String::new(),
        last_name: String::new(),
        display_name: UNNAMED_DISPLAY_NAME.to_string(),
        email: String::new(),
        role: "Collaborateur".to_string(),
        status_message: "En rédaction".to_string(),
        share_email_p2p: false,
        avatar: AvatarInfo::default(),
        created_at_sec: now,
        updated_at_sec: now,
    }
}

fn decode_b64(label: &str, value: &str) -> Result<Vec<u8>, String> {
    base64::engine::general_purpose::STANDARD
        .decode(value)
        .map_err(|e| format!("Erreur décodage base64 {label}: {}", e))
}

async fn with_network_node<T, F, Fut>(
    state: &tauri::State<'_, AppState>,
    f: F,
) -> Result<T, String>
where
    F: FnOnce(Arc<KnitNetworkNode>) -> Fut,
    Fut: std::future::Future<Output = Result<T, String>>,
{
    let lock = state.network_node.read().await;
    let Some(node) = lock.as_ref().cloned() else {
        return Err(P2P_INACTIVE.to_string());
    };
    drop(lock);
    f(node).await
}

async fn with_network_node_opt<T, F, Fut>(
    state: &tauri::State<'_, AppState>,
    default: T,
    f: F,
) -> Result<T, String>
where
    F: FnOnce(Arc<KnitNetworkNode>) -> Fut,
    Fut: std::future::Future<Output = Result<T, String>>,
{
    let lock = state.network_node.read().await;
    let Some(node) = lock.as_ref().cloned() else {
        return Ok(default);
    };
    drop(lock);
    f(node).await
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

    let lan_only = knit_core::vault::load_vault_config(path).lan_only;
    let profiles = profiles_root(&app)?;
    let _ = vault_name;
    let node = ipc(KnitNetworkNode::start(
        path,
        &profiles,
        &display_name,
        guard,
        true,
        lan_only,
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
                RemoteNetworkEvent::ReplicationProgress { done, total, rel_path } => {
                    let _ = app_handle.emit(
                        "p2p_replication_progress",
                        serde_json::json!({ "done": done, "total": total, "rel_path": rel_path }),
                    );
                }
            }
        }
    });

    let identity = node.peer_identity();
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
    with_network_node(&state, |node| async move { ipc(node.get_invitation_code()) }).await
}

#[tauri::command]
pub async fn get_p2p_pin_code(state: tauri::State<'_, AppState>) -> Result<Option<String>, String> {
    with_network_node_opt(&state, None, |node| async move { Ok(node.get_pin_code().await) }).await
}

#[tauri::command]
pub async fn refresh_p2p_pin_code(state: tauri::State<'_, AppState>) -> Result<String, String> {
    with_network_node(&state, |node| async move { Ok(node.refresh_pin_code().await) }).await
}

#[tauri::command]
pub async fn connect_p2p_by_pin(
    state: tauri::State<'_, AppState>,
    pin: String,
) -> Result<ConnectedPeerInfo, String> {
    with_network_node(&state, |node| async move {
        let invitation = ipc(node.resolve_pin_to_invitation(&pin).await)?;
        ipc(node.connect_by_ticket(&invitation).await)
    })
    .await
}

#[tauri::command]
pub async fn connect_p2p_peer(
    state: tauri::State<'_, AppState>,
    invitation_code: String,
) -> Result<ConnectedPeerInfo, String> {
    with_network_node(&state, |node| async move {
        ipc(node.connect_by_ticket(&invitation_code).await)
    })
    .await
}

#[tauri::command]
pub async fn get_connected_peers(
    state: tauri::State<'_, AppState>,
) -> Result<Vec<ConnectedPeerInfo>, String> {
    with_network_node_opt(&state, Vec::new(), |node| async move {
        Ok(node.get_connected_peers().await)
    })
    .await
}

#[tauri::command]
pub async fn broadcast_yjs_update(
    state: tauri::State<'_, AppState>,
    doc_id: String,
    update_base64: String,
) -> Result<(), String> {
    let bytes = decode_b64("update", &update_base64)?;
    with_network_node_opt(&state, (), |node| async move {
        node.broadcast_yjs_update(&doc_id, &bytes).await;
        Ok(())
    })
    .await
}

#[tauri::command]
pub async fn broadcast_awareness(
    state: tauri::State<'_, AppState>,
    doc_id: String,
    awareness_base64: String,
) -> Result<(), String> {
    let bytes = decode_b64("awareness", &awareness_base64)?;
    with_network_node_opt(&state, (), |node| async move {
        node.broadcast_awareness(&doc_id, &bytes).await;
        Ok(())
    })
    .await
}

#[tauri::command]
pub async fn sync_asset_from_peers(
    state: tauri::State<'_, AppState>,
    rel_path: String,
    blake3_hash: String,
) -> Result<bool, String> {
    with_network_node_opt(&state, false, |node| async move {
        ipc(node.sync_asset_from_peers(&rel_path, &blake3_hash).await)
    })
    .await
}

#[tauri::command]
pub async fn get_local_peer_identity(
    state: tauri::State<'_, AppState>,
) -> Result<Option<PeerIdentity>, String> {
    let lock = state.network_node.read().await;
    Ok(lock.as_ref().map(|node| node.peer_identity()))
}

#[tauri::command]
pub async fn get_user_profile(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    vault_path: String,
) -> Result<UserProfile, String> {
    let _ = vault_path;
    let lock = state.network_node.read().await;
    if let Some(node) = lock.as_ref() {
        return Ok(node.get_local_profile().await);
    }
    drop(lock);
    let profiles = profiles_root(&app)?;
    Ok(ipc(peek_primary_profile(&profiles))?.unwrap_or_else(unnamed_profile))
}

#[tauri::command]
pub async fn save_user_profile(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    vault_path: String,
    profile: UserProfile,
) -> Result<(), String> {
    let path = Path::new(&vault_path);
    let lock = state.network_node.read().await;
    if let Some(node) = lock.as_ref() {
        ipc(node.update_local_profile(profile).await)?;
        return Ok(());
    }
    drop(lock);
    let profiles = profiles_root(&app)?;
    ipc(save_primary_profile(&profiles, &profile))?;
    if !vault_path.is_empty() {
        let _ = configure_vault_git_author(path, &profile.display_name, &profile.email);
    }
    Ok(())
}

#[tauri::command]
pub async fn upload_user_avatar(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    vault_path: String,
    image_base64: String,
    mime_type: String,
) -> Result<AvatarInfo, String> {
    let path = Path::new(&vault_path);
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(&image_base64)
        .map_err(|e| format!("Base64 invalide: {}", e))?;

    let person_dir = {
        let lock = state.network_node.read().await;
        if let Some(node) = lock.as_ref() {
            node.person_dir.clone()
        } else {
            drop(lock);
            profiles_root(&app)?.join("primary")
        }
    };
    let avatar = ipc(save_avatar_in(&person_dir, path, &bytes, &mime_type))?;

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
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    vault_path: String,
) -> Result<AvatarInfo, String> {
    let person_dir = {
        let lock = state.network_node.read().await;
        if let Some(node) = lock.as_ref() {
            node.person_dir.clone()
        } else {
            profiles_root(&app)?.join("primary")
        }
    };
    let _ = vault_path;
    let avatar = ipc(knit_core::vault::identity::reset_avatar_in(&person_dir))?;

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
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    vault_path: String,
    doc_id: String,
    state_vector_base64: String,
    yjs_snapshot_base64: String,
) -> Result<DocSnapshot, String> {
    let path = Path::new(&vault_path);
    let (profile, secret) = {
        let lock = state.network_node.read().await;
        if let Some(node) = lock.as_ref() {
            (node.get_local_profile().await, node.secret_key.clone())
        } else {
            drop(lock);
            let profiles = profiles_root(&app)?;
            let profile = ipc(peek_primary_profile(&profiles))?.unwrap_or_else(unnamed_profile);
            let secret = ipc(load_or_generate_identity_in(&profiles.join("primary")))?;
            (profile, secret)
        }
    };

    ipc(create_and_save_snapshot(
        path,
        &doc_id,
        &state_vector_base64,
        &yjs_snapshot_base64,
        &profile,
        &secret,
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
    let bytes = decode_b64("state_vector", &state_vector_base64)?;
    with_network_node_opt(&state, (), |node| async move {
        node.send_sync_step1(&doc_id, &bytes).await;
        Ok(())
    })
    .await
}

#[tauri::command]
pub async fn send_p2p_sync_step2(
    state: tauri::State<'_, AppState>,
    peer_id: String,
    doc_id: String,
    update_base64: String,
) -> Result<(), String> {
    let bytes = decode_b64("update", &update_base64)?;
    with_network_node_opt(&state, (), |node| async move {
        node.send_sync_step2(&peer_id, &doc_id, &bytes).await;
        Ok(())
    })
    .await
}

#[tauri::command]
pub async fn load_avatar_base64(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
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
        let person_png = {
            let lock = state.network_node.read().await;
            if let Some(node) = lock.as_ref() {
                node.person_dir.join("avatar.png")
            } else {
                profiles_root(&app)?.join("primary").join("avatar.png")
            }
        };
        if person_png.exists() {
            person_png
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
pub async fn replicate_vault(state: tauri::State<'_, AppState>) -> Result<ReplicationReport, String> {
    let lock = state.network_node.read().await;
    let Some(node) = lock.as_ref().cloned() else {
        return Err(P2P_INACTIVE.to_string());
    };
    drop(lock);
    ipc(node.replicate_from_peers().await)
}

#[tauri::command]
pub async fn store_crdt_state(
    vault_path: String,
    doc_id: String,
    state_base64: String,
) -> Result<(), String> {
    let bytes = decode_b64("crdt", &state_base64)?;
    ipc(write_crdt_blob(Path::new(&vault_path), &doc_id, &bytes))
}

#[tauri::command]
pub async fn load_crdt_state_cmd(
    vault_path: String,
    doc_id: String,
) -> Result<Option<String>, String> {
    let bytes = ipc(read_crdt_blob(Path::new(&vault_path), &doc_id))?;
    Ok(bytes.map(|b| base64::engine::general_purpose::STANDARD.encode(b)))
}
