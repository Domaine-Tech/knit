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

        // Dossiers et fichiers ignorés (système, versioning, caches)
        if name.starts_with(".git")
            || name == ".knit"
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
            // Nous affichons les fichiers Markdown .md, .markdown, .txt et les fichiers techniques comme .knitshare
            let is_md_or_text = ext
                .as_ref()
                .map(|e| e.eq_ignore_ascii_case("md") || e.eq_ignore_ascii_case("markdown") || e.eq_ignore_ascii_case("txt"))
                .unwrap_or(false)
                || name == ".knitshare"
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
