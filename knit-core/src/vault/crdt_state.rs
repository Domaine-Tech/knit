//! État Yjs persistant pour un fichier qui n'est pas ouvert dans l'éditeur.

use crate::error::{KnitError, Result};
use std::fs;
use std::path::{Path, PathBuf};

pub fn crdt_state_path(vault_root: &Path, doc_id: &str) -> Result<PathBuf> {
    let clean = doc_id.trim().trim_start_matches(['/', '\\']);
    if clean.is_empty() || clean.contains("..") {
        return Err(KnitError::Vault(format!("doc_id invalide: {doc_id}")));
    }
    let slug = clean.replace(['/', '\\'], "__");
    let dir = vault_root.join(".knit").join("crdt-state");
    fs::create_dir_all(&dir).map_err(KnitError::Io)?;
    Ok(dir.join(format!("{slug}.bin")))
}

pub fn store_crdt_state(vault_root: &Path, doc_id: &str, bytes: &[u8]) -> Result<()> {
    let path = crdt_state_path(vault_root, doc_id)?;
    fs::write(path, bytes).map_err(KnitError::Io)
}

pub fn load_crdt_state(vault_root: &Path, doc_id: &str) -> Result<Option<Vec<u8>>> {
    let path = crdt_state_path(vault_root, doc_id)?;
    if !path.exists() {
        return Ok(None);
    }
    let bytes = fs::read(path).map_err(KnitError::Io)?;
    if bytes.is_empty() {
        Ok(None)
    } else {
        Ok(Some(bytes))
    }
}
