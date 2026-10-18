use std::fs;
use std::path::Path;

use crate::error::{KnitError, Result};

use super::path::resolve_safe_path;

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

    let prior = if safe_old.is_file() {
        fs::read(&safe_old).unwrap_or_default()
    } else {
        Vec::new()
    };
    guard.begin_write(&safe_old, &prior);
    guard.begin_write(&safe_new, &prior);
    let rename_res = fs::rename(&safe_old, &safe_new);
    guard.end_write(&safe_old);
    guard.end_write(&safe_new);
    rename_res?;

    // Refactorise automatiquement tous les liens dans le coffre
    let report = crate::markdown::refactor_links_in_vault(vault_root, old_rel_path, new_rel_path, guard)?;
    Ok(report)
}
