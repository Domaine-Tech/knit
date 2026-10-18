use crate::network::node::KnitNetworkNode;
use crate::network::protocol::KnitSyncMessage;
use std::sync::Arc;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

impl KnitNetworkNode {
    /// Boucle de Heartbeat (Ping toutes les 15 secondes)
    pub(crate) async fn heartbeat_loop(self: Arc<Self>) {
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

}
