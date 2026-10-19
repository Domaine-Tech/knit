use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

use crate::error::{KnitError, Result};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct FileNode {
    pub id: String,
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub extension: Option<String>,
    /// Horodatage de modification FS en millisecondes epoch (fichiers uniquement).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mtime_ms: Option<u64>,
    pub children: Vec<FileNode>,
}

pub(crate) fn file_mtime_ms(path: &Path) -> Option<u64> {
    path.metadata().ok().and_then(|meta| {
        meta.modified().ok().and_then(|modified| {
            modified
                .duration_since(std::time::UNIX_EPOCH)
                .ok()
                .map(|d| d.as_millis() as u64)
        })
    })
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

/// Extensions de notes / textes visibles dans l'arborescence.
pub fn is_text_note_ext(ext: &str) -> bool {
    matches!(
        ext.to_ascii_lowercase().as_str(),
        "md" | "markdown" | "txt" | "canvas" | "html" | "htm"
    )
}

/// Extensions médias synchronisées via Iroh Blobs (`assets/`, collages, etc.).
pub fn is_media_ext(ext: &str) -> bool {
    matches!(
        ext.to_ascii_lowercase().as_str(),
        "png" | "jpg" | "jpeg" | "gif" | "webp" | "svg" | "bmp" | "ico"
    )
}

/// Fichier affiché dans le tree (notes Markdown + médias coffre).
pub fn is_vault_visible_file(name: &str, ext: Option<&str>) -> bool {
    if name.eq_ignore_ascii_case("KNIT.md") {
        return true;
    }
    matches!(ext, Some(e) if is_text_note_ext(e) || is_media_ext(e))
}

/// Fichier pertinent pour le File Watcher (notes, médias, `.knitshare`).
pub fn is_watcher_relevant_file(path: &Path) -> bool {
    let name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("");
    if name == ".knitshare" || name == ".knitshare.example" || name.eq_ignore_ascii_case("KNIT.md")
    {
        return true;
    }
    let ext = path.extension().and_then(|e| e.to_str());
    is_vault_visible_file(name, ext)
}
