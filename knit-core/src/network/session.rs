use crate::error::{KnitError, Result};
use crate::network::blobs::{
    handle_blob_request, read_blob_frame, write_blob_frame, BlobMessage,
};
use crate::network::node::{ConnectedPeerInfo, KnitNetworkNode, PeerSession, RemoteNetworkEvent};
use crate::network::protocol::{
    read_sync_frame, require_protocol_version, write_sync_frame, KnitSyncMessage, ALPN_BLOBS,
    ALPN_SYNC, PROTOCOL_VERSION,
};
use crate::network::manifest::{build_manifest, read_syncable_file};
use crate::vault::identity::PeerIdentity;
use crate::vault::share::vault_link_decision;
use iroh::endpoint::{Connection, RecvStream, SendStream};
use iroh::{EndpointAddr, PublicKey};
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::sync::{mpsc, Mutex};

impl KnitNetworkNode {
    /// Boucle d'acceptation QUIC
    pub(crate) async fn accept_loop(self: Arc<Self>) {
        while *self.is_running.read().await {
            let incoming = match self.endpoint.accept().await {
                Some(inc) => inc,
                None => break,
            };

            let node = self.clone();
            tokio::spawn(async move {
                let conn = match incoming.await {
                    Ok(c) => c,
                    Err(_) => return,
                };

                let remote_id = conn.remote_id();
                let alpn = conn.alpn().to_vec();

                if alpn == ALPN_SYNC {
                    // Accepter le stream bi pour la synchronisation
                    if let Ok((send, recv)) = conn.accept_bi().await {
                        let _ = node
                            .setup_peer_session(remote_id, conn, send, recv, false, None)
                            .await;
                    }
                } else if alpn == ALPN_BLOBS {
                    // Gérer les requêtes de médias entrantes
                    if let Ok((mut send, mut recv)) = conn.accept_bi().await {
                        if let Ok(BlobMessage::RequestBlob { blake3_hash, rel_path }) =
                            read_blob_frame(&mut recv).await
                        {
                            let response =
                                handle_blob_request(&node.vault_root, &rel_path, &blake3_hash);
                            let _ = write_blob_frame(&mut send, &response).await;
                            let _ = send.finish();
                            let _ = conn.closed().await;
                        }
                    }
                }
            });
        }
    }

