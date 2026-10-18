use std::fs;
use std::path::Path;

use crate::error::{KnitError, Result};

use crate::vault::walk::is_ignored_dir_name;
use crate::watcher::guard::WriteGuard;

use super::path::{
    file_mtime_ms, is_vault_visible_file, normalize_rel_path, resolve_safe_path, FileNode,
};

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

        if is_ignored_dir_name(&name) {
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
                mtime_ms: None,
                children,
            });
        } else if file_type.is_file() {
            let ext = path.extension().map(|e| e.to_string_lossy().to_string());
            // Notes Markdown + médias du coffre (`assets/` : svg, png, …)
            if is_vault_visible_file(&name, ext.as_deref()) {
                entries.push(FileNode {
                    id: rel_path.clone(),
                    name,
                    path: rel_path,
                    is_dir: false,
                    extension: ext,
                    mtime_ms: file_mtime_ms(&path),
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

/// Écriture du contenu d'un fichier dans le coffre (sans garde — tests / chemins internes).
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

/// Création d'un nouveau fichier Markdown (sans garde — tests).
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

/// Création d'un nouveau dossier (sans garde — tests).
pub fn create_dir(vault_root: &Path, rel_path: &str) -> Result<()> {
    let safe_path = resolve_safe_path(vault_root, rel_path)?;
    if !safe_path.exists() {
        fs::create_dir_all(safe_path)?;
    }
    Ok(())
}

pub(crate) fn copy_dir_all(src: &Path, dst: &Path) -> Result<()> {
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

/// Supprime définitivement un fichier ou un dossier du coffre-fort (sans garde — tests).
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

/// Écriture du contenu d'un fichier dans le coffre avec protection WriteGuard.
pub fn write_file_content_with_guard(
    vault_root: &Path,
    rel_path: &str,
    content: &str,
    guard: &WriteGuard,
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

/// Création d'un fichier Markdown avec protection WriteGuard.
pub fn create_file_with_guard(
    vault_root: &Path,
    rel_path: &str,
    initial_content: Option<&str>,
    guard: &WriteGuard,
) -> Result<()> {
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
    let bytes = content.as_bytes();
    guard.begin_write(&safe_path, bytes);
    let res = fs::write(&safe_path, bytes);
    guard.end_write(&safe_path);
    res?;
    Ok(())
}

/// Création d'un dossier avec protection WriteGuard.
pub fn create_dir_with_guard(
    vault_root: &Path,
    rel_path: &str,
    guard: &WriteGuard,
) -> Result<()> {
    let safe_path = resolve_safe_path(vault_root, rel_path)?;
    if safe_path.exists() {
        return Ok(());
    }
    guard.begin_write(&safe_path, b"");
    let res = fs::create_dir_all(&safe_path);
    guard.end_write(&safe_path);
    res?;
    Ok(())
}

/// Suppression définitive avec protection WriteGuard.
pub fn delete_path_with_guard(
    vault_root: &Path,
    rel_path: &str,
    guard: &WriteGuard,
) -> Result<()> {
    let safe_path = resolve_safe_path(vault_root, rel_path)?;
    if !safe_path.exists() {
        return Err(KnitError::Custom(format!(
            "Chemin introuvable : {}",
            rel_path
        )));
    }
    let prior = if safe_path.is_file() {
        fs::read(&safe_path).unwrap_or_default()
    } else {
        Vec::new()
    };
    guard.begin_write(&safe_path, &prior);
    let res = if safe_path.is_dir() {
        fs::remove_dir_all(&safe_path)
    } else {
        fs::remove_file(&safe_path)
    };
    guard.end_write(&safe_path);
    res?;
    Ok(())
}
