use crate::error::{KnitError, Result};
use crate::network::blobs::{
    read_blob_frame, store_verified_blob, write_blob_frame, BlobMessage,
};
use crate::network::invitation::{create_invitation, InvitationTicket};
use crate::network::mdns::{DiscoveredLanPeer, MdnsService};
use crate::network::protocol::{KnitSyncMessage, ALPN_BLOBS, ALPN_SYNC};
use crate::vault::identity::{
    load_or_create_profile, load_or_generate_identity, save_profile, AvatarInfo, PeerIdentity,
    PeerProfileSummary, UserProfile,
};
use crate::watcher::guard::WriteGuard;
use iroh::endpoint::Connection;
use iroh::{Endpoint, EndpointAddr, PublicKey, SecretKey};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Instant;
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
    #[serde(skip_serializing_if = "Option::is_none")]
    pub first_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub email: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub role: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status_message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub avatar: Option<AvatarInfo>,
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
    SyncRequestReceived {
        doc_id: String,
        state_vector: Vec<u8>,
        from_peer: String,
    },
    SyncResponseReceived {
        doc_id: String,
        update: Vec<u8>,
        from_peer: String,
    },
    ProfileUpdated {
        from_peer: String,
        profile: PeerProfileSummary,
    },
    AssetReceived {
        rel_path: String,
        from_peer: String,
    },
    LanPeerDiscovered(DiscoveredLanPeer),
}

pub(crate) struct PeerSession {
    pub(crate) info: ConnectedPeerInfo,
    pub(crate) endpoint_addr: Option<EndpointAddr>,
    pub(crate) send_tx: mpsc::Sender<KnitSyncMessage>,
    pub(crate) last_ping_sent: Arc<Mutex<Option<Instant>>>,
}

pub struct KnitNetworkNode {
    pub endpoint: Endpoint,
    pub vault_root: PathBuf,
    pub identity: PeerIdentity,
    pub profile: Arc<RwLock<UserProfile>>,
    pub secret_key: SecretKey,
    pub vault_name: Option<String>,
    pub guard: WriteGuard,
    /// Mode LAN strict : relays WAN Iroh désactivés (B-051).
    pub lan_only: bool,
    /// PIN LAN éphémère à 6 chiffres (B-017b).
    pub pin_code: Arc<RwLock<Option<String>>>,
    pub(crate) active_peers: Arc<RwLock<HashMap<PublicKey, PeerSession>>>,
    pub(crate) events_tx: broadcast::Sender<RemoteNetworkEvent>,
    pub(crate) mdns: Arc<Mutex<Option<MdnsService>>>,
    pub(crate) is_running: Arc<RwLock<bool>>,
    /// Cache des pairs LAN découverts (pour résolution PIN).
    pub(crate) lan_peers: Arc<RwLock<HashMap<String, DiscoveredLanPeer>>>,
}

