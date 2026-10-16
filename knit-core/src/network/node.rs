use crate::error::{KnitError, Result};
use crate::network::blobs::{
    handle_blob_request, read_blob_frame, store_verified_blob, write_blob_frame, BlobMessage,
};
use crate::network::invitation::{create_invitation, InvitationTicket};
use crate::network::mdns::{DiscoveredLanPeer, MdnsService};
use crate::network::protocol::{
    read_sync_frame, write_sync_frame, KnitSyncMessage, ALPN_BLOBS, ALPN_SYNC,
};
use crate::vault::identity::{load_or_generate_identity, PeerIdentity};
use crate::watcher::guard::WriteGuard;
use iroh::endpoint::{Connection, RecvStream, SendStream};
use iroh::{Endpoint, EndpointAddr, PublicKey, SecretKey};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use tokio::sync::{broadcast, mpsc, Mutex, RwLock};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectedPeerInfo {
    pub peer_id: String,
    pub display_name: String,
    pub vault_name: Option<String>,
    pub color_index: usize,
    pub color_hex: String,
    pub initials: String,
    pub latency_ms: Option<u64>,
    pub connected_at_sec: u64,
}

#[derive(Debug, Clone)]
pub enum RemoteNetworkEvent {
    PeerConnected(ConnectedPeerInfo),
    PeerDisconnected(String),
    YjsUpdate {
        doc_id: String,
        update: Vec<u8>,
        from_peer: String,
    },
    YjsAwareness {
        doc_id: String,
        awareness: Vec<u8>,
        from_peer: String,
    },
    AssetReceived {
        rel_path: String,
        from_peer: String,
    },
    LanPeerDiscovered(DiscoveredLanPeer),
}

struct PeerSession {
    info: ConnectedPeerInfo,
    send_tx: mpsc::Sender<KnitSyncMessage>,
    last_ping_sent: Arc<Mutex<Option<Instant>>>,
}

pub struct KnitNetworkNode {
    pub endpoint: Endpoint,
    pub vault_root: PathBuf,
    pub identity: PeerIdentity,
    pub secret_key: SecretKey,
    pub vault_name: Option<String>,
    pub guard: WriteGuard,
    active_peers: Arc<RwLock<HashMap<PublicKey, PeerSession>>>,
    events_tx: broadcast::Sender<RemoteNetworkEvent>,
    mdns: Arc<Mutex<Option<MdnsService>>>,
    is_running: Arc<RwLock<bool>>,
}

impl KnitNetworkNode {
    /// Initialise et démarre le nœud P2P Iroh pour un coffre-fort donné
    pub async fn start(
        vault_root: &Path,
        display_name: &str,
        vault_name: Option<&str>,
        guard: WriteGuard,
        enable_mdns: bool,
    ) -> Result<Arc<Self>> {
        let secret_key = load_or_generate_identity(vault_root)?;
        let pubkey = secret_key.public();
        let identity = PeerIdentity::from_public_key(&pubkey, display_name);

        // Liaison de l'endpoint Iroh avec les protocoles ALPN de synchronisation et de médias
        let endpoint = Endpoint::builder(iroh::endpoint::presets::N0)
            .secret_key(secret_key.clone())
            .alpns(vec![ALPN_SYNC.to_vec(), ALPN_BLOBS.to_vec()])
            .bind()
            .await
            .map_err(|e| KnitError::Network(format!("Erreur de liaison de l'endpoint Iroh: {}", e)))?;

        let (events_tx, _) = broadcast::channel(512);

        let node = Arc::new(Self {
            endpoint: endpoint.clone(),
            vault_root: vault_root.to_path_buf(),
            identity: identity.clone(),
            secret_key,
            vault_name: vault_name.map(|s| s.to_string()),
            guard,
            active_peers: Arc::new(RwLock::new(HashMap::new())),
            events_tx,
            mdns: Arc::new(Mutex::new(None)),
            is_running: Arc::new(RwLock::new(true)),
        });

        // 1. Démarrer la boucle d'acceptation QUIC entrante
        let accept_node = node.clone();
        tokio::spawn(async move {
            accept_node.accept_loop().await;
        });

        // 2. Démarrer la boucle de Heartbeat Ping/Pong
        let ping_node = node.clone();
        tokio::spawn(async move {
            ping_node.heartbeat_loop().await;
        });

        // 3. Activer mDNS pour la découverte LAN si demandé
        if enable_mdns {
            let invitation_code = create_invitation(&endpoint, vault_name).ok();
            let my_peer_id = pubkey.to_string();
            let port = endpoint.addr().ip_addrs().next().map(|ip| ip.port()).unwrap_or(0);

            if let Ok(mdns_svc) = MdnsService::new(my_peer_id) {
                let _ = mdns_svc.register(
                    display_name,
                    vault_name,
                    port,
                    invitation_code.as_deref(),
                );
                let _ = mdns_svc.start_browsing();

                let mut lan_rx = mdns_svc.subscribe();
                let events_tx_clone = node.events_tx.clone();

                tokio::spawn(async move {
                    while let Ok(peer) = lan_rx.recv().await {
                        let _ = events_tx_clone.send(RemoteNetworkEvent::LanPeerDiscovered(peer));
                    }
                });

                let mut lock = node.mdns.lock().await;
                *lock = Some(mdns_svc);
            }
        }

        Ok(node)
    }

