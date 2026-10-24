use std::path::{Path, PathBuf};
use walkdir::{DirEntry, WalkDir};

use crate::vault::tree::normalize_rel_path;

/// Artefacts de build : **jamais** dans l'arbre (même avec toggle œil).
///
/// Aligné avec `ALWAYS_EXCLUDED_VAULT_NAMES` dans
/// `knit-app/src/utils/vaultTreeVisibility.ts`.
pub fn is_always_excluded_name(name: &str) -> bool {
    matches!(name, "node_modules" | "target" | "dist")
}

/// Données locales / VCS : listées dans l'arbre (masquées UI par défaut),
/// mais **ignorées** par le File Watcher (évite boucles CRDT / bruit).
pub fn is_watcher_ignored_name(name: &str) -> bool {
    is_always_excluded_name(name) || matches!(name, ".knit" | ".git")
}

/// Dotfile / dossier point (présent dans l'arbre ; masqué UI par défaut).
pub fn is_dot_entry_name(name: &str) -> bool {
    name.starts_with('.')
}

/// Dossiers exclus du parcours d'**index** Markdown (pas des notes utilisateur).
/// Build + tous les dossiers point (`.knit`, `.cursor`, `.agents`…).
pub fn is_ignored_dir_name(name: &str) -> bool {
    is_always_excluded_name(name) || is_dot_entry_name(name)
}

/// Filtre WalkDir d'index : descend en ignorant exclusion absolue + dots.
pub fn should_descend(entry: &DirEntry) -> bool {
    if entry.depth() == 0 {
        return true;
    }
    let name = entry.file_name().to_string_lossy();
    !is_ignored_dir_name(&name)
}

#[derive(Debug, Clone)]
pub struct VaultMdFile {
    pub path: PathBuf,
    pub rel_path: String,
    pub file_name: String,
}

fn is_markdown_file(path: &Path, file_name: &str, include_knit_md: bool) -> bool {
    let ext = path
        .extension()
        .map(|e| e.to_string_lossy().to_lowercase());
    if ext.as_deref() == Some("md") || ext.as_deref() == Some("markdown") {
        return true;
    }
    include_knit_md && file_name == "KNIT.md"
}

/// Itère les fichiers Markdown du coffre (`.md` / `.markdown`, optionnellement `KNIT.md`).
pub fn iter_vault_md_files(
    vault_root: &Path,
    include_knit_md: bool,
) -> impl Iterator<Item = VaultMdFile> + '_ {
    let root = vault_root.to_path_buf();
    WalkDir::new(vault_root)
        .follow_links(false)
        .into_iter()
        .filter_entry(should_descend)
        .filter_map(move |entry| {
            let entry = entry.ok()?;
            if !entry.file_type().is_file() {
                return None;
            }
            let path = entry.path().to_path_buf();
            let file_name = entry.file_name().to_string_lossy().to_string();
            if !is_markdown_file(&path, &file_name, include_knit_md) {
                return None;
            }
            let rel_path = match path.strip_prefix(&root) {
                Ok(p) => normalize_rel_path(p),
                Err(_) => normalize_rel_path(&path),
            };
            Some(VaultMdFile {
                path,
                rel_path,
                file_name,
            })
        })
}