impl KnitNetworkNode {
    /// Initialise et démarre le nœud P2P Iroh pour un coffre-fort donné.
    /// Si `lan_only` est vrai, les relays WAN N0 sont désactivés (preset `N0DisableRelay`).
    pub async fn start(
        vault_root: &Path,
        display_name: &str,
        vault_name: Option<&str>,
        guard: WriteGuard,
        enable_mdns: bool,
        lan_only: bool,
    ) -> Result<Arc<Self>> {
        let secret_key = load_or_generate_identity(vault_root)?;
        let pubkey = secret_key.public();
        let identity = PeerIdentity::from_public_key(&pubkey, display_name);
        let profile = load_or_create_profile(vault_root, display_name)?;

        // Liaison de l'endpoint Iroh : relays N0 ou mode air-gap LAN
        let builder = if lan_only {
            Endpoint::builder(iroh::endpoint::presets::N0DisableRelay)
        } else {
            Endpoint::builder(iroh::endpoint::presets::N0)
        };
        let endpoint = builder
            .secret_key(secret_key.clone())
            .alpns(vec![ALPN_SYNC.to_vec(), ALPN_BLOBS.to_vec()])
            .bind()
            .await
            .map_err(|e| KnitError::Network(format!("Erreur de liaison de l'endpoint Iroh: {}", e)))?;

        let (events_tx, _) = broadcast::channel(512);
        let pin_code = generate_lan_pin();

        let node = Arc::new(Self {
            endpoint: endpoint.clone(),
            vault_root: vault_root.to_path_buf(),
            identity: identity.clone(),
            profile: Arc::new(RwLock::new(profile)),
            secret_key,
            vault_name: vault_name.map(|s| s.to_string()),
            guard,
            lan_only,
            pin_code: Arc::new(RwLock::new(Some(pin_code.clone()))),
            active_peers: Arc::new(RwLock::new(HashMap::new())),
            events_tx,
            mdns: Arc::new(Mutex::new(None)),
            is_running: Arc::new(RwLock::new(true)),
            lan_peers: Arc::new(RwLock::new(HashMap::new())),
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
                    Some(pin_code.as_str()),
                );
                let _ = mdns_svc.start_browsing();

                let mut lan_rx = mdns_svc.subscribe();
                let events_tx_clone = node.events_tx.clone();
                let lan_peers_cache = node.lan_peers.clone();

                tokio::spawn(async move {
                    while let Ok(peer) = lan_rx.recv().await {
                        {
                            let mut cache = lan_peers_cache.write().await;
                            cache.insert(peer.peer_id.clone(), peer.clone());
                        }
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

    /// PIN LAN éphémère à 6 chiffres (B-017b).
    pub async fn get_pin_code(&self) -> Option<String> {
        self.pin_code.read().await.clone()
    }

    /// Régénère un PIN LAN et le republie via mDNS si possible.
    pub async fn refresh_pin_code(&self) -> String {
        let pin = generate_lan_pin();
        {
            let mut lock = self.pin_code.write().await;
            *lock = Some(pin.clone());
        }

        // Republier l'annonce mDNS avec le nouveau PIN (unregister + register)
        let invitation = create_invitation(&self.endpoint, self.vault_name.as_deref()).ok();
        let port = self
            .endpoint
            .addr()
            .ip_addrs()
            .next()
            .map(|ip| ip.port())
            .unwrap_or(0);
        let mut mdns_lock = self.mdns.lock().await;
        if let Some(mdns) = mdns_lock.as_mut() {
            let _ = mdns.unregister();
            let _ = mdns.register(
                &self.identity.display_name,
                self.vault_name.as_deref(),
                port,
                invitation.as_deref(),
                Some(pin.as_str()),
            );
        }

        pin
    }

    /// Résout un PIN LAN vers le ticket d'invitation mDNS correspondant.
    pub async fn resolve_pin_to_invitation(&self, pin: &str) -> Result<String> {
        let trimmed = pin.trim();
        if trimmed.len() != 6 || !trimmed.chars().all(|c| c.is_ascii_digit()) {
            return Err(KnitError::Network(
                "Le code PIN doit contenir exactement 6 chiffres".into(),
            ));
        }
        let cache = self.lan_peers.read().await;
        for peer in cache.values() {
            if peer.pin_code.as_deref() == Some(trimmed) {
                if let Some(code) = &peer.invitation_code {
                    return Ok(code.clone());
                }
            }
        }
        Err(KnitError::Network(format!(
            "Aucun pair LAN trouvé pour le PIN {trimmed}"
        )))
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
            .connect(ticket.endpoint_addr.clone(), ALPN_SYNC)
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

        self.setup_peer_session(
            remote_pubkey,
            conn,
            send_stream,
            recv_stream,
            true,
            Some(ticket.endpoint_addr),
        )
        .await
    }

    /// Met à jour le profil local et le sauvegarde dans `.knit/identity/profile.json`
    pub async fn update_local_profile(&self, new_profile: UserProfile) -> Result<()> {
        save_profile(&self.vault_root, &new_profile)?;
        {
            let mut lock = self.profile.write().await;
            *lock = new_profile.clone();
        }
        self.broadcast_profile_update(&new_profile).await;
        Ok(())
    }

    /// Retourne une copie du profil local
    pub async fn get_local_profile(&self) -> UserProfile {
        self.profile.read().await.clone()
    }

    /// Récupère un média manquant dans `assets/` auprès des pairs connectés via Iroh Blobs
    pub async fn sync_asset_from_peers(&self, rel_path: &str, blake3_hash: &str) -> Result<bool> {
        let peer_targets: Vec<(PublicKey, Option<EndpointAddr>)> = {
            let lock = self.active_peers.read().await;
            lock.iter()
                .map(|(k, s)| (*k, s.endpoint_addr.clone()))
                .collect()
        };

        for (peer_key, addr_opt) in peer_targets {
            let target_addr = addr_opt.unwrap_or_else(|| EndpointAddr::new(peer_key));
            let conn_res = self
                .endpoint
                .connect(target_addr, ALPN_BLOBS)
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

            if let Ok(BlobMessage::ResponseBlob { blake3_hash: received_hash, rel_path: target_rel, data }) = read_blob_frame(&mut recv).await {
                if received_hash == blake3_hash
                    && store_verified_blob(
                        &self.vault_root,
                        &target_rel,
                        &received_hash,
                        &data,
                        Some(&self.guard),
                    ).is_ok()
                {
                    let _ = self.events_tx.send(RemoteNetworkEvent::AssetReceived {
                        rel_path: target_rel,
                        from_peer: peer_key.to_string(),
                    });

                    return Ok(true);
                }
            }
        }

        Ok(false)
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

/// Génère un code PIN LAN à 6 chiffres (100000–999999).
fn generate_lan_pin() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    let n = 100_000 + (nanos % 900_000) as u32;
    format!("{n:06}")
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

    #[tokio::test]
    async fn test_peer_profile_exchange_and_privacy_handshake() {
        let dir1 = tempdir().expect("tempdir 1");
        let dir2 = tempdir().expect("tempdir 2");

        let guard1 = WriteGuard::new();
        let guard2 = WriteGuard::new();

        // Node 1 configure un profil avec email mais Privacy Mode = false (Zéro-Fuite)
        let mut p1 = load_or_create_profile(dir1.path(), "Thomas H.").expect("p1");
        p1.email = "thomas@confidential.com".to_string();
        p1.role = "Architecte Produit".to_string();
        p1.share_email_p2p = false;
        save_profile(dir1.path(), &p1).expect("save p1");

        let node1 = KnitNetworkNode::start(dir1.path(), "Thomas H.", Some("Vault"), guard1, false, false)
            .await
            .expect("start 1");

        let node2 = KnitNetworkNode::start(dir2.path(), "Alice", Some("Vault"), guard2, false, false)
            .await
            .expect("start 2");

        let mut rx2 = node2.subscribe_events();
        let ticket = node1.get_invitation_code().expect("ticket");

        let connected_info = node2.connect_by_ticket(&ticket).await.expect("connect");
        assert_eq!(connected_info.display_name, "Thomas H.");
        assert_eq!(connected_info.role.as_deref(), Some("Architecte Produit"));
        assert_eq!(connected_info.email, None, "Zéro-Fuite : l'email privé ne doit pas fuiter");

        // Maintenant, Node 1 active le partage d'email et diffuse la mise à jour
        p1.share_email_p2p = true;
        node1.update_local_profile(p1.clone()).await.expect("update profile");

        let mut received_profile = None;
        while let Ok(ev) = rx2.recv().await {
            if let RemoteNetworkEvent::ProfileUpdated { from_peer, profile } = ev {
                assert_eq!(from_peer, node1.identity.peer_id);
                received_profile = Some(profile);
                break;
            }
        }
        let profile = received_profile.expect("profile update event");
        assert_eq!(profile.email.as_deref(), Some("thomas@confidential.com"));

        node1.stop().await;
        node2.stop().await;
    }

    #[tokio::test]
    async fn test_network_partition_and_offline_yjs_catchup() {
        let dir1 = tempdir().expect("tempdir 1");
        let dir2 = tempdir().expect("tempdir 2");

        let guard1 = WriteGuard::new();
        let guard2 = WriteGuard::new();

        let node1 = KnitNetworkNode::start(dir1.path(), "Node1", Some("TestVault"), guard1, false, false)
            .await
            .expect("start 1");

        let node2 = KnitNetworkNode::start(dir2.path(), "Node2", Some("TestVault"), guard2, false, false)
            .await
            .expect("start 2");

        let ticket = node1.get_invitation_code().expect("ticket");
        node2.connect_by_ticket(&ticket).await.expect("connect");

        let mut rx1 = node1.subscribe_events();
        let mut rx2 = node2.subscribe_events();

        let doc_id = "wiki/concurrence.md";

        // Simulation d'une partition réseau (reconnexion / échange de deltas manqués via SyncStep1 & SyncStep2)
        // Node 1 a un vecteur d'état SV1 et demande le rattrapage
        let state_vector_node1 = vec![1, 2, 3, 4];
        node1.send_sync_step1(doc_id, &state_vector_node1).await;

        let ev2 = rx2.recv().await.expect("receive sync step 1 on node 2");
        match ev2 {
            RemoteNetworkEvent::SyncRequestReceived {
                doc_id: req_doc,
                state_vector,
                from_peer,
            } => {
                assert_eq!(req_doc, doc_id);
                assert_eq!(state_vector, state_vector_node1);
                assert_eq!(from_peer, node1.identity.peer_id);

                // Node 2 répond avec le delta calculé sur la base du vecteur d'état
                let missing_update = vec![42, 43, 44, 45, 99];
                node2.send_sync_step2(&from_peer, doc_id, &missing_update).await;
            }
            other => panic!("Attendu SyncRequestReceived mais reçu: {:?}", other),
        }

        let ev1_resp = rx1.recv().await.expect("receive sync response on node 1");
        match ev1_resp {
            RemoteNetworkEvent::SyncResponseReceived {
                doc_id: resp_doc,
                update,
                from_peer,
            } => {
                assert_eq!(resp_doc, doc_id);
                assert_eq!(update, vec![42, 43, 44, 45, 99]);
                assert_eq!(from_peer, node2.identity.peer_id);
            }
            other => panic!("Attendu SyncResponseReceived mais reçu: {:?}", other),
        }

        node1.stop().await;
        node2.stop().await;
    }

    #[tokio::test]
    async fn test_custom_avatar_p2p_sync_via_blobs() {
        let dir1 = tempdir().expect("tempdir 1");
        let dir2 = tempdir().expect("tempdir 2");

        let guard1 = WriteGuard::new();
        let guard2 = WriteGuard::new();

        // Node 1 configure un avatar personnalisé
        let avatar_bytes = b"PHOTO_DE_PROFIL_HAUTE_RESOLUTION_BLAKE3";
        let avatar_info = crate::vault::identity::save_custom_avatar(
            dir1.path(),
            avatar_bytes,
            "image/png",
        )
        .expect("save avatar");

        let avatar_hash = avatar_info.blake3_hash.clone().expect("hash");

        let node1 = KnitNetworkNode::start(dir1.path(), "Thomas", Some("Vault"), guard1, false, false)
            .await
            .expect("start 1");

        let node2 = KnitNetworkNode::start(dir2.path(), "Alice", Some("Vault"), guard2, false, false)
            .await
            .expect("start 2");

        let ticket = node1.get_invitation_code().expect("ticket");
        node2.connect_by_ticket(&ticket).await.expect("connect");

        // Node 2 rapatrie l'avatar via Iroh Blobs
        let synced = node2
            .sync_asset_from_peers(
                &format!(".knit/cache/avatars/{}.png", avatar_hash),
                &avatar_hash,
            )
            .await
            .expect("sync avatar blob");

        assert!(synced, "L'avatar personnalisé doit être transféré avec succès");

        let cached_path = dir2
            .path()
            .join(".knit")
            .join("cache")
            .join("avatars")
            .join(format!("{}.png", avatar_hash));
        assert!(cached_path.exists());
        let read_bytes = std::fs::read(&cached_path).expect("read cached avatar");
        assert_eq!(read_bytes, avatar_bytes);

        node1.stop().await;
        node2.stop().await;
    }
}
