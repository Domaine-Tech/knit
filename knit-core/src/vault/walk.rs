use std::path::{Path, PathBuf};
use walkdir::{DirEntry, WalkDir};

use crate::vault::tree::normalize_rel_path;

/// Dossiers exclus du parcours coffre (caches, build, données locales).
pub fn is_ignored_dir_name(name: &str) -> bool {
    name.starts_with('.')
        || name == "target"
        || name == "node_modules"
        || name == "dist"
}

/// Filtre WalkDir : descend dans le coffre en ignorant les dossiers exclus.
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
