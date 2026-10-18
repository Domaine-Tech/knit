use crate::error::{KnitError, Result};
use std::fs;
use std::path::Path;

/// Calcule l'empreinte BLAKE3 en chaîne hexadécimale.
pub fn compute_blake3_hash(data: &[u8]) -> String {
    let hash = blake3::hash(data);
    hash.to_hex().to_string()
}

/// Calcule l'empreinte BLAKE3 d'un fichier sur disque.
pub fn compute_file_blake3(path: &Path) -> Result<String> {
    let bytes = fs::read(path).map_err(KnitError::Io)?;
    Ok(compute_blake3_hash(&bytes))
}
