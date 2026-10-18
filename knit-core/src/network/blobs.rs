use crate::error::{KnitError, Result};
use crate::vault::tree::resolve_safe_path;
use crate::watcher::guard::WriteGuard;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use tokio::io::{AsyncRead, AsyncReadExt, AsyncWrite, AsyncWriteExt};

pub use crate::vault::hash::{compute_blake3_hash, compute_file_blake3};

pub const MAX_BLOB_FRAME_SIZE: u32 = 32 * 1024 * 1024; // 32 Mo max par blob

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "type", content = "payload")]
pub enum BlobMessage {
    RequestBlob {
        blake3_hash: String,
        rel_path: String,
    },
    ResponseBlob {
        blake3_hash: String,
        rel_path: String,
        #[serde(with = "serde_bytes")]
        data: Vec<u8>,
    },
    AnnounceBlob {
        blake3_hash: String,
        rel_path: String,
    },
    NotFound {
        blake3_hash: String,
        rel_path: String,
    },
}

/// Écrit une trame de média BLAKE3 sur un stream QUIC
pub async fn write_blob_frame<W>(writer: &mut W, msg: &BlobMessage) -> Result<()>
where
    W: AsyncWrite + Unpin,
{
    let encoded = serde_json::to_vec(msg)
        .map_err(|e| KnitError::Network(format!("Erreur d'encodage du blob: {}", e)))?;

    if encoded.len() > MAX_BLOB_FRAME_SIZE as usize {
        return Err(KnitError::Network(format!(
            "Trame de blob trop grande: {} octets (max {})",
            encoded.len(),
            MAX_BLOB_FRAME_SIZE
        )));
    }

    let len = encoded.len() as u32;
    writer.write_all(&len.to_be_bytes()).await.map_err(|e| {
        KnitError::Network(format!("Erreur écriture longueur trame blob: {}", e))
    })?;

    writer.write_all(&encoded).await.map_err(|e| {
        KnitError::Network(format!("Erreur écriture corps trame blob: {}", e))
    })?;

    writer
        .flush()
        .await
        .map_err(|e| KnitError::Network(format!("Erreur flush blob: {}", e)))?;

    Ok(())
}

/// Lit une trame de média BLAKE3 depuis un stream QUIC
pub async fn read_blob_frame<R>(reader: &mut R) -> Result<BlobMessage>
where
    R: AsyncRead + Unpin,
{
    let mut len_bytes = [0u8; 4];
    reader.read_exact(&mut len_bytes).await.map_err(|e| {
        KnitError::Network(format!("Erreur lecture longueur trame blob: {}", e))
    })?;

    let len = u32::from_be_bytes(len_bytes);
    if len > MAX_BLOB_FRAME_SIZE {
        return Err(KnitError::Network(format!(
            "Trame de blob trop grande reçue: {} octets",
            len
        )));
    }

    let mut buf = vec![0u8; len as usize];
    reader
        .read_exact(&mut buf)
        .await
        .map_err(|e| KnitError::Network(format!("Erreur lecture corps trame blob: {}", e)))?;

    let msg = serde_json::from_slice(&buf)
        .map_err(|e| KnitError::Network(format!("Erreur décodage JSON blob: {}", e)))?;

    Ok(msg)
}

