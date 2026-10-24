use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};

use crate::error::{KnitError, Result};
use crate::watcher::guard::WriteGuard;

use super::fs_ops::copy_dir_all;
use super::path::resolve_safe_path;

static TRASH_SEQ: AtomicU64 = AtomicU64::new(1);

/// Racine de la corbeille locale : `.knit/trash/`.
pub fn trash_dir(vault_root: &Path) -> PathBuf {
    vault_root.join(".knit").join("trash")
}

/// Conteneur d'un élément : `.knit/trash/<trash_id>/`.
pub fn trash_container_path(vault_root: &Path, trash_id: &str) -> PathBuf {
    trash_dir(vault_root).join(trash_id)
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct TrashRecord {
    pub trash_id: String,
    pub original_rel_path: String,
    pub item_name: String,
    pub is_dir: bool,
    pub deleted_at: u64,
}

/// Déplace un fichier ou un dossier vers la corbeille locale du coffre (.knit/trash/<trash_id>/)
/// Permet une annulation immédiate (Ctrl+Z ou bouton "Annuler" dans le toast)
pub fn trash_path(vault_root: &Path, rel_path: &str) -> Result<TrashRecord> {
    trash_path_inner(vault_root, rel_path, None)
}

/// Variante protégée WriteGuard (IPC Tauri).
pub fn trash_path_with_guard(
    vault_root: &Path,
    rel_path: &str,
    guard: &WriteGuard,
) -> Result<TrashRecord> {
    trash_path_inner(vault_root, rel_path, Some(guard))
}

fn trash_path_inner(
    vault_root: &Path,
    rel_path: &str,
    guard: Option<&WriteGuard>,
) -> Result<TrashRecord> {
    let safe_path = resolve_safe_path(vault_root, rel_path)?;
    if !safe_path.exists() {
        return Err(KnitError::Custom(format!(
            "Chemin introuvable : {}",
            rel_path
        )));
    }

    let is_dir = safe_path.is_dir();
    let item_name = safe_path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "element".to_string());

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;
    let seq = TRASH_SEQ.fetch_add(1, Ordering::Relaxed);
    let trash_id = format!("{}-{}", now, seq);

    let trash_container = trash_container_path(vault_root, &trash_id);
    fs::create_dir_all(&trash_container)?;

    let staged_item = trash_container.join(&item_name);
    let prior = if !is_dir {
        fs::read(&safe_path).unwrap_or_default()
    } else {
        Vec::new()
    };
    if let Some(g) = guard {
        g.begin_write(&safe_path, &prior);
    }
    let move_res = if fs::rename(&safe_path, &staged_item).is_ok() {
        Ok(())
    } else if is_dir {
        copy_dir_all(&safe_path, &staged_item).and_then(|_| {
            fs::remove_dir_all(&safe_path).map_err(KnitError::from)
        })
    } else {
        fs::copy(&safe_path, &staged_item)
            .map_err(KnitError::from)
            .and_then(|_| fs::remove_file(&safe_path).map_err(KnitError::from))
    };
    if let Some(g) = guard {
        g.end_write(&safe_path);
    }
    move_res?;

    let record = TrashRecord {
        trash_id,
        original_rel_path: rel_path.to_string(),
        item_name,
        is_dir,
        deleted_at: now,
    };

    let meta_json = serde_json::to_string_pretty(&record)
        .map_err(|e| KnitError::Custom(format!("Erreur sérialisation meta trash : {}", e)))?;
    fs::write(trash_container.join("meta.json"), meta_json)?;

    Ok(record)
}

/// Restaure un élément depuis la corbeille locale vers son emplacement d'origine
pub fn restore_trash_path(vault_root: &Path, trash_id: &str) -> Result<String> {
    restore_trash_path_inner(vault_root, trash_id, None)
}

/// Variante protégée WriteGuard (IPC Tauri).
pub fn restore_trash_path_with_guard(
    vault_root: &Path,
    trash_id: &str,
    guard: &WriteGuard,
) -> Result<String> {
    restore_trash_path_inner(vault_root, trash_id, Some(guard))
}

