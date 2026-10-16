use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

use crate::error::{KnitError, Result};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct FileNode {
    pub id: String,
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub extension: Option<String>,
    pub children: Vec<FileNode>,
}

/// Normalise un chemin pour l'affichage et les identifiants multiplateformes (barres obliques '/')
pub fn normalize_rel_path(path: &Path) -> String {
    path.components()
        .map(|c| c.as_os_str().to_string_lossy())
        .collect::<Vec<_>>()
        .join("/")
}

/// Vérifie qu'un chemin relatif ne s'échappe pas du coffre-fort (protection path-traversal)
pub fn resolve_safe_path(vault_root: &Path, rel_path: &str) -> Result<PathBuf> {
    let clean_rel = rel_path.trim_start_matches(['/', '\\']);

    // Protection immédiate contre toute tentative de traversée parent ("..") ou racine absolue
    for comp in Path::new(clean_rel).components() {
        if matches!(
            comp,
            std::path::Component::ParentDir
                | std::path::Component::Prefix(_)
                | std::path::Component::RootDir
        ) {
            return Err(KnitError::InvalidPath(format!(
                "Tentative d'accès non autorisé hors du coffre-fort : {}",
                rel_path
            )));
        }
    }

    let target = vault_root.join(clean_rel);

    // Canonicalize ou vérification de préfixe
    let canonical_root = vault_root
        .canonicalize()
        .map_err(|_| KnitError::VaultNotFound(vault_root.display().to_string()))?;

    // Pour un fichier qui n'existe pas encore, on vérifie son parent
    if target.exists() {
        let canonical_target = target.canonicalize()?;
        if !canonical_target.starts_with(&canonical_root) {
            return Err(KnitError::InvalidPath(format!(
                "Tentative d'accès non autorisé hors du coffre-fort : {}",
                rel_path
            )));
        }
        Ok(canonical_target)
    } else {
        if let Some(parent) = target.parent() {
            if parent.exists() {
                let canonical_parent = parent.canonicalize()?;
                if !canonical_parent.starts_with(&canonical_root) {
                    return Err(KnitError::InvalidPath(format!(
                        "Chemin parent non autorisé hors du coffre-fort : {}",
                        rel_path
                    )));
                }
            }
        }
        Ok(target)
    }
}

/// Lit l'arborescence récursive d'un dossier de coffre-fort
pub fn read_vault_tree(vault_path: &Path) -> Result<Vec<FileNode>> {
    if !vault_path.exists() || !vault_path.is_dir() {
        return Err(KnitError::VaultNotFound(vault_path.display().to_string()));
    }

    read_dir_recursive(vault_path, vault_path)
}

fn read_dir_recursive(vault_root: &Path, current_dir: &Path) -> Result<Vec<FileNode>> {
    let mut entries = Vec::new();

    let read_dir = match fs::read_dir(current_dir) {
        Ok(rd) => rd,
        Err(e) => return Err(KnitError::Io(e)),
    };

    for entry in read_dir {
        let entry = entry?;
        let file_type = entry.file_type()?;
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        // Dossiers et fichiers ignorés (fichiers/dossiers cachés commençant par '.', caches, build)
        if name.starts_with('.')
            || name == "target"
            || name == "node_modules"
            || name == "dist"
        {
            continue;
        }

        let rel_path = match path.strip_prefix(vault_root) {
            Ok(p) => normalize_rel_path(p),
            Err(_) => normalize_rel_path(&path),
        };

        if file_type.is_dir() {
            let children = read_dir_recursive(vault_root, &path)?;
            entries.push(FileNode {
                id: rel_path.clone(),
                name,
                path: rel_path,
                is_dir: true,
                extension: None,
                children,
            });
        } else if file_type.is_file() {
            let ext = path.extension().map(|e| e.to_string_lossy().to_string());
            // Nous affichons les fichiers Markdown .md, .markdown, .txt et les fichiers autorisés comme KNIT.md
            let is_md_or_text = ext
                .as_ref()
                .map(|e| e.eq_ignore_ascii_case("md") || e.eq_ignore_ascii_case("markdown") || e.eq_ignore_ascii_case("txt"))
                .unwrap_or(false)
                || name == "KNIT.md";

            if is_md_or_text {
                entries.push(FileNode {
                    id: rel_path.clone(),
                    name,
                    path: rel_path,
                    is_dir: false,
                    extension: ext,
                    children: Vec::new(),
                });
            }
        }
    }

    // Tri : Répertoires d'abord, puis fichiers par ordre alphabétique insensible à la casse
    entries.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    Ok(entries)
}

/// Lecture du contenu textuel UTF-8 d'un fichier du coffre
pub fn read_file_content(vault_root: &Path, rel_path: &str) -> Result<String> {
    let safe_path = resolve_safe_path(vault_root, rel_path)?;
    if !safe_path.exists() {
        return Err(KnitError::Custom(format!(
            "Fichier introuvable : {}",
            rel_path
        )));
    }
    let content = fs::read_to_string(safe_path)?;
    Ok(content)
}

/// Écriture du contenu d'un fichier dans le coffre
pub fn write_file_content(vault_root: &Path, rel_path: &str, content: &str) -> Result<()> {
    let safe_path = resolve_safe_path(vault_root, rel_path)?;
    if let Some(parent) = safe_path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)?;
        }
    }
    fs::write(safe_path, content.as_bytes())?;
    Ok(())
}