/// Traite une requête de blob entrante pour un coffre local et produit le message de réponse
pub fn handle_blob_request(vault_root: &Path, rel_path: &str, requested_hash: &str) -> BlobMessage {
    // 1. Vérifier si l'empreinte demandée correspond à l'avatar local de l'utilisateur
    let local_avatar = vault_root.join(".knit").join("identity").join("avatar.png");
    if local_avatar.is_file() {
        if let Ok(data) = fs::read(&local_avatar) {
            if compute_blake3_hash(&data) == requested_hash {
                return BlobMessage::ResponseBlob {
                    blake3_hash: requested_hash.to_string(),
                    rel_path: rel_path.to_string(),
                    data,
                };
            }
        }
    }

    // 2. Vérifier si l'avatar est présent dans le cache décentralisé .knit/cache/avatars/
    let cached_avatar = vault_root
        .join(".knit")
        .join("cache")
        .join("avatars")
        .join(format!("{}.png", requested_hash));
    if cached_avatar.is_file() {
        if let Ok(data) = fs::read(&cached_avatar) {
            if compute_blake3_hash(&data) == requested_hash {
                return BlobMessage::ResponseBlob {
                    blake3_hash: requested_hash.to_string(),
                    rel_path: rel_path.to_string(),
                    data,
                };
            }
        }
    }

    // 3. Traitement standard des assets et pièces jointes du coffre
    let safe_path = match resolve_safe_path(vault_root, rel_path) {
        Ok(p) => p,
        Err(_) => return BlobMessage::NotFound {
            blake3_hash: requested_hash.to_string(),
            rel_path: rel_path.to_string(),
        },
    };

    if !safe_path.is_file() {
        return BlobMessage::NotFound {
            blake3_hash: requested_hash.to_string(),
            rel_path: rel_path.to_string(),
        };
    }

    match fs::read(&safe_path) {
        Ok(data) => {
            let actual_hash = compute_blake3_hash(&data);
            if actual_hash == requested_hash {
                BlobMessage::ResponseBlob {
                    blake3_hash: actual_hash,
                    rel_path: rel_path.to_string(),
                    data,
                }
            } else {
                BlobMessage::NotFound {
                    blake3_hash: requested_hash.to_string(),
                    rel_path: rel_path.to_string(),
                }
            }
        }
        Err(_) => BlobMessage::NotFound {
            blake3_hash: requested_hash.to_string(),
            rel_path: rel_path.to_string(),
        },
    }
}

/// Enregistre un blob reçu après vérification de son empreinte BLAKE3
pub fn store_verified_blob(
    vault_root: &Path,
    rel_path: &str,
    expected_hash: &str,
    data: &[u8],
    guard: Option<&WriteGuard>,
) -> Result<()> {
    let actual_hash = compute_blake3_hash(data);
    if actual_hash != expected_hash {
        return Err(KnitError::Network(format!(
            "Intégrité BLAKE3 compromise pour {}: attendu {}, obtenu {}",
            rel_path, expected_hash, actual_hash
        )));
    }

    let target_path = resolve_safe_path(vault_root, rel_path)?;
    if let Some(parent) = target_path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(KnitError::Io)?;
        }
    }

    if let Some(g) = guard {
        g.begin_write(&target_path, data);
    }

    fs::write(&target_path, data).map_err(KnitError::Io)?;

    if let Some(g) = guard {
        g.end_write(&target_path);
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Cursor;
    use tempfile::tempdir;

    #[test]
    fn test_blake3_hash_and_verification() {
        let data = b"Image PNG binaire de test pour Knit P2P";
        let hash = compute_blake3_hash(data);
        assert_eq!(hash.len(), 64); // 32 octets en hex

        let dir = tempdir().expect("tempdir");
        let vault_root = dir.path();

        // Stockage réussi avec hash valide
        store_verified_blob(vault_root, "assets/test.png", &hash, data, None)
            .expect("store verified");

        let saved = fs::read(vault_root.join("assets/test.png")).expect("read saved");
        assert_eq!(saved, data);

        // Échec avec données altérées
        let corrupted = b"Image corrompue";
        let err = store_verified_blob(vault_root, "assets/fail.png", &hash, corrupted, None);
        assert!(err.is_err(), "Le hash invalide doit être rejeté");
    }

    #[tokio::test]
    async fn test_blob_frame_roundtrip() {
        let msg = BlobMessage::ResponseBlob {
            blake3_hash: "abcd1234ef567890".to_string(),
            rel_path: "assets/diagram.png".to_string(),
            data: vec![10, 20, 30, 40, 50],
        };

        let mut buf = Vec::new();
        write_blob_frame(&mut buf, &msg).await.expect("write");

        let mut cursor = Cursor::new(buf);
        let read = read_blob_frame(&mut cursor).await.expect("read");

        assert_eq!(msg, read);
    }
}