fn restore_trash_path_inner(
    vault_root: &Path,
    trash_id: &str,
    guard: Option<&WriteGuard>,
) -> Result<String> {
    let trash_container = trash_container_path(vault_root, trash_id);
    if !trash_container.exists() {
        return Err(KnitError::Custom(format!(
            "Élément introuvable dans la corbeille : {}",
            trash_id
        )));
    }

    let meta_path = trash_container.join("meta.json");
    if !meta_path.exists() {
        return Err(KnitError::Custom("Métadonnées de corbeille manquantes".to_string()));
    }

    let meta_content = fs::read_to_string(&meta_path)?;
    let record: TrashRecord = serde_json::from_str(&meta_content)
        .map_err(|e| KnitError::Custom(format!("Format métadonnées corbeille invalide : {}", e)))?;

    let staged_item = trash_container.join(&record.item_name);
    if !staged_item.exists() {
        return Err(KnitError::Custom(format!(
            "Fichier staged introuvable : {:?}",
            staged_item
        )));
    }

    let original_target = resolve_safe_path(vault_root, &record.original_rel_path)?;
    if let Some(parent) = original_target.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)?;
        }
    }

    let prior = if !record.is_dir {
        fs::read(&staged_item).unwrap_or_default()
    } else {
        Vec::new()
    };
    if let Some(g) = guard {
        g.begin_write(&original_target, &prior);
    }
    let restore_res = if fs::rename(&staged_item, &original_target).is_ok() {
        Ok(())
    } else if record.is_dir {
        copy_dir_all(&staged_item, &original_target).and_then(|_| {
            let _ = fs::remove_dir_all(&staged_item);
            Ok(())
        })
    } else {
        fs::copy(&staged_item, &original_target)
            .map_err(KnitError::from)
            .map(|_| {
                let _ = fs::remove_file(&staged_item);
            })
    };
    if let Some(g) = guard {
        g.end_write(&original_target);
    }
    restore_res?;

    let _ = fs::remove_dir_all(&trash_container);

    Ok(record.original_rel_path)
}

/// Envoie un élément de la corbeille locale vers la corbeille du système d'exploitation
/// Déplace d'abord l'élément à son emplacement d'origine dans le coffre avant d'appeler
/// `trash::delete`, garantissant ainsi qu'une restauration native depuis la Corbeille de l'OS
/// (Windows Recycle Bin, Corbeille macOS / Linux) réintègre le fichier à son chemin d'origine exact.
pub fn commit_trash_to_os(vault_root: &Path, trash_id: &str) -> Result<()> {
    let trash_container = trash_container_path(vault_root, trash_id);
    if !trash_container.exists() {
        return Ok(());
    }

    let meta_path = trash_container.join("meta.json");
    if meta_path.exists() {
        if let Ok(meta_content) = fs::read_to_string(&meta_path) {
            if let Ok(record) = serde_json::from_str::<TrashRecord>(&meta_content) {
                let staged_item = trash_container.join(&record.item_name);
                if staged_item.exists() {
                    let original_target = resolve_safe_path(vault_root, &record.original_rel_path);

                    if let Ok(target) = original_target {
                        if !target.exists() {
                            if let Some(parent) = target.parent() {
                                let _ = fs::create_dir_all(parent);
                            }

                            // Déplacement atomique vers son chemin d'origine avant suppression OS
                            if fs::rename(&staged_item, &target).is_ok() {
                                match trash::delete(&target) {
                                    Ok(()) => {
                                        let _ = fs::remove_dir_all(&trash_container);
                                        return Ok(());
                                    }
                                    Err(e) => {
                                        // En cas d'échec de la corbeille OS (volume réseau / amovible),
                                        // on sécurise à nouveau le fichier dans .knit/trash/
                                        let _ = fs::rename(&target, &staged_item);
                                        eprintln!(
                                            "trash::delete impossible sur ce volume ({}), fichier conservé dans .knit/trash/",
                                            e
                                        );
                                        return Ok(());
                                    }
                                }
                            }
                        }
                    }

                    // Si l'emplacement d'origine est déjà occupé ou si le renommage échoue,
                    // suppression directe depuis la corbeille locale
                    match trash::delete(&staged_item) {
                        Ok(()) => {
                            let _ = fs::remove_dir_all(&trash_container);
                        }
                        Err(e) => {
                            eprintln!(
                                "trash::delete impossible sur ce volume ({}), fichier conservé dans .knit/trash/",
                                e
                            );
                        }
                    }
                    return Ok(());
                }
            }
        }
    }

    let _ = fs::remove_dir_all(&trash_container);
    Ok(())
}

