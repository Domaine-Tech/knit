//! Manifeste de réplication : liste des fichiers synchronisables d'un coffre.

use crate::error::{KnitError, Result};
use crate::network::protocol::ManifestEntry;
use crate::vault::share::is_syncable_rel;
use crate::watcher::guard::WriteGuard;
use std::fs;
use std::path::Path;
use walkdir::WalkDir;
use xxhash_rust::xxh3::xxh3_64;

pub fn build_manifest(vault_root: &Path) -> Result<Vec<ManifestEntry>> {
    let mut entries = Vec::new();
    if !vault_root.exists() {
        return Ok(entries);
    }
    for item in WalkDir::new(vault_root).into_iter().filter_map(|e| e.ok()) {
        if !item.file_type().is_file() {
            continue;
        }
        if item.path().components().any(|c| {
            let name = c.as_os_str().to_string_lossy();
            name == ".knit" || name == ".git" || name == "node_modules" || name == "target"
        }) {
            continue;
        }
        let rel = match item.path().strip_prefix(vault_root) {
            Ok(p) => p.to_string_lossy().replace('\\', "/"),
            Err(_) => continue,
        };
        if !is_syncable_rel(&rel) {
            continue;
        }
        let bytes = fs::read(item.path()).map_err(KnitError::Io)?;
        entries.push(ManifestEntry {
            rel_path: rel,
            size: bytes.len() as u64,
            xxh3: format!("{:016x}", xxh3_64(&bytes)),
        });
    }
    entries.sort_by(|a, b| {
        let a_share = a.rel_path == ".knitshare";
        let b_share = b.rel_path == ".knitshare";
        b_share.cmp(&a_share).then(a.rel_path.cmp(&b.rel_path))
    });
    Ok(entries)
}

pub fn read_syncable_file(vault_root: &Path, rel: &str) -> Result<Vec<u8>> {
    let path = safe_sync_path(vault_root, rel)?;
    fs::read(&path).map_err(KnitError::Io)
}

pub fn write_replicated_file(
    vault_root: &Path,
    rel: &str,
    bytes: &[u8],
    guard: &WriteGuard,
) -> Result<()> {
    let path = safe_sync_path(vault_root, rel)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(KnitError::Io)?;
    }
    guard.begin_write(&path, bytes);
    let result = fs::write(&path, bytes).map_err(KnitError::Io);
    guard.end_write(&path);
    result
}

pub fn file_xxh3_hex(bytes: &[u8]) -> String {
    format!("{:016x}", xxh3_64(bytes))
}

fn safe_sync_path(vault_root: &Path, rel: &str) -> Result<std::path::PathBuf> {
    if !is_syncable_rel(rel) {
        return Err(KnitError::Vault(format!("Chemin non réplicable: {rel}")));
    }
    let mut path = vault_root.to_path_buf();
    for part in rel.split('/') {
        if part.is_empty() || part == "." || part == ".." {
            return Err(KnitError::Vault(format!("Chemin non réplicable: {rel}")));
        }
        path.push(part);
    }
    Ok(path)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn manifest_skips_knit_dir() {
        let dir = tempdir().unwrap();
        fs::create_dir_all(dir.path().join(".knit/identity")).unwrap();
        fs::write(dir.path().join(".knit/identity/keypair.bin"), [1u8; 32]).unwrap();
        fs::write(dir.path().join(".knitshare"), "nom: \"A\"\nid: \"abc\"\n").unwrap();
        fs::write(dir.path().join("accueil.md"), "# A\n").unwrap();
        let manifest = build_manifest(dir.path()).unwrap();
        let paths: Vec<_> = manifest.iter().map(|e| e.rel_path.as_str()).collect();
        assert!(paths.contains(&".knitshare"));
        assert!(paths.contains(&"accueil.md"));
        assert!(paths.iter().all(|p| !p.starts_with(".knit/")));
    }
}
