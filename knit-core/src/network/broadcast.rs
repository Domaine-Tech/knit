use crate::network::node::KnitNetworkNode;
use crate::network::protocol::KnitSyncMessage;
use crate::vault::identity::{PeerProfileSummary, UserProfile};

impl KnitNetworkNode {
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

    /// Émet une requête de rattrapage Yjs SyncStep1 (avec son StateVector) vers tous les pairs connectés
    pub async fn send_sync_step1(&self, doc_id: &str, state_vector: &[u8]) {
        let msg = KnitSyncMessage::SyncStep1 {
            doc_id: doc_id.to_string(),
            state_vector: state_vector.to_vec(),
        };
        let lock = self.active_peers.read().await;
        for session in lock.values() {
            let _ = session.send_tx.send(msg.clone()).await;
        }
    }

    /// Répond à une requête SyncStep1 avec les deltas calculés SyncStep2 (soit à un pair précis, soit en broadcast)
    pub async fn send_sync_step2(&self, peer_id: &str, doc_id: &str, update: &[u8]) {
        let msg = KnitSyncMessage::SyncStep2 {
            doc_id: doc_id.to_string(),
            update: update.to_vec(),
        };

        let lock = self.active_peers.read().await;
        for (pubkey, session) in lock.iter() {
            if pubkey.to_string() == peer_id {
                let _ = session.send_tx.send(msg.clone()).await;
                return;
            }
        }
        for session in lock.values() {
            let _ = session.send_tx.send(msg.clone()).await;
        }
    }

    /// Diffuse la mise à jour du profil utilisateur aux pairs connectés
    pub async fn broadcast_profile_update(&self, profile: &UserProfile) {
        let summary = PeerProfileSummary::from_profile(profile);
        let msg = KnitSyncMessage::ProfileUpdate { profile: summary };
        let lock = self.active_peers.read().await;
        for session in lock.values() {
            let _ = session.send_tx.send(msg.clone()).await;
        }
    }

}
