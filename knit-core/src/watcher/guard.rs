use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use xxhash_rust::xxh3::xxh3_64;

/// Gestionnaire anti-boucle pour le File Watcher (Triple Garde)
#[derive(Debug, Clone, Default)]
pub struct WriteGuard {
    inner: Arc<Mutex<WriteGuardState>>,
}

#[derive(Debug, Default)]
struct WriteGuardState {
    /// Flag : on est en train d'écrire nous-mêmes ce chemin
    is_writing: HashMap<PathBuf, bool>,
    /// Hash XXH3 du dernier contenu écrit par Knit
    last_written_hash: HashMap<PathBuf, u64>,
}

impl WriteGuard {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(Mutex::new(WriteGuardState::default())),
        }
    }

    fn normalize_path(path: &Path) -> PathBuf {
        path.canonicalize().unwrap_or_else(|_| path.to_path_buf())
    }

    /// Appelé AVANT d'écrire un .md sur disque par Knit
    pub fn begin_write(&self, path: &Path, content: &[u8]) {
        let normalized = Self::normalize_path(path);
        let mut state = self.inner.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        state.is_writing.insert(normalized.clone(), true);
        state.last_written_hash.insert(normalized, xxh3_64(content));
    }

    /// Appelé APRÈS l'écriture pour désactiver le flag
    pub fn end_write(&self, path: &Path) {
        let normalized = Self::normalize_path(path);
        let mut state = self.inner.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        state.is_writing.insert(normalized, false);
    }

    /// Détermine si un événement de modification du File Watcher provient d'un agent externe
    pub fn is_external_change(&self, path: &Path, new_content: &[u8]) -> bool {
        let normalized = Self::normalize_path(path);
        let state = self.inner.lock().unwrap_or_else(std::sync::PoisonError::into_inner);

        // Garde 1 : En train d'écrire nous-mêmes
        if *state.is_writing.get(&normalized).unwrap_or(&false) {
            return false;
        }

        // Garde 2 : Hash identique au dernier hash écrit
        let new_hash = xxh3_64(new_content);
        if let Some(&last_hash) = state.last_written_hash.get(&normalized) {
            if new_hash == last_hash {
                return false;
            }
        }

        // Garde 3 : C'est une vraie modification externe (Agent IA, VS Code, Git...)
        true
    }

    /// Met à jour manuellement le hash de référence après synchronisation externe
    pub fn record_external_hash(&self, path: &Path, content: &[u8]) {
        let normalized = Self::normalize_path(path);
        let mut state = self.inner.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        state.last_written_hash.insert(normalized, xxh3_64(content));
    }
}
