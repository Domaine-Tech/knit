use crate::error::{KnitError, Result};
use crate::vault::hash::compute_blake3_hash;
use iroh::{PublicKey, SecretKey};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};
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

/// Nom affiché tant que la personne n'a pas choisi le sien.
pub const UNNAMED_DISPLAY_NAME: &str = "Collaborateur";

/// Vrai pour un nom vide, le défaut historique « Moi », ou le défaut actuel.
pub fn is_unnamed_display(name: &str) -> bool {
    let trimmed = name.trim();
    trimmed.is_empty() || trimmed == "Moi" || trimmed == UNNAMED_DISPLAY_NAME
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AvatarInfo {
    #[serde(rename = "type")]
    pub avatar_type: String, // "custom" | "initials"
    #[serde(skip_serializing_if = "Option::is_none")]
    pub blake3_hash: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mime_type: Option<String>,
}

impl Default for AvatarInfo {
    fn default() -> Self {
        Self {
            avatar_type: "initials".to_string(),
            blake3_hash: None,
            mime_type: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct UserProfile {
    pub first_name: String,
    pub last_name: String,
    pub display_name: String,
    pub email: String,
    pub role: String,
    pub status_message: String,
    pub share_email_p2p: bool,
    pub avatar: AvatarInfo,
    pub created_at_sec: u64,
    pub updated_at_sec: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct PeerProfileSummary {
    pub first_name: String,
    pub last_name: String,
    pub display_name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub email: Option<String>,
    pub role: String,
    pub status_message: String,
    pub avatar: AvatarInfo,
}

impl PeerProfileSummary {
    pub fn from_profile(profile: &UserProfile) -> Self {
        Self {
            first_name: profile.first_name.clone(),
            last_name: profile.last_name.clone(),
            display_name: profile.display_name.clone(),
            // Privacy Toggle: l'email n'est diffusé en P2P QUE si explicitement consenti
            email: if profile.share_email_p2p && !profile.email.trim().is_empty() {
                Some(profile.email.clone())
            } else {
                None
            },
            role: profile.role.clone(),
            status_message: profile.status_message.clone(),
            avatar: profile.avatar.clone(),
        }
    }
}

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

/// Découpe un nom d'affichage en prénom et nom
pub fn split_display_name(name: &str) -> (String, String) {
    let parts: Vec<&str> = name.split_whitespace().collect();
    if parts.is_empty() {
        ("".to_string(), "".to_string())
    } else if parts.len() == 1 {
        (parts[0].to_string(), "".to_string())
    } else {
        (parts[0].to_string(), parts[1..].join(" "))
    }
}

pub fn vault_identity_dir(vault_root: &Path) -> std::path::PathBuf {
    vault_root.join(".knit").join("identity")
}

/// Lit un profil sans le créer.
pub fn read_profile_in(dir: &Path) -> Result<Option<UserProfile>> {
    let profile_path = dir.join("profile.json");
    if !profile_path.exists() {
        return Ok(None);
    }
    let bytes = fs::read(&profile_path).map_err(KnitError::Io)?;
    match serde_json::from_slice::<UserProfile>(&bytes) {
        Ok(profile) => Ok(Some(profile)),
        Err(_) => Ok(None),
    }
}

/// Charge ou crée un profil dans un dossier d'identité (personne ou coffre legacy).
pub fn load_or_create_profile_in(dir: &Path, default_name: &str) -> Result<UserProfile> {
    if !dir.exists() {
        fs::create_dir_all(dir).map_err(KnitError::Io)?;
    }
    if let Some(profile) = read_profile_in(dir)? {
        return Ok(profile);
    }

    let name = if is_unnamed_display(default_name) {
        UNNAMED_DISPLAY_NAME
    } else {
        default_name.trim()
    };
    let (first, last) = split_display_name(name);
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    let profile = UserProfile {
        first_name: first,
        last_name: last,
        display_name: name.to_string(),
        email: "".to_string(),
        role: "Collaborateur".to_string(),
        status_message: "En rédaction".to_string(),
        share_email_p2p: false,
        avatar: AvatarInfo::default(),
        created_at_sec: now,
        updated_at_sec: now,
    };

    save_profile_in(dir, &profile)?;
    Ok(profile)
}

/// Enregistre le profil dans `dir/profile.json` (sans toucher à Git).
pub fn save_profile_in(dir: &Path, profile: &UserProfile) -> Result<()> {
    if !dir.exists() {
        fs::create_dir_all(dir).map_err(KnitError::Io)?;
    }
    let profile_path = dir.join("profile.json");
    let json_bytes = serde_json::to_vec_pretty(profile)
        .map_err(|e| KnitError::Vault(format!("Erreur d'encodage du profil: {}", e)))?;
    fs::write(&profile_path, json_bytes).map_err(KnitError::Io)?;
    Ok(())
}

/// Charge ou génère la clé Ed25519 dans `dir/keypair.bin`.
pub fn load_or_generate_identity_in(dir: &Path) -> Result<SecretKey> {
    if !dir.exists() {
        fs::create_dir_all(dir).map_err(KnitError::Io)?;
    }
    let key_file = dir.join("keypair.bin");
    if key_file.exists() {
        let bytes = fs::read(&key_file).map_err(KnitError::Io)?;
        if bytes.len() == 32 {
            let mut key_bytes = [0u8; 32];
            key_bytes.copy_from_slice(&bytes);
            return Ok(SecretKey::from_bytes(&key_bytes));
        }
    }
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

/// Charge le profil utilisateur enrichi depuis `<vault>/.knit/identity/profile.json`
/// ou le génère automatiquement avec les conventions par défaut si absent.
pub fn load_or_create_profile(vault_root: &Path, default_name: &str) -> Result<UserProfile> {
    load_or_create_profile_in(&vault_identity_dir(vault_root), default_name)
}

/// Enregistre le profil utilisateur dans `<vault>/.knit/identity/profile.json`
/// et propage éventuellement à la configuration Git locale si un dépôt `.git` existe.
pub fn save_profile(vault_root: &Path, profile: &UserProfile) -> Result<()> {
    save_profile_in(&vault_identity_dir(vault_root), profile)?;
    let _ = configure_vault_git_author(vault_root, &profile.display_name, &profile.email);
    Ok(())
}

/// Enregistre une photo d'avatar personnalisée, calcule son BLAKE3 et met à jour le profil
pub fn save_custom_avatar(
    vault_root: &Path,
    image_bytes: &[u8],
    mime_type: &str,
) -> Result<AvatarInfo> {
    let identity_dir = vault_root.join(".knit").join("identity");
    if !identity_dir.exists() {
        fs::create_dir_all(&identity_dir).map_err(KnitError::Io)?;
    }

    let blake3_hash = compute_blake3_hash(image_bytes);

    // Sauvegarde locale dans .knit/identity/avatar.png
    let avatar_file = identity_dir.join("avatar.png");
    fs::write(&avatar_file, image_bytes).map_err(KnitError::Io)?;

    // Sauvegarde dans le cache blobs des avatars pour distribution P2P immédiate
    let avatars_cache_dir = vault_root.join(".knit").join("cache").join("avatars");
    if !avatars_cache_dir.exists() {
        let _ = fs::create_dir_all(&avatars_cache_dir);
    }
    let cached_file = avatars_cache_dir.join(format!("{}.png", blake3_hash));
    let _ = fs::write(cached_file, image_bytes);

    let avatar_info = AvatarInfo {
        avatar_type: "custom".to_string(),
        blake3_hash: Some(blake3_hash),
        mime_type: Some(mime_type.to_string()),
    };

    // Mettre à jour le profil existant
    if let Ok(mut profile) = load_or_create_profile(vault_root, UNNAMED_DISPLAY_NAME) {
        profile.avatar = avatar_info.clone();
        profile.updated_at_sec = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        let _ = save_profile(vault_root, &profile);
    }

    Ok(avatar_info)
}

/// Supprime l'avatar personnalisé et réinitialise au mode initiales/teintes
pub fn reset_custom_avatar(vault_root: &Path) -> Result<AvatarInfo> {
    let avatar_file = vault_root.join(".knit").join("identity").join("avatar.png");
    if avatar_file.exists() {
        let _ = fs::remove_file(avatar_file);
    }

    let default_avatar = AvatarInfo::default();
    if let Ok(mut profile) = load_or_create_profile(vault_root, UNNAMED_DISPLAY_NAME) {
        profile.avatar = default_avatar.clone();
        profile.updated_at_sec = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        let _ = save_profile(vault_root, &profile);
    }

    Ok(default_avatar)
}

/// Auto-configuration transparente des commits Git (`git config user.name / user.email`)
pub fn configure_vault_git_author(vault_root: &Path, name: &str, email: &str) -> Result<bool> {
    let git_dir = vault_root.join(".git");
    if !git_dir.exists() {
        return Ok(false);
    }

    if !name.trim().is_empty() {
        let _ = std::process::Command::new("git")
            .current_dir(vault_root)
            .args(["config", "user.name", name.trim()])
            .status();
    }

    if !email.trim().is_empty() {
        let _ = std::process::Command::new("git")
            .current_dir(vault_root)
            .args(["config", "user.email", email.trim()])
            .status();
    }

    Ok(true)
}

/// Charge la clé secrète Ed25519 persistée dans `<vault>/.knit/identity/keypair.bin`
/// ou en génère une nouvelle si elle n'existe pas encore.
pub fn load_or_generate_identity(vault_root: &Path) -> Result<SecretKey> {
    load_or_generate_identity_in(&vault_identity_dir(vault_root))
}

/// Avatar canonique dans le dossier personne, copie de distribution dans le cache du coffre.
pub fn save_avatar_in(
    person_dir: &Path,
    vault_root: &Path,
    image_bytes: &[u8],
    mime_type: &str,
) -> Result<AvatarInfo> {
    if !person_dir.exists() {
        fs::create_dir_all(person_dir).map_err(KnitError::Io)?;
    }
    let blake3_hash = compute_blake3_hash(image_bytes);
    fs::write(person_dir.join("avatar.png"), image_bytes).map_err(KnitError::Io)?;

    let avatars_cache_dir = vault_root.join(".knit").join("cache").join("avatars");
    if !avatars_cache_dir.exists() {
        let _ = fs::create_dir_all(&avatars_cache_dir);
    }
    let _ = fs::write(
        avatars_cache_dir.join(format!("{blake3_hash}.png")),
        image_bytes,
    );

    let avatar_info = AvatarInfo {
        avatar_type: "custom".to_string(),
        blake3_hash: Some(blake3_hash),
        mime_type: Some(mime_type.to_string()),
    };

    if let Ok(mut profile) = load_or_create_profile_in(person_dir, UNNAMED_DISPLAY_NAME) {
        profile.avatar = avatar_info.clone();
        profile.updated_at_sec = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        let _ = save_profile_in(person_dir, &profile);
    }
    Ok(avatar_info)
}

pub fn reset_avatar_in(person_dir: &Path) -> Result<AvatarInfo> {
    let avatar_file = person_dir.join("avatar.png");
    if avatar_file.exists() {
        let _ = fs::remove_file(avatar_file);
    }
    let default_avatar = AvatarInfo::default();
    if let Ok(mut profile) = load_or_create_profile_in(person_dir, UNNAMED_DISPLAY_NAME) {
        profile.avatar = default_avatar.clone();
        profile.updated_at_sec = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        let _ = save_profile_in(person_dir, &profile);
    }
    Ok(default_avatar)
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

    #[test]
    fn test_user_profile_and_privacy_toggle() {
        let dir = tempdir().expect("tempdir");
        let vault_root = dir.path();

        // 1. Chargement/création d'un profil par défaut
        let profile = load_or_create_profile(vault_root, "Thomas H.").expect("create profile");
        assert_eq!(profile.display_name, "Thomas H.");
        assert_eq!(profile.first_name, "Thomas");
        assert_eq!(profile.last_name, "H.");
        assert!(!profile.share_email_p2p, "Privacy mode par défaut actif");

        // 2. Mode Zéro-Fuite : l'email ne doit pas fuiter sur le réseau P2P
        let mut modified = profile.clone();
        modified.email = "thomas@example.com".to_string();
        modified.share_email_p2p = false;
        save_profile(vault_root, &modified).expect("save profile");

        let summary = PeerProfileSummary::from_profile(&modified);
        assert_eq!(summary.email, None, "L'email ne doit pas être diffusé en P2P");

        // 3. Mode Partagé activé : l'email est transmis
        modified.share_email_p2p = true;
        let summary_shared = PeerProfileSummary::from_profile(&modified);
        assert_eq!(summary_shared.email, Some("thomas@example.com".to_string()));
    }

    #[test]
    fn test_custom_avatar_blake3_and_reset() {
        let dir = tempdir().expect("tempdir");
        let vault_root = dir.path();

        let image_data = b"FAKE_PNG_BINARY_DATA_FOR_AVATAR";
        let avatar_info = save_custom_avatar(vault_root, image_data, "image/png").expect("save avatar");

        assert_eq!(avatar_info.avatar_type, "custom");
        assert!(avatar_info.blake3_hash.is_some());
        assert_eq!(avatar_info.mime_type.as_deref(), Some("image/png"));

        let hash = avatar_info.blake3_hash.unwrap();
        assert_eq!(hash, compute_blake3_hash(image_data));

        // Vérifier la présence du fichier avatar
        let avatar_path = vault_root.join(".knit").join("identity").join("avatar.png");
        assert!(avatar_path.exists());

        // Réinitialisation de l'avatar
        let reset = reset_custom_avatar(vault_root).expect("reset avatar");
        assert_eq!(reset.avatar_type, "initials");
        assert!(!avatar_path.exists());
    }
}
