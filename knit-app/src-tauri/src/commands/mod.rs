mod vault;
mod watcher;
mod network;
mod markdown;

pub use vault::*;
pub use watcher::*;
pub use network::*;
pub use markdown::*;

use knit_core::error::{KnitError, Result as KnitResult};
use knit_core::network::KnitNetworkNode;
use knit_core::watcher::{VaultWatcher, WriteGuard};
use std::sync::{Arc, Mutex};

/// Convertit un Result knit-core en erreur IPC String (contrat frontend inchangé).
pub fn ipc<T>(result: KnitResult<T>) -> Result<T, String> {
    result.map_err(|e: KnitError| e.to_string())
}

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
