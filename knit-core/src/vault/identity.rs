use crate::error::{KnitError, Result};
use iroh::{PublicKey, SecretKey};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use xxhash_rust::xxh3::xxh3_64;

/// Les 10 teintes collaboratives sobres définies dans docs/UI_UX.md
pub const COLLABORATIVE_PALETTE: [&str; 10] = [
    "#3B82F6", // 0: Bleu Ardoise
    "#10B981", // 1: Émeraude Sauge
    "#D97706", // 2: Ambre Doré
    "#E11D48", // 3: Terre Cuite
    "#0891B2", // 4: Cyan Pétrole
    "#6366F1", // 5: Indigo Feutré
    "#DB2777", // 6: Rose Poudré
    "#C2410C", // 7: Cuivre Foncé
    "#0D9488", // 8: Vert Menthe
    "#9333EA", // 9: Lavande Douce
];

/// Couleur réservée aux agents IA externes (Cursor, Claude Code)
pub const AI_AGENT_COLOR: &str = "#8B5CF6";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct PeerIdentity {
    pub peer_id: String,
    pub display_name: String,
    pub color_index: usize,
    pub color_hex: String,
    pub initials: String,
}

impl PeerIdentity {
    pub fn from_public_key(public_key: &PublicKey, display_name: &str) -> Self {
        let peer_id = public_key.to_string();
        let color_index = compute_deterministic_color_index(&peer_id);
        let color_hex = COLLABORATIVE_PALETTE[color_index].to_string();
        let initials = compute_initials(display_name);

        Self {
            peer_id,
            display_name: display_name.to_string(),
            color_index,
            color_hex,
            initials,
        }
    }
}

/// Calcule l'indice de couleur (0..10) de manière stable et déterministe par hash(peer_id) % 10
pub fn compute_deterministic_color_index(peer_id: &str) -> usize {
    (xxh3_64(peer_id.as_bytes()) % 10) as usize
}

/// Extrait 2 initiales majuscules à partir d'un nom (ex: "Thomas H" -> "TH", "Alice" -> "AL")
pub fn compute_initials(name: &str) -> String {
    let words: Vec<&str> = name.split_whitespace().collect();
    if words.is_empty() {
        return "AN".to_string(); // Anonyme
    }
    if words.len() == 1 {
        let chars: Vec<char> = words[0].chars().collect();
        if chars.len() >= 2 {
            format!("{}{}", chars[0].to_ascii_uppercase(), chars[1].to_ascii_uppercase())
        } else if !chars.is_empty() {
            format!("{}X", chars[0].to_ascii_uppercase())
        } else {
            "AN".to_string()
        }
    } else {
        let first = words[0].chars().next().unwrap_or('A').to_ascii_uppercase();
        let last = words[words.len() - 1].chars().next().unwrap_or('B').to_ascii_uppercase();
        format!("{}{}", first, last)
    }
}

/// Charge la clé secrète Ed25519 persistée dans `<vault>/.knit/identity/keypair.bin`
/// ou en génère une nouvelle si elle n'existe pas encore.
pub fn load_or_generate_identity(vault_root: &Path) -> Result<SecretKey> {
    let identity_dir = vault_root.join(".knit").join("identity");
    if !identity_dir.exists() {
        fs::create_dir_all(&identity_dir).map_err(KnitError::Io)?;
    }

    let key_file = identity_dir.join("keypair.bin");
    if key_file.exists() {
        let bytes = fs::read(&key_file).map_err(KnitError::Io)?;
        if bytes.len() == 32 {
            let mut key_bytes = [0u8; 32];
            key_bytes.copy_from_slice(&bytes);
            return Ok(SecretKey::from_bytes(&key_bytes));
        }
    }

    // Génération d'une nouvelle clé Ed25519
    let secret = SecretKey::generate();
    let bytes = secret.to_bytes();
    fs::write(&key_file, bytes).map_err(KnitError::Io)?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = fs::set_permissions(&key_file, fs::Permissions::from_mode(0o600));
    }

    Ok(secret)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_identity_generation_and_persistence() {
        let dir = tempdir().expect("tempdir");
        let vault_root = dir.path();

        // 1. Première exécution: génération de la clé
        let key1 = load_or_generate_identity(vault_root).expect("generate identity");
        let pub1 = key1.public();
        let key_file = vault_root.join(".knit").join("identity").join("keypair.bin");
        assert!(key_file.exists());
        let file_bytes = std::fs::read(&key_file).expect("read key file");
        assert_eq!(file_bytes.len(), 32);

        // 2. Deuxième exécution: rechargement de la même clé
        let key2 = load_or_generate_identity(vault_root).expect("reload identity");
        let pub2 = key2.public();
        assert_eq!(pub1, pub2, "L'identité rechargée doit être strictement identique");
    }

    #[test]
    fn test_collaborator_color_stability() {
        let key = SecretKey::generate();
        let pubkey = key.public();
        let identity = PeerIdentity::from_public_key(&pubkey, "Thomas H");

        assert_eq!(identity.initials, "TH");
        assert!(identity.color_index < 10);
        assert_eq!(identity.color_hex, COLLABORATIVE_PALETTE[identity.color_index]);

        // Vérifier la stabilité du hash
        let color_index_again = compute_deterministic_color_index(&identity.peer_id);
        assert_eq!(identity.color_index, color_index_again);
    }

    #[test]
    fn test_initials_computation() {
        assert_eq!(compute_initials("Thomas H"), "TH");
        assert_eq!(compute_initials("Alice"), "AL");
        assert_eq!(compute_initials("Bob Martin Dupont"), "BD");
        assert_eq!(compute_initials("X"), "XX");
        assert_eq!(compute_initials(""), "AN");
    }
}