/// Aperçu texte d'un fichier (non dossier) encore présent dans la corbeille.
pub fn read_trash_preview(vault_root: &Path, trash_id: &str) -> Result<Option<String>> {
    let records = list_trash_records(vault_root)?;
    let Some(record) = records.into_iter().find(|r| r.trash_id == trash_id) else {
        return Ok(None);
    };
    if record.is_dir {
        return Ok(None);
    }
    let staged = trash_container_path(vault_root, trash_id).join(&record.item_name);
    match fs::read_to_string(&staged) {
        Ok(content) => Ok(Some(content)),
        Err(_) => Ok(None),
    }
}

/// Liste les éléments présents dans `.knit/trash/` (meta.json).
pub fn list_trash_records(vault_root: &Path) -> Result<Vec<TrashRecord>> {
    let mut records = Vec::new();
    let trash_dir = trash_dir(vault_root);
    if !trash_dir.exists() || !trash_dir.is_dir() {
        return Ok(records);
    }
    let entries = match fs::read_dir(&trash_dir) {
        Ok(rd) => rd,
        Err(_) => return Ok(records),
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        let meta_path = path.join("meta.json");
        if !meta_path.exists() {
            continue;
        }
        if let Ok(meta_content) = fs::read_to_string(&meta_path) {
            if let Ok(record) = serde_json::from_str::<TrashRecord>(&meta_content) {
                records.push(record);
            }
        }
    }
    records.sort_by(|a, b| b.deleted_at.cmp(&a.deleted_at));
    Ok(records)
}

/// Supprime définitivement un élément de `.knit/trash/` (sans restauration OS).
pub fn purge_trash_item(vault_root: &Path, trash_id: &str) -> Result<()> {
    let trash_container = trash_container_path(vault_root, trash_id);
    if trash_container.exists() {
        fs::remove_dir_all(&trash_container).map_err(KnitError::from)?;
    }
    Ok(())
}

/// Vide entièrement `.knit/trash/`.
pub fn purge_all_trash(vault_root: &Path) -> Result<usize> {
    let trash_dir = trash_dir(vault_root);
    if !trash_dir.exists() {
        return Ok(0);
    }
    let mut count = 0usize;
    if let Ok(entries) = fs::read_dir(&trash_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                let _ = fs::remove_dir_all(&path);
                count += 1;
            }
        }
    }
    Ok(count)
}

/// Analyse le dossier `.knit/trash/` pour récupérer d'éventuels éléments orphelins
/// (par exemple suite à une restauration manuelle depuis la corbeille de l'OS ayant replacé
/// le fichier dans `.knit/trash/`, ou une coupure de l'application pendant le délai d'annulation).
pub fn recover_orphaned_trash(vault_root: &Path) -> Result<Vec<String>> {
    let mut recovered = Vec::new();
    let trash_dir = trash_dir(vault_root);
    if !trash_dir.exists() || !trash_dir.is_dir() {
        return Ok(recovered);
    }

    let entries = match fs::read_dir(&trash_dir) {
        Ok(rd) => rd,
        Err(_) => return Ok(recovered),
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }

        let meta_path = path.join("meta.json");
        if !meta_path.exists() {
            continue;
        }

        if let Ok(meta_content) = fs::read_to_string(&meta_path) {
            if let Ok(record) = serde_json::from_str::<TrashRecord>(&meta_content) {
                let staged_item = path.join(&record.item_name);
                if staged_item.exists() {
                    if let Ok(target) = resolve_safe_path(vault_root, &record.original_rel_path) {
                        if !target.exists() {
                            if let Some(parent) = target.parent() {
                                let _ = fs::create_dir_all(parent);
                            }
                            if fs::rename(&staged_item, &target).is_ok() {
                                recovered.push(record.original_rel_path);
                                let _ = fs::remove_dir_all(&path);
                            }
                        }
                    }
                } else {
                    // Staged item absent : conteneur vide à nettoyer
                    let _ = fs::remove_dir_all(&path);
                }
            }
        }
    }

    Ok(recovered)
}
