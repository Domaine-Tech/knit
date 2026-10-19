use notify::event::ModifyKind;
use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tokio::sync::mpsc::{unbounded_channel, UnboundedReceiver, UnboundedSender};

use crate::error::{KnitError, Result};
use crate::vault::tree::{is_watcher_relevant_file, normalize_rel_path};
use crate::vault::walk::is_ignored_dir_name;
use crate::watcher::guard::WriteGuard;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "type", content = "payload")]
pub enum VaultWatchEvent {
    FileChanged { path: String, content: String },
    FileDeleted { path: String },
    TreeChanged,
}

pub struct VaultWatcher {
    _watcher: RecommendedWatcher,
    _guard: WriteGuard,
    vault_root: PathBuf,
}

impl VaultWatcher {
    pub fn new<F>(
        vault_root: &Path,
        guard: WriteGuard,
        on_event: F,
    ) -> Result<(Self, UnboundedReceiver<VaultWatchEvent>)>
    where
        F: Fn(VaultWatchEvent) + Send + Sync + 'static,
    {
        if !vault_root.exists() || !vault_root.is_dir() {
            return Err(KnitError::VaultNotFound(vault_root.display().to_string()));
        }

        let canonical_root = vault_root
            .canonicalize()
            .map_err(KnitError::Io)?;

        let (tx, rx) = unbounded_channel::<VaultWatchEvent>();
        let root_for_filter = canonical_root.clone();
        let guard_for_thread = guard.clone();
        let on_event_arc = Arc::new(on_event);

        // Map de debounce en mémoire pour éviter les événements multiples sous 50ms sur le même fichier
        let debounce_map: Arc<Mutex<HashMap<PathBuf, Instant>>> =
            Arc::new(Mutex::new(HashMap::new()));
        let last_tree_changed: Arc<Mutex<Instant>> =
            Arc::new(Mutex::new(Instant::now() - Duration::from_secs(10)));

        let mut watcher = RecommendedWatcher::new(
            move |res: std::result::Result<Event, notify::Error>| {
                if let Ok(event) = res {
                    Self::handle_fs_event(
                        event,
                        &root_for_filter,
                        &guard_for_thread,
                        &debounce_map,
                        &last_tree_changed,
                        &tx,
                        &on_event_arc,
                    );
                }
            },
            Config::default().with_poll_interval(Duration::from_millis(100)),
        )
        .map_err(|e| KnitError::Watcher(e.to_string()))?;

        watcher
            .watch(&canonical_root, RecursiveMode::Recursive)
            .map_err(|e| KnitError::Watcher(e.to_string()))?;

        Ok((
            Self {
                _watcher: watcher,
                _guard: guard,
                vault_root: canonical_root,
            },
            rx,
        ))
    }

    pub fn vault_root(&self) -> &Path {
        &self.vault_root
    }

    fn should_ignore_path(path: &Path, vault_root: &Path) -> bool {
        let rel = match path.strip_prefix(vault_root) {
            Ok(p) => p,
            Err(_) => path,
        };

        for comp in rel.components() {
            let s = comp.as_os_str().to_string_lossy();
            if s == ".knitshare" || s == ".knitshare.example" {
                continue;
            }
            if s.starts_with(".tmp") || is_ignored_dir_name(&s) {
                return true;
            }
        }

        false
    }

    fn is_relevant_extension(path: &Path) -> bool {
        is_watcher_relevant_file(path)
    }