    /// S'abonne aux événements réseau globaux
    pub fn subscribe_events(&self) -> broadcast::Receiver<RemoteNetworkEvent> {
        self.events_tx.subscribe()
    }

    /// Génère un ticket d'invitation WAN `knit://join/...`
    pub fn get_invitation_code(&self) -> Result<String> {
        create_invitation(&self.endpoint, self.vault_name.as_deref())
    }

    /// Retourne la liste des pairs connectés en temps réel
    pub async fn get_connected_peers(&self) -> Vec<ConnectedPeerInfo> {
        let lock = self.active_peers.read().await;
        lock.values().map(|p| p.info.clone()).collect()
    }

    /// Connexion manuelle à un pair à partir d'un ticket `knit://join/...`
    pub async fn connect_by_ticket(self: &Arc<Self>, ticket_str: &str) -> Result<ConnectedPeerInfo> {
        let ticket = InvitationTicket::from_code(ticket_str)?;
        let remote_pubkey = ticket.endpoint_addr.id;

        if remote_pubkey == self.endpoint.id() {
            return Err(KnitError::Network(
                "Impossible de se connecter à soi-même".to_string(),
            ));
        }

        // Vérifier si déjà connecté
        {
            let lock = self.active_peers.read().await;
            if let Some(session) = lock.get(&remote_pubkey) {
                return Ok(session.info.clone());
            }
        }

        let conn = self
            .endpoint
            .connect(ticket.endpoint_addr, ALPN_SYNC)
            .await
            .map_err(|e| {
                KnitError::Network(format!(
                    "Échec de connexion QUIC au pair {}: {}",
                    remote_pubkey, e
                ))
            })?;

        let (send_stream, recv_stream) = conn.open_bi().await.map_err(|e| {
            KnitError::Network(format!(
                "Échec d'ouverture de flux bi-directionnel avec {}: {}",
                remote_pubkey, e
            ))
        })?;

        self.setup_peer_session(remote_pubkey, conn, send_stream, recv_stream, true)
            .await
    }

    /// Diffuse une mise à jour Yjs CRDT à l'ensemble des pairs connectés
    pub async fn broadcast_yjs_update(&self, doc_id: &str, update: &[u8]) {
        let msg = KnitSyncMessage::YjsUpdate {
            doc_id: doc_id.to_string(),
            update: update.to_vec(),
        };

        let lock = self.active_peers.read().await;
        for session in lock.values() {
            let _ = session.send_tx.send(msg.clone()).await;
        }
    }

    /// Diffuse la présence / curseur collaboratif (Yjs Awareness) à l'ensemble des pairs
    pub async fn broadcast_awareness(&self, doc_id: &str, awareness: &[u8]) {
        let msg = KnitSyncMessage::YjsAwareness {
            doc_id: doc_id.to_string(),
            awareness: awareness.to_vec(),
        };

        let lock = self.active_peers.read().await;
        for session in lock.values() {
            let _ = session.send_tx.send(msg.clone()).await;
        }
    }

