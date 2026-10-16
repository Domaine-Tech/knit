use crate::error::{KnitError, Result};
use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;
use iroh::{Endpoint, EndpointAddr};
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

pub const INVITATION_PREFIX: &str = "knit://join/";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct InvitationTicket {
    pub endpoint_addr: EndpointAddr,
    pub vault_name: Option<String>,
    pub created_at_sec: u64,
}

impl InvitationTicket {
    pub fn new(endpoint_addr: EndpointAddr, vault_name: Option<String>) -> Self {
        let created_at_sec = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        Self {
            endpoint_addr,
            vault_name,
            created_at_sec,
        }
    }

    /// Encode le ticket en code d'invitation complet: `knit://join/<base64url>`
    pub fn to_code(&self) -> Result<String> {
        let json_bytes = serde_json::to_vec(self)
            .map_err(|e| KnitError::Network(format!("Erreur de sérialisation du ticket: {}", e)))?;
        let b64 = URL_SAFE_NO_PAD.encode(json_bytes);
        Ok(format!("{}{}", INVITATION_PREFIX, b64))
    }

    /// Décode une chaîne d'invitation (supporte `knit://join/...` ou le base64url brut)
    pub fn from_code(code: &str) -> Result<Self> {
        let trimmed = code.trim();
        let payload = if let Some(stripped) = trimmed.strip_prefix(INVITATION_PREFIX) {
            stripped
        } else {
            trimmed
        };

        let decoded_bytes = URL_SAFE_NO_PAD.decode(payload).map_err(|e| {
            KnitError::Network(format!("Code d'invitation invalide (base64): {}", e))
        })?;

        let ticket: Self = serde_json::from_slice(&decoded_bytes).map_err(|e| {
            KnitError::Network(format!("Contenu du ticket d'invitation invalide: {}", e))
        })?;

        Ok(ticket)
    }

    /// Retourne l'identifiant du pair cible (PublicKey)
    pub fn peer_id(&self) -> String {
        self.endpoint_addr.id.to_string()
    }
}

/// Génère un code d'invitation depuis un endpoint Iroh actif
pub fn create_invitation(endpoint: &Endpoint, vault_name: Option<&str>) -> Result<String> {
    let addr = endpoint.addr();
    let ticket = InvitationTicket::new(addr, vault_name.map(|s| s.to_string()));
    ticket.to_code()
}

#[cfg(test)]
mod tests {
    use super::*;
    use iroh::SecretKey;

    #[tokio::test]
    async fn test_invitation_ticket_lifecycle() {
        let secret = SecretKey::generate();
        let endpoint = Endpoint::builder(iroh::endpoint::presets::N0DisableRelay)
            .secret_key(secret)
            .bind()
            .await
            .expect("bind endpoint");

        let code = create_invitation(&endpoint, Some("Mon Projet Knit")).expect("create invitation");
        assert!(code.starts_with(INVITATION_PREFIX));

        let parsed = InvitationTicket::from_code(&code).expect("parse invitation");
        assert_eq!(parsed.peer_id(), endpoint.id().to_string());
        assert_eq!(parsed.vault_name.as_deref(), Some("Mon Projet Knit"));
    }

    #[test]
    fn test_invalid_invitation_parsing() {
        assert!(InvitationTicket::from_code("knit://join/invalid_base64!!!").is_err());
        assert!(InvitationTicket::from_code("").is_err());
    }
}