    /// Initialise la session du pair, exécute le handshake et démarre la lecture/écriture
    pub(crate) async fn setup_peer_session(
        self: &Arc<Self>,
        remote_id: PublicKey,
        conn: Connection,
        mut send_stream: SendStream,
        mut recv_stream: RecvStream,
        is_initiator: bool,
        initial_addr: Option<EndpointAddr>,
    ) -> Result<ConnectedPeerInfo> {
        let (send_tx, mut send_rx) = mpsc::channel::<KnitSyncMessage>(256);

        let my_profile = self.profile.read().await.clone();
        let my_summary = crate::vault::identity::PeerProfileSummary::from_profile(&my_profile);
        let my_addr = self.endpoint.addr();
        let local_identity = self.peer_identity();
        let local_name = if my_profile.display_name.trim().is_empty() {
            local_identity.display_name.clone()
        } else {
            my_profile.display_name.clone()
        };
        let local_vault_name = self.current_vault_name();
        let local_vault_id = self.current_vault_id();

        let (display_name, vault_name, peer_profile, received_addr, remote_vault_id) = if is_initiator {
            let handshake = KnitSyncMessage::Handshake {
                peer_id: local_identity.peer_id.clone(),
                display_name: local_name.clone(),
                vault_name: local_vault_name.clone(),
                version: PROTOCOL_VERSION.to_string(),
                profile: Some(my_summary.clone()),
                endpoint_addr: Some(my_addr.clone()),
                vault_id: local_vault_id.clone(),
            };
            write_sync_frame(&mut send_stream, &handshake).await?;

            match read_sync_frame(&mut recv_stream).await? {
                KnitSyncMessage::HandshakeAck {
                    peer_id: _,
                    display_name,
                    vault_name,
                    profile,
                    endpoint_addr,
                    vault_id,
                } => (display_name, vault_name, profile, endpoint_addr, vault_id),
                other => {
                    return Err(KnitError::Network(format!(
                        "Attendu HandshakeAck mais reçu: {:?}",
                        other
                    )))
                }
            }
        } else {
            let (peer_name, peer_vault, profile, endpoint_addr, vault_id) = match read_sync_frame(&mut recv_stream).await? {
                KnitSyncMessage::Handshake {
                    peer_id: _,
                    display_name,
                    vault_name,
                    version,
                    profile,
                    endpoint_addr,
                    vault_id,
                } => {
                    require_protocol_version(&version)?;
                    (display_name, vault_name, profile, endpoint_addr, vault_id)
                }
                other => {
                    return Err(KnitError::Network(format!(
                        "Attendu Handshake mais reçu: {:?}",
                        other
                    )))
                }
            };

            let ack = KnitSyncMessage::HandshakeAck {
                peer_id: local_identity.peer_id.clone(),
                display_name: local_name.clone(),
                vault_name: local_vault_name.clone(),
                profile: Some(my_summary),
                endpoint_addr: Some(my_addr),
                vault_id: local_vault_id.clone(),
            };
            write_sync_frame(&mut send_stream, &ack).await?;

            (peer_name, peer_vault, profile, endpoint_addr, vault_id)
        };

        vault_link_decision(local_vault_id.as_deref(), remote_vault_id.as_deref())?;

        let announced_name = peer_profile
            .as_ref()
            .map(|p| p.display_name.trim().to_string())
            .filter(|name| !name.is_empty())
            .unwrap_or(display_name);
        let (first_name, last_name, email, role, status_message, avatar) = if let Some(p) = peer_profile {
            (
                Some(p.first_name),
                Some(p.last_name),
                p.email,
                Some(p.role),
                Some(p.status_message),
                Some(p.avatar),
            )
        } else {
            (None, None, None, None, None, None)
        };

        let remote_peer_id = remote_id.to_string();
        let peer_identity = PeerIdentity::from_public_key(&remote_id, &announced_name);

        let now_sec = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        let peer_info = ConnectedPeerInfo {
            peer_id: remote_peer_id.clone(),
            display_name: peer_identity.display_name,
            vault_name,
            color_index: peer_identity.color_index,
            color_hex: peer_identity.color_hex,
            initials: peer_identity.initials,
            latency_ms: None,
            connected_at_sec: now_sec,
            first_name,
            last_name,
            email,
            role,
            status_message,
            avatar: avatar.clone(),
        };

        let last_ping_sent = Arc::new(Mutex::new(None));

        let effective_addr = initial_addr.or(received_addr);

        let session = PeerSession {
            info: peer_info.clone(),
            endpoint_addr: effective_addr,
            send_tx,
            last_ping_sent: last_ping_sent.clone(),
        };

        {
            let mut lock = self.active_peers.write().await;
            lock.insert(remote_id, session);
        }

        let _ = self
            .events_tx
            .send(RemoteNetworkEvent::PeerConnected(peer_info.clone()));

        // Si le pair distant possède un avatar personnalisé, tenter de le rapatrier via Iroh Blobs
        if let Some(av) = &avatar {
            if av.avatar_type == "custom" {
                if let Some(hash) = &av.blake3_hash {
                    let cache_file = self
                        .vault_root
                        .join(".knit")
                        .join("cache")
                        .join("avatars")
                        .join(format!("{}.png", hash));
                    if !cache_file.exists() {
                        let node_clone = self.clone();
                        let h = hash.clone();
                        tokio::spawn(async move {
                            let _ = node_clone
                                .sync_asset_from_peers(&format!(".knit/cache/avatars/{}.png", h), &h)
                                .await;
                        });
                    }
                }
            }
        }

        // Tâche d'écriture sur le stream QUIC
        tokio::spawn(async move {
            while let Some(msg) = send_rx.recv().await {
                if write_sync_frame(&mut send_stream, &msg).await.is_err() {
                    break;
                }
            }
        });

        // Tâche de lecture depuis le stream QUIC
        let node = self.clone();
        let read_peer_id = remote_peer_id.clone();
        tokio::spawn(async move {
            while let Ok(msg) = read_sync_frame(&mut recv_stream).await {
                match msg {
                    KnitSyncMessage::SyncStep1 { doc_id, state_vector } => {
                        let _ = node.events_tx.send(RemoteNetworkEvent::SyncRequestReceived {
                            doc_id,
                            state_vector,
                            from_peer: read_peer_id.clone(),
                        });
                    }
                    KnitSyncMessage::SyncStep2 { doc_id, update } => {
                        let _ = node.events_tx.send(RemoteNetworkEvent::SyncResponseReceived {
                            doc_id: doc_id.clone(),
                            update: update.clone(),
                            from_peer: read_peer_id.clone(),
                        });
                        let _ = node.events_tx.send(RemoteNetworkEvent::YjsUpdate {
                            doc_id,
                            update,
                            from_peer: read_peer_id.clone(),
                        });
                    }
                    KnitSyncMessage::ProfileUpdate { profile } => {
                        {
                            let mut peers_lock = node.active_peers.write().await;
                            if let Some(sess) = peers_lock.get_mut(&remote_id) {
                                sess.info.display_name = profile.display_name.clone();
                                sess.info.first_name = Some(profile.first_name.clone());
                                sess.info.last_name = Some(profile.last_name.clone());
                                sess.info.email = profile.email.clone();
                                sess.info.role = Some(profile.role.clone());
                                sess.info.status_message = Some(profile.status_message.clone());
                                sess.info.avatar = Some(profile.avatar.clone());
                            }
                        }
                        let _ = node.events_tx.send(RemoteNetworkEvent::ProfileUpdated {
                            from_peer: read_peer_id.clone(),
                            profile,
                        });
                    }
                    KnitSyncMessage::YjsUpdate { doc_id, update } => {
                        let _ = node.events_tx.send(RemoteNetworkEvent::YjsUpdate {
                            doc_id,
                            update,
                            from_peer: read_peer_id.clone(),
                        });
                    }
                    KnitSyncMessage::YjsAwareness { doc_id, awareness } => {
                        let _ = node.events_tx.send(RemoteNetworkEvent::YjsAwareness {
                            doc_id,
                            awareness,
                            from_peer: read_peer_id.clone(),
                        });
                    }
                    KnitSyncMessage::Ping { timestamp_ms } => {
                        // Répondre avec un Pong
                        let lock = node.active_peers.read().await;
                        if let Some(sess) = lock.get(&remote_id) {
                            let _ = sess.send_tx.send(KnitSyncMessage::Pong { timestamp_ms }).await;
                        }
                    }
                    KnitSyncMessage::VaultManifestRequest => {
                        if let Ok(entries) = build_manifest(&node.vault_root) {
                            let lock = node.active_peers.read().await;
                            if let Some(sess) = lock.get(&remote_id) {
                                let _ = sess
                                    .send_tx
                                    .send(KnitSyncMessage::VaultManifest { entries })
                                    .await;
                            }
                        }
                    }
                    KnitSyncMessage::VaultManifest { entries } => {
                        if let Some(tx) = node
                            .manifest_slot
                            .lock()
                            .unwrap_or_else(|e| e.into_inner())
                            .take()
                        {
                            let _ = tx.send(entries);
                        }
                    }
                    KnitSyncMessage::VaultFileRequest { rel_path } => {
                        if let Ok(content) = read_syncable_file(&node.vault_root, &rel_path) {
                            let lock = node.active_peers.read().await;
                            if let Some(sess) = lock.get(&remote_id) {
                                let _ = sess
                                    .send_tx
                                    .send(KnitSyncMessage::VaultFile { rel_path, content })
                                    .await;
                            }
                        }
                    }
                    KnitSyncMessage::VaultFile { rel_path, content } => {
                        if let Some((expected, tx)) = node
                            .file_slot
                            .lock()
                            .unwrap_or_else(|e| e.into_inner())
                            .take()
                        {
                            if expected == rel_path {
                                let _ = tx.send(content);
                            }
                        }
                    }
                    KnitSyncMessage::Pong { timestamp_ms: _ } => {
                        let mut ping_lock = last_ping_sent.lock().await;
                        if let Some(sent_time) = *ping_lock {
                            let elapsed = sent_time.elapsed().as_millis() as u64;
                            *ping_lock = None;

                            let mut peers_lock = node.active_peers.write().await;
                            if let Some(sess) = peers_lock.get_mut(&remote_id) {
                                sess.info.latency_ms = Some(elapsed);
                            }
                        }
                    }
                    _ => {}
                }
            }

            // Déconnexion détectée
            {
                let mut lock = node.active_peers.write().await;
                lock.remove(&remote_id);
            }
            let _ = node
                .events_tx
                .send(RemoteNetworkEvent::PeerDisconnected(read_peer_id));
        });

        // Détection de fermeture de connexion sous-jacente
        let node_close = self.clone();
        let close_peer_id = remote_peer_id.clone();
        tokio::spawn(async move {
            let _ = conn.closed().await;
            {
                let mut lock = node_close.active_peers.write().await;
                lock.remove(&remote_id);
            }
            let _ = node_close
                .events_tx
                .send(RemoteNetworkEvent::PeerDisconnected(close_peer_id));
        });

        Ok(peer_info)
    }

}