    /// Récupère un média manquant dans `assets/` auprès des pairs connectés via Iroh Blobs
    pub async fn sync_asset_from_peers(&self, rel_path: &str, blake3_hash: &str) -> Result<bool> {
        let peers: Vec<PublicKey> = {
            let lock = self.active_peers.read().await;
            lock.keys().cloned().collect()
        };

        for peer_key in peers {
            let conn_res = self
                .endpoint
                .connect(EndpointAddr::new(peer_key), ALPN_BLOBS)
                .await;

            let conn: Connection = match conn_res {
                Ok(c) => c,
                Err(_) => continue,
            };

            let (mut send, mut recv) = match conn.open_bi().await {
                Ok(streams) => streams,
                Err(_) => continue,
            };

            let req = BlobMessage::RequestBlob {
                blake3_hash: blake3_hash.to_string(),
                rel_path: rel_path.to_string(),
            };

            if write_blob_frame(&mut send, &req).await.is_err() {
                continue;
            }

            match read_blob_frame(&mut recv).await {
                Ok(BlobMessage::ResponseBlob {
                    blake3_hash: received_hash,
                    rel_path: target_rel,
                    data,
                }) => {
                    if received_hash == blake3_hash {
                        store_verified_blob(
                            &self.vault_root,
                            &target_rel,
                            &received_hash,
                            &data,
                            Some(&self.guard),
                        )?;

                        let _ = self.events_tx.send(RemoteNetworkEvent::AssetReceived {
                            rel_path: target_rel,
                            from_peer: peer_key.to_string(),
                        });

                        return Ok(true);
                    }
                }
                _ => continue,
            }
        }

        Ok(false)
    }

