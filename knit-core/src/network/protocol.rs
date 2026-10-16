use crate::error::{KnitError, Result};
use serde::{Deserialize, Serialize};
use tokio::io::{AsyncRead, AsyncReadExt, AsyncWrite, AsyncWriteExt};

pub const ALPN_SYNC: &[u8] = b"/knit/sync/1";
pub const ALPN_BLOBS: &[u8] = b"/knit/blobs/1";

/// Limite maximale par trame réseau (16 Mo) pour parer aux attaques par déni de mémoire
pub const MAX_FRAME_SIZE: u32 = 16 * 1024 * 1024;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "type", content = "payload")]
pub enum KnitSyncMessage {
    Handshake {
        peer_id: String,
        display_name: String,
        vault_name: Option<String>,
        version: String,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        profile: Option<crate::vault::identity::PeerProfileSummary>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        endpoint_addr: Option<iroh::EndpointAddr>,
    },
    HandshakeAck {
        peer_id: String,
        display_name: String,
        vault_name: Option<String>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        profile: Option<crate::vault::identity::PeerProfileSummary>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        endpoint_addr: Option<iroh::EndpointAddr>,
    },
    ProfileUpdate {
        profile: crate::vault::identity::PeerProfileSummary,
    },
    SyncStep1 {
        doc_id: String,
        #[serde(with = "serde_bytes")]
        state_vector: Vec<u8>,
    },
    SyncStep2 {
        doc_id: String,
        #[serde(with = "serde_bytes")]
        update: Vec<u8>,
    },
    YjsUpdate {
        doc_id: String,
        #[serde(with = "serde_bytes")]
        update: Vec<u8>,
    },
    YjsAwareness {
        doc_id: String,
        #[serde(with = "serde_bytes")]
        awareness: Vec<u8>,
    },
    Ping {
        timestamp_ms: u64,
    },
    Pong {
        timestamp_ms: u64,
    },
}

/// Écrit une trame préfixée par sa longueur (4 octets big-endian) sur un stream QUIC asynchrone
pub async fn write_sync_frame<W>(writer: &mut W, msg: &KnitSyncMessage) -> Result<()>
where
    W: AsyncWrite + Unpin,
{
    let encoded = serde_json::to_vec(msg)
        .map_err(|e| KnitError::Network(format!("Erreur d'encodage du message: {}", e)))?;

    if encoded.len() > MAX_FRAME_SIZE as usize {
        return Err(KnitError::Network(format!(
            "Trame trop volumineuse: {} octets (max {})",
            encoded.len(),
            MAX_FRAME_SIZE
        )));
    }

    let len = encoded.len() as u32;
    writer.write_all(&len.to_be_bytes()).await.map_err(|e| {
        KnitError::Network(format!("Erreur d'écriture de la taille de trame: {}", e))
    })?;

    writer.write_all(&encoded).await.map_err(|e| {
        KnitError::Network(format!("Erreur d'écriture du corps de trame: {}", e))
    })?;

    writer
        .flush()
        .await
        .map_err(|e| KnitError::Network(format!("Erreur de flush du stream: {}", e)))?;

    Ok(())
}

/// Lit une trame préfixée par sa longueur (4 octets big-endian) depuis un stream QUIC asynchrone
pub async fn read_sync_frame<R>(reader: &mut R) -> Result<KnitSyncMessage>
where
    R: AsyncRead + Unpin,
{
    let mut len_bytes = [0u8; 4];
    reader.read_exact(&mut len_bytes).await.map_err(|e| {
        if e.kind() == std::io::ErrorKind::UnexpectedEof {
            KnitError::Network("Fin de stream inattendue (connexion fermée)".to_string())
        } else {
            KnitError::Network(format!("Erreur de lecture de taille de trame: {}", e))
        }
    })?;

    let len = u32::from_be_bytes(len_bytes);
    if len > MAX_FRAME_SIZE {
        return Err(KnitError::Network(format!(
            "Taille de trame invalide: {} octets (max {})",
            len, MAX_FRAME_SIZE
        )));
    }

    let mut buf = vec![0u8; len as usize];
    reader
        .read_exact(&mut buf)
        .await
        .map_err(|e| KnitError::Network(format!("Erreur de lecture du corps de trame: {}", e)))?;

    let msg = serde_json::from_slice(&buf)
        .map_err(|e| KnitError::Network(format!("Erreur de décodage JSON: {}", e)))?;

    Ok(msg)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Cursor;

    #[tokio::test]
    async fn test_frame_roundtrip() {
        let msg = KnitSyncMessage::YjsUpdate {
            doc_id: "notes/accueil.md".to_string(),
            update: vec![1, 2, 3, 4, 5, 42, 255],
        };

        let mut buffer = Vec::new();
        write_sync_frame(&mut buffer, &msg).await.expect("write frame");

        assert!(buffer.len() > 4);

        let mut cursor = Cursor::new(buffer);
        let decoded = read_sync_frame(&mut cursor).await.expect("read frame");

        assert_eq!(msg, decoded);
    }

    #[tokio::test]
    async fn test_handshake_roundtrip() {
        let msg = KnitSyncMessage::Handshake {
            peer_id: "node_test_123".to_string(),
            display_name: "Thomas".to_string(),
            vault_name: Some("Mon Super Coffre".to_string()),
            version: "0.2.0".to_string(),
            profile: None,
            endpoint_addr: None,
        };

        let mut buffer = Vec::new();
        write_sync_frame(&mut buffer, &msg).await.expect("write");

        let mut cursor = Cursor::new(buffer);
        let decoded = read_sync_frame(&mut cursor).await.expect("read");

        assert_eq!(msg, decoded);
    }
}
