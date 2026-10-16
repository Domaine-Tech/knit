use crate::error::{KnitError, Result};
use mdns_sd::{ServiceDaemon, ServiceEvent, ServiceInfo};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::sync::broadcast;

pub const KNIT_MDNS_SERVICE_TYPE: &str = "_knit._udp.local.";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DiscoveredLanPeer {
    pub peer_id: String,
    pub display_name: String,
    pub vault_name: Option<String>,
    pub addresses: Vec<String>,
    pub port: u16,
    pub invitation_code: Option<String>,
    pub last_seen_sec: u64,
}

pub struct MdnsService {
    daemon: ServiceDaemon,
    my_peer_id: String,
    fullname: Arc<Mutex<Option<String>>>,
    event_tx: broadcast::Sender<DiscoveredLanPeer>,
}

impl MdnsService {
    pub fn new(my_peer_id: String) -> Result<Self> {
        let daemon = ServiceDaemon::new()
            .map_err(|e| KnitError::Network(format!("Erreur d'initialisation mDNS daemon: {}", e)))?;
        let (event_tx, _) = broadcast::channel(128);

        Ok(Self {
            daemon,
            my_peer_id,
            fullname: Arc::new(Mutex::new(None)),
            event_tx,
        })
    }

    /// S'abonne aux événements de pairs découverts sur le réseau local
    pub fn subscribe(&self) -> broadcast::Receiver<DiscoveredLanPeer> {
        self.event_tx.subscribe()
    }

    /// Démarre la publication de notre instance Knit sur le réseau local
    pub fn register(
        &self,
        display_name: &str,
        vault_name: Option<&str>,
        port: u16,
        invitation_code: Option<&str>,
    ) -> Result<()> {
        let host_name = format!("{}.local.", &self.my_peer_id[..8.min(self.my_peer_id.len())]);
        let instance_name = format!("{}-knit", &self.my_peer_id[..8.min(self.my_peer_id.len())]);

        let mut properties = HashMap::new();
        properties.insert("peer_id".to_string(), self.my_peer_id.clone());
        properties.insert("display_name".to_string(), display_name.to_string());
        if let Some(v) = vault_name {
            properties.insert("vault_name".to_string(), v.to_string());
        }
        if let Some(inv) = invitation_code {
            properties.insert("invitation".to_string(), inv.to_string());
        }
        properties.insert("version".to_string(), "0.2.0".to_string());

        let service_info = ServiceInfo::new(
            KNIT_MDNS_SERVICE_TYPE,
            &instance_name,
            &host_name,
            "",
            port,
            properties,
        )
        .map_err(|e| KnitError::Network(format!("Erreur création ServiceInfo mDNS: {}", e)))?;

        let fullname = service_info.get_fullname().to_string();
        self.daemon
            .register(service_info)
            .map_err(|e| KnitError::Network(format!("Erreur publication mDNS: {}", e)))?;

        if let Ok(mut lock) = self.fullname.lock() {
            *lock = Some(fullname);
        }

        Ok(())
    }

    /// Lance l'écoute de découverte des pairs locaux
    pub fn start_browsing(&self) -> Result<()> {
        let receiver = self
            .daemon
            .browse(KNIT_MDNS_SERVICE_TYPE)
            .map_err(|e| KnitError::Network(format!("Erreur navigation mDNS: {}", e)))?;

        let my_peer_id = self.my_peer_id.clone();
        let tx = self.event_tx.clone();

        tokio::task::spawn_blocking(move || {
            while let Ok(event) = receiver.recv() {
                if let ServiceEvent::ServiceResolved(info) = event {
                    let peer_id = match info.get_property_val_str("peer_id") {
                        Some(id) if id != my_peer_id => id.to_string(),
                        _ => continue, // Ignore notre propre annonce ou annonces incomplètes
                    };

                    let display_name = info
                        .get_property_val_str("display_name")
                        .unwrap_or("Pair Knit")
                        .to_string();

                    let vault_name = info.get_property_val_str("vault_name").map(|s| s.to_string());
                    let invitation_code =
                        info.get_property_val_str("invitation").map(|s| s.to_string());

                    let addresses: Vec<String> = info
                        .get_addresses()
                        .iter()
                        .map(|addr| addr.to_ip_addr().to_string())
                        .collect();

                    let now = SystemTime::now()
                        .duration_since(UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_secs();

                    let peer = DiscoveredLanPeer {
                        peer_id,
                        display_name,
                        vault_name,
                        addresses,
                        port: info.get_port(),
                        invitation_code,
                        last_seen_sec: now,
                    };

                    let _ = tx.send(peer);
                }
            }
        });

        Ok(())
    }

    /// Arrête l'annonce locale
    pub fn unregister(&self) -> Result<()> {
        let name_opt = {
            if let Ok(lock) = self.fullname.lock() {
                lock.clone()
            } else {
                None
            }
        };

        if let Some(fullname) = name_opt {
            let _ = self.daemon.unregister(&fullname);
        }
        Ok(())
    }
}

impl Drop for MdnsService {
    fn drop(&mut self) {
        let _ = self.unregister();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mdns_initialization_and_registration() {
        let service = MdnsService::new("node_test_abc123".to_string()).expect("init mdns");
        let reg_result = service.register(
            "Alice",
            Some("Mon Vault"),
            11223,
            Some("knit://join/testticket"),
        );
        assert!(reg_result.is_ok(), "L'enregistrement mDNS doit réussir");
        assert!(service.unregister().is_ok());
    }
}