    /// Boucle d'acceptation QUIC
    async fn accept_loop(self: Arc<Self>) {
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
                            .setup_peer_session(remote_id, conn, send, recv, false)
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
                        }
                    }
                }
            });
        }
    }

    /// Initialise la session du pair, exécute le handshake et démarre la lecture/écriture
    async fn setup_peer_session(
        self: &Arc<Self>,
        remote_id: PublicKey,
        conn: Connection,
        mut send_stream: SendStream,
        mut recv_stream: RecvStream,
        is_initiator: bool,
    ) -> Result<ConnectedPeerInfo> {
        let (send_tx, mut send_rx) = mpsc::channel::<KnitSyncMessage>(256);

        // Handshake
        let (display_name, vault_name) = if is_initiator {
            // Envoyer Handshake
            let handshake = KnitSyncMessage::Handshake {
                peer_id: self.identity.peer_id.clone(),
                display_name: self.identity.display_name.clone(),
                vault_name: self.vault_name.clone(),
                version: "0.2.0".to_string(),
            };
            write_sync_frame(&mut send_stream, &handshake).await?;

            // Attendre HandshakeAck
            match read_sync_frame(&mut recv_stream).await? {
                KnitSyncMessage::HandshakeAck {
                    peer_id: _,
                    display_name,
                    vault_name,
                } => (display_name, vault_name),
                other => {
                    return Err(KnitError::Network(format!(
                        "Attendu HandshakeAck mais reçu: {:?}",
                        other
                    )))
                }
            }
        } else {
            // Attendre Handshake
            let (peer_name, peer_vault) = match read_sync_frame(&mut recv_stream).await? {
                KnitSyncMessage::Handshake {
                    peer_id: _,
                    display_name,
                    vault_name,
                    version: _,
                } => (display_name, vault_name),
                other => {
                    return Err(KnitError::Network(format!(
                        "Attendu Handshake mais reçu: {:?}",
                        other
                    )))
                }
            };

            // Répondre avec HandshakeAck
            let ack = KnitSyncMessage::HandshakeAck {
                peer_id: self.identity.peer_id.clone(),
                display_name: self.identity.display_name.clone(),
                vault_name: self.vault_name.clone(),
            };
            write_sync_frame(&mut send_stream, &ack).await?;

            (peer_name, peer_vault)
        };

        let remote_peer_id = remote_id.to_string();
        let peer_identity = PeerIdentity::from_public_key(&remote_id, &display_name);

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
        };

        let last_ping_sent = Arc::new(Mutex::new(None));

        let session = PeerSession {
            info: peer_info.clone(),
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

    /// Boucle de Heartbeat (Ping toutes les 15 secondes)
    async fn heartbeat_loop(self: Arc<Self>) {
        let mut interval = tokio::time::interval(Duration::from_secs(15));
        while *self.is_running.read().await {
            interval.tick().await;

            let peers = {
                let lock = self.active_peers.read().await;
                lock.keys().cloned().collect::<Vec<_>>()
            };

            let now_ms = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64;

            for peer in peers {
                let lock = self.active_peers.read().await;
                if let Some(session) = lock.get(&peer) {
                    {
                        let mut ping_lock = session.last_ping_sent.lock().await;
                        *ping_lock = Some(Instant::now());
                    }
                    let _ = session
                        .send_tx
                        .send(KnitSyncMessage::Ping { timestamp_ms: now_ms })
                        .await;
                }
            }
        }
    }

    /// Arrête proprement le nœud réseau
    pub async fn stop(&self) {
        {
            let mut running = self.is_running.write().await;
            *running = false;
        }

        let mut lock = self.mdns.lock().await;
        if let Some(mdns) = lock.take() {
            let _ = mdns.unregister();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[tokio::test]
    async fn test_two_nodes_p2p_collaboration() {
        let dir1 = tempdir().expect("tempdir 1");
        let dir2 = tempdir().expect("tempdir 2");

        let guard1 = WriteGuard::new();
        let guard2 = WriteGuard::new();

        // Démarrer Node 1 (Thomas)
        let node1 = KnitNetworkNode::start(
            dir1.path(),
            "Thomas",
            Some("Vault Alpha"),
            guard1,
            false,
        )
        .await
        .expect("start node 1");

        // Démarrer Node 2 (Alice)
        let node2 = KnitNetworkNode::start(
            dir2.path(),
            "Alice",
            Some("Vault Alpha"),
            guard2,
            false,
        )
        .await
        .expect("start node 2");

        let mut rx1 = node1.subscribe_events();
        let mut rx2 = node2.subscribe_events();

        // Node 1 génère son ticket d'invitation
        let ticket = node1.get_invitation_code().expect("get invitation");

        // Node 2 se connecte à Node 1 via le ticket
        let connected_info = node2.connect_by_ticket(&ticket).await.expect("connect by ticket");
        assert_eq!(connected_info.display_name, "Thomas");

        // Vérifier l'événement de connexion reçu par Node 1
        let ev1 = rx1.recv().await.expect("receive peer connected on node 1");
        match ev1 {
            RemoteNetworkEvent::PeerConnected(info) => {
                assert_eq!(info.display_name, "Alice");
                assert_eq!(info.peer_id, node2.identity.peer_id);
            }
            other => panic!("Attendu PeerConnected mais reçu: {:?}", other),
        }

        let ev2_connect = rx2.recv().await.expect("receive peer connected on node 2");
        match ev2_connect {
            RemoteNetworkEvent::PeerConnected(info) => {
                assert_eq!(info.display_name, "Thomas");
                assert_eq!(info.peer_id, node1.identity.peer_id);
            }
            other => panic!("Attendu PeerConnected sur node 2 mais reçu: {:?}", other),
        }

        // Test de diffusion CRDT Yjs de Node 1 vers Node 2 (< 50ms sur LAN)
        let doc_id = "wiki/architecture.md";
        let test_update = vec![42, 99, 101, 102, 103];
        node1.broadcast_yjs_update(doc_id, &test_update).await;

        let ev2 = rx2.recv().await.expect("receive yjs update on node 2");
        match ev2 {
            RemoteNetworkEvent::YjsUpdate {
                doc_id: received_doc,
                update: received_update,
                from_peer,
            } => {
                assert_eq!(received_doc, doc_id);
                assert_eq!(received_update, test_update);
                assert_eq!(from_peer, node1.identity.peer_id);
            }
            other => panic!("Attendu YjsUpdate mais reçu: {:?}", other),
        }

        // Test de diffusion d'Awareness (curseur)
        let test_awareness = vec![1, 2, 3];
        node2.broadcast_awareness(doc_id, &test_awareness).await;

        let ev1_awareness = rx1.recv().await.expect("receive awareness on node 1");
        match ev1_awareness {
            RemoteNetworkEvent::YjsAwareness {
                doc_id: received_doc,
                awareness: received_awareness,
                from_peer,
            } => {
                assert_eq!(received_doc, doc_id);
                assert_eq!(received_awareness, test_awareness);
                assert_eq!(from_peer, node2.identity.peer_id);
            }
            other => panic!("Attendu YjsAwareness mais reçu: {:?}", other),
        }

        node1.stop().await;
        node2.stop().await;
    }
}