/// Création d'un nouveau fichier Markdown
pub fn create_file(vault_root: &Path, rel_path: &str, initial_content: Option<&str>) -> Result<()> {
    let safe_path = resolve_safe_path(vault_root, rel_path)?;
    if safe_path.exists() {
        return Err(KnitError::Custom(format!(
            "Le fichier existe déjà : {}",
            rel_path
        )));
    }
    if let Some(parent) = safe_path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)?;
        }
    }
    let content = initial_content.unwrap_or("");
    fs::write(safe_path, content.as_bytes())?;
    Ok(())
}

/// Création d'un nouveau dossier
pub fn create_dir(vault_root: &Path, rel_path: &str) -> Result<()> {
    let safe_path = resolve_safe_path(vault_root, rel_path)?;
    if !safe_path.exists() {
        fs::create_dir_all(safe_path)?;
    }
    Ok(())
}

use std::sync::atomic::{AtomicU64, Ordering};

static TRASH_SEQ: AtomicU64 = AtomicU64::new(1);

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

    let trash_container = vault_root.join(".knit").join("trash").join(&trash_id);
    fs::create_dir_all(&trash_container)?;

    let staged_item = trash_container.join(&item_name);
    // Déplacement atomique au sein du même filesystem
    if fs::rename(&safe_path, &staged_item).is_err() {
        // En cas d'erreur de renommage (ex: cross-device), copie puis suppression
        if is_dir {
            copy_dir_all(&safe_path, &staged_item)?;
            fs::remove_dir_all(&safe_path)?;
        } else {
            fs::copy(&safe_path, &staged_item)?;
            fs::remove_file(&safe_path)?;
        }
    }

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
    let trash_container = vault_root.join(".knit").join("trash").join(trash_id);
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

    if fs::rename(&staged_item, &original_target).is_err() {
        if record.is_dir {
            copy_dir_all(&staged_item, &original_target)?;
            let _ = fs::remove_dir_all(&staged_item);
        } else {
            fs::copy(&staged_item, &original_target)?;
            let _ = fs::remove_file(&staged_item);
        }
    }

    let _ = fs::remove_dir_all(&trash_container);

    Ok(record.original_rel_path)
}

/// Envoie un élément de la corbeille locale vers la corbeille du système d'exploitation
/// Déplace d'abord l'élément à son emplacement d'origine dans le coffre avant d'appeler
/// `trash::delete`, garantissant ainsi qu'une restauration native depuis la Corbeille de l'OS
/// (Windows Recycle Bin, Corbeille macOS / Linux) réintègre le fichier à son chemin d'origine exact.
pub fn commit_trash_to_os(vault_root: &Path, trash_id: &str) -> Result<()> {
    let trash_container = vault_root.join(".knit").join("trash").join(trash_id);
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

/// Analyse le dossier `.knit/trash/` pour récupérer d'éventuels éléments orphelins
/// (par exemple suite à une restauration manuelle depuis la corbeille de l'OS ayant replacé
/// le fichier dans `.knit/trash/`, ou une coupure de l'application pendant le délai d'annulation).
pub fn recover_orphaned_trash(vault_root: &Path) -> Result<Vec<String>> {
    let mut recovered = Vec::new();
    let trash_dir = vault_root.join(".knit").join("trash");
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

fn copy_dir_all(src: &Path, dst: &Path) -> Result<()> {
    fs::create_dir_all(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let file_type = entry.file_type()?;
        if file_type.is_dir() {
            copy_dir_all(&entry.path(), &dst.join(entry.file_name()))?;
        } else {
            fs::copy(entry.path(), dst.join(entry.file_name()))?;
        }
    }
    Ok(())
}

/// Supprime définitivement un fichier ou un dossier du coffre-fort
pub fn delete_path(vault_root: &Path, rel_path: &str) -> Result<()> {
    let safe_path = resolve_safe_path(vault_root, rel_path)?;
    if !safe_path.exists() {
        return Err(KnitError::Custom(format!(
            "Chemin introuvable : {}",
            rel_path
        )));
    }
    if safe_path.is_dir() {
        fs::remove_dir_all(&safe_path)?;
    } else {
        fs::remove_file(&safe_path)?;
    }
    Ok(())
}

/// Écriture du contenu d'un fichier dans le coffre avec protection WriteGuard
pub fn write_file_content_with_guard(
    vault_root: &Path,
    rel_path: &str,
    content: &str,
    guard: &crate::watcher::guard::WriteGuard,
) -> Result<()> {
    let safe_path = resolve_safe_path(vault_root, rel_path)?;
    if let Some(parent) = safe_path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)?;
        }
    }
    let bytes = content.as_bytes();
    guard.begin_write(&safe_path, bytes);
    let res = fs::write(&safe_path, bytes);
    guard.end_write(&safe_path);
    res?;
    Ok(())
}

/// Renomme ou déplace un fichier du coffre et refactorise automatiquement tous les liens référents
pub fn rename_file_and_refactor(
    vault_root: &Path,
    old_rel_path: &str,
    new_rel_path: &str,
    guard: &crate::watcher::guard::WriteGuard,
) -> Result<crate::markdown::LinkRefactorReport> {
    let safe_old = resolve_safe_path(vault_root, old_rel_path)?;
    if !safe_old.exists() {
        return Err(KnitError::Custom(format!(
            "Fichier source introuvable : {}",
            old_rel_path
        )));
    }

    let safe_new = resolve_safe_path(vault_root, new_rel_path)?;
    if safe_new.exists() {
        return Err(KnitError::Custom(format!(
            "Un fichier existe déjà à l'emplacement cible : {}",
            new_rel_path
        )));
    }

    if let Some(parent) = safe_new.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)?;
        }
    }

    fs::rename(&safe_old, &safe_new)?;

    // Refactorise automatiquement tous les liens dans le coffre
    let report = crate::markdown::refactor_links_in_vault(vault_root, old_rel_path, new_rel_path, guard)?;
    Ok(report)
}