    fn handle_fs_event<F>(
        event: Event,
        vault_root: &Path,
        guard: &WriteGuard,
        debounce_map: &Arc<Mutex<HashMap<PathBuf, Instant>>>,
        last_tree_changed: &Arc<Mutex<Instant>>,
        tx: &UnboundedSender<VaultWatchEvent>,
        on_event: &Arc<F>,
    ) where
        F: Fn(VaultWatchEvent) + Send + Sync + 'static,
    {
        let notify_tree_changed = || {
            let mut last = last_tree_changed
                .lock()
                .unwrap_or_else(std::sync::PoisonError::into_inner);
            if last.elapsed() >= Duration::from_millis(50) {
                *last = Instant::now();
                let ev = VaultWatchEvent::TreeChanged;
                let _ = tx.send(ev.clone());
                on_event(ev);
            }
        };

        for path in event.paths {
            if Self::should_ignore_path(&path, vault_root) {
                continue;
            }

            let rel_path_str = match path.strip_prefix(vault_root) {
                Ok(p) => normalize_rel_path(p),
                Err(_) => normalize_rel_path(&path),
            };

            match event.kind {
                EventKind::Create(_) => {
                    // Création de fichier ou de dossier -> L'arborescence change
                    notify_tree_changed();

                    if path.is_file() && Self::is_relevant_extension(&path) {
                        if let Ok(bytes) = fs::read(&path) {
                            if guard.is_external_change(&path, &bytes) {
                                let content = String::from_utf8_lossy(&bytes).to_string();
                                guard.record_external_hash(&path, &bytes);

                                let ev = VaultWatchEvent::FileChanged {
                                    path: rel_path_str.clone(),
                                    content,
                                };
                                let _ = tx.send(ev.clone());
                                on_event(ev);
                            }
                        }
                    }
                }
                EventKind::Remove(_) => {
                    // Suppression de fichier ou de dossier -> L'arborescence change
                    notify_tree_changed();

                    if Self::is_relevant_extension(&path) {
                        let ev = VaultWatchEvent::FileDeleted {
                            path: rel_path_str.clone(),
                        };
                        let _ = tx.send(ev.clone());
                        on_event(ev);
                    }
                }
                EventKind::Modify(ModifyKind::Name(_)) => {
                    // Renommage ou déplacement externe (fichier ou dossier)
                    notify_tree_changed();

                    if path.exists() {
                        if path.is_file() && Self::is_relevant_extension(&path) {
                            if let Ok(bytes) = fs::read(&path) {
                                if guard.is_external_change(&path, &bytes) {
                                    let content = String::from_utf8_lossy(&bytes).to_string();
                                    guard.record_external_hash(&path, &bytes);

                                    let ev = VaultWatchEvent::FileChanged {
                                        path: rel_path_str.clone(),
                                        content,
                                    };
                                    let _ = tx.send(ev.clone());
                                    on_event(ev);
                                }
                            }
                        }
                    } else if Self::is_relevant_extension(&path) {
                        let ev = VaultWatchEvent::FileDeleted {
                            path: rel_path_str.clone(),
                        };
                        let _ = tx.send(ev.clone());
                        on_event(ev);
                    }
                }
                EventKind::Modify(_) => {
                    if path.is_dir() {
                        notify_tree_changed();
                        continue;
                    }

                    if !Self::is_relevant_extension(&path) {
                        continue;
                    }

                    // Debounce léger (50ms) pour éviter les écritures disque en rafale du même fichier
                    {
                        let mut map = debounce_map
                            .lock()
                            .unwrap_or_else(std::sync::PoisonError::into_inner);
                        let now = Instant::now();
                        if let Some(&last_time) = map.get(&path) {
                            if now.duration_since(last_time) < Duration::from_millis(50) {
                                continue;
                            }
                        }
                        map.insert(path.clone(), now);
                    }

                    // Lecture du contenu pour vérification WriteGuard (Triple Garde)
                    if let Ok(bytes) = fs::read(&path) {
                        if guard.is_external_change(&path, &bytes) {
                            let content = String::from_utf8_lossy(&bytes).to_string();
                            guard.record_external_hash(&path, &bytes);

                            let ev = VaultWatchEvent::FileChanged {
                                path: rel_path_str.clone(),
                                content,
                            };
                            let _ = tx.send(ev.clone());
                            on_event(ev);
                        }
                    }
                }
                _ => {
                    if !path.exists() {
                        notify_tree_changed();
                        if Self::is_relevant_extension(&path) {
                            let ev = VaultWatchEvent::FileDeleted {
                                path: rel_path_str.clone(),
                            };
                            let _ = tx.send(ev.clone());
                            on_event(ev);
                        }
                    } else if path.is_dir() {
                        notify_tree_changed();
                    } else if Self::is_relevant_extension(&path) {
                        notify_tree_changed();
                        if let Ok(bytes) = fs::read(&path) {
                            if guard.is_external_change(&path, &bytes) {
                                let content = String::from_utf8_lossy(&bytes).to_string();
                                guard.record_external_hash(&path, &bytes);

                                let ev = VaultWatchEvent::FileChanged {
                                    path: rel_path_str.clone(),
                                    content,
                                };
                                let _ = tx.send(ev.clone());
                                on_event(ev);
                            }
                        }
                    }
                }
            }
        }
    }
}
