use crate::error::{KnitError, Result};
use crate::vault::identity::{load_or_generate_identity, UserProfile};
use base64::Engine;
use ed25519_dalek::{Signature, Signer, SigningKey, Verifier, VerifyingKey};
use iroh::PublicKey;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::str::FromStr;
use std::time::{SystemTime, UNIX_EPOCH};

pub const MAX_SNAPSHOTS_PER_DOC: usize = 50;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SnapshotAuthor {
    pub peer_id: String,
    pub display_name: String,
    pub email: String,
    pub role: String,
    pub ed25519_signature: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DocSnapshot {
    pub snapshot_id: String,
    pub doc_id: String,
    pub state_vector_base64: String,
    pub yjs_snapshot_base64: String,
    pub created_at_sec: u64,
    pub author: SnapshotAuthor,
}

/// Calcule le payload canonique signé pour un snapshot Yjs
pub fn compute_snapshot_payload(
    doc_id: &str,
    snapshot_id: &str,
    created_at_sec: u64,
    state_vector_base64: &str,
    yjs_snapshot_base64: &str,
) -> Vec<u8> {
    format!(
        "{}:{}:{}:{}:{}",
        doc_id, snapshot_id, created_at_sec, state_vector_base64, yjs_snapshot_base64
    )
    .into_bytes()
}

/// Signe un payload de snapshot avec la clé secrète Ed25519
pub fn sign_snapshot_payload(secret_key: &iroh::SecretKey, payload: &[u8]) -> String {
    let key_bytes = secret_key.to_bytes();
    let signing_key = SigningKey::from_bytes(&key_bytes);
    let signature = signing_key.sign(payload);
    base64::engine::general_purpose::STANDARD.encode(signature.to_bytes())
}

/// Vérifie l'authenticité et l'intégrité cryptographique d'un snapshot signé
pub fn verify_snapshot_signature(snapshot: &DocSnapshot) -> Result<bool> {
    let sig_bytes = base64::engine::general_purpose::STANDARD
        .decode(&snapshot.author.ed25519_signature)
        .map_err(|e| KnitError::Vault(format!("Signature base64 invalide: {}", e)))?;

    if sig_bytes.len() != 64 {
        return Ok(false);
    }

    let mut sig_arr = [0u8; 64];
    sig_arr.copy_from_slice(&sig_bytes);
    let signature = Signature::from_bytes(&sig_arr);

    // Décodage de la clé publique de l'auteur
    let pubkey = PublicKey::from_str(&snapshot.author.peer_id)
        .map_err(|e| KnitError::Vault(format!("Clé publique invalide: {}", e)))?;

    let verifying_key = VerifyingKey::from_bytes(pubkey.as_bytes())
        .map_err(|e| KnitError::Vault(format!("Clé ed25519 invalide: {}", e)))?;

    let payload = compute_snapshot_payload(
        &snapshot.doc_id,
        &snapshot.snapshot_id,
        snapshot.created_at_sec,
        &snapshot.state_vector_base64,
        &snapshot.yjs_snapshot_base64,
    );

    Ok(verifying_key.verify(&payload, &signature).is_ok())
}

/// Génère le chemin du dossier de snapshots pour un document donné dans `.knit/snapshots/`
pub fn get_snapshots_dir(vault_root: &Path, doc_id: &str) -> Result<PathBuf> {
    let clean_doc = doc_id.trim_start_matches(['/', '\\']);
    // Évite les caractères réservés ou séparateurs
    let sanitized_slug = clean_doc.replace(['/', '\\'], "__");
    let snapshots_base = vault_root.join(".knit").join("snapshots").join(sanitized_slug);
    if !snapshots_base.exists() {
        fs::create_dir_all(&snapshots_base).map_err(KnitError::Io)?;
    }
    Ok(snapshots_base)
}

/// Crée, signe et enregistre un snapshot dans `.knit/snapshots/`
pub fn create_and_save_snapshot(
    vault_root: &Path,
    doc_id: &str,
    state_vector_base64: &str,
    yjs_snapshot_base64: &str,
    profile: &UserProfile,
) -> Result<DocSnapshot> {
    let secret_key = load_or_generate_identity(vault_root)?;
    let peer_id = secret_key.public().to_string();

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    let snapshot_id = format!("snap-{}-{}", now, fast_rand_id());

    let payload = compute_snapshot_payload(
        doc_id,
        &snapshot_id,
        now,
        state_vector_base64,
        yjs_snapshot_base64,
    );

    let signature = sign_snapshot_payload(&secret_key, &payload);

    let author = SnapshotAuthor {
        peer_id,
        display_name: profile.display_name.clone(),
        email: profile.email.clone(),
        role: profile.role.clone(),
        ed25519_signature: signature,
    };

    let snapshot = DocSnapshot {
        snapshot_id: snapshot_id.clone(),
        doc_id: doc_id.to_string(),
        state_vector_base64: state_vector_base64.to_string(),
        yjs_snapshot_base64: yjs_snapshot_base64.to_string(),
        created_at_sec: now,
        author,
    };

    let dir = get_snapshots_dir(vault_root, doc_id)?;
    let file_path = dir.join(format!("{}.json", snapshot_id));

    let json_bytes = serde_json::to_vec_pretty(&snapshot)
        .map_err(|e| KnitError::Vault(format!("Erreur sérialisation snapshot: {}", e)))?;

    fs::write(&file_path, json_bytes).map_err(KnitError::Io)?;

    // Compaction & bornage de l'espace disque (pruning des anciens snapshots au-delà de la limite)
    prune_old_snapshots(&dir, MAX_SNAPSHOTS_PER_DOC)?;

    Ok(snapshot)
}

/// Prune les snapshots les plus anciens d'un document si leur nombre dépasse `max_keep`
pub fn prune_old_snapshots(dir: &Path, max_keep: usize) -> Result<usize> {
    if !dir.is_dir() {
        return Ok(0);
    }

    let mut entries = Vec::new();
    for entry in fs::read_dir(dir).map_err(KnitError::Io)? {
        let entry = entry.map_err(KnitError::Io)?;
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) == Some("json") {
            if let Ok(metadata) = entry.metadata() {
                let modified = metadata.modified().unwrap_or(SystemTime::UNIX_EPOCH);
                entries.push((path, modified));
            }
        }
    }

    if entries.len() <= max_keep {
        return Ok(0);
    }

    // Trier du plus récent au plus ancien
    entries.sort_by_key(|a| std::cmp::Reverse(a.1));

    let to_remove = &entries[max_keep..];
    let mut pruned = 0;
    for (path, _) in to_remove {
        if fs::remove_file(path).is_ok() {
            pruned += 1;
        }
    }

    Ok(pruned)
}

/// Liste les snapshots enregistrés pour un document donné
pub fn list_snapshots_for_doc(vault_root: &Path, doc_id: &str) -> Result<Vec<DocSnapshot>> {
    let dir = match get_snapshots_dir(vault_root, doc_id) {
        Ok(d) => d,
        Err(_) => return Ok(Vec::new()),
    };

    let mut snapshots = Vec::new();
    if !dir.exists() {
        return Ok(snapshots);
    }

    for entry in fs::read_dir(&dir).map_err(KnitError::Io)? {
        let entry = entry.map_err(KnitError::Io)?;
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) == Some("json") {
            if let Ok(bytes) = fs::read(&path) {
                if let Ok(snap) = serde_json::from_slice::<DocSnapshot>(&bytes) {
                    snapshots.push(snap);
                }
            }
        }
    }

    // Trier par date décroissante
    snapshots.sort_by_key(|a| std::cmp::Reverse(a.created_at_sec));
    Ok(snapshots)
}

/// Charge le dernier snapshot valide d'un document
pub fn load_latest_snapshot(vault_root: &Path, doc_id: &str) -> Result<Option<DocSnapshot>> {
    let snapshots = list_snapshots_for_doc(vault_root, doc_id)?;
    Ok(snapshots.into_iter().next())
}

fn fast_rand_id() -> String {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    let num: u32 = rng.gen();
    format!("{:08x}", num)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_snapshot_lifecycle_and_signature_verification() {
        let dir = tempdir().expect("tempdir");
        let vault_root = dir.path();

        let profile = UserProfile {
            first_name: "Thomas".to_string(),
            last_name: "H.".to_string(),
            display_name: "Thomas H.".to_string(),
            email: "thomas@example.com".to_string(),
            role: "Architecte Produit".to_string(),
            status_message: "✍️ En rédaction".to_string(),
            share_email_p2p: false,
            avatar: crate::vault::identity::AvatarInfo::default(),
            created_at_sec: 1731840000,
            updated_at_sec: 1731840000,
        };

        let doc_id = "wiki/architecture.md";
        let state_vector = "state_vec_sample_123";
        let yjs_snapshot = "yjs_snapshot_payload_abc_xyz";

        // 1. Création et signature du snapshot
        let snapshot = create_and_save_snapshot(
            vault_root,
            doc_id,
            state_vector,
            yjs_snapshot,
            &profile,
        )
        .expect("create snapshot");

        assert_eq!(snapshot.doc_id, doc_id);
        assert_eq!(snapshot.author.display_name, "Thomas H.");
        assert_eq!(snapshot.author.role, "Architecte Produit");
        assert!(!snapshot.author.ed25519_signature.is_empty());

        // 2. Vérification cryptographique valide
        let is_valid = verify_snapshot_signature(&snapshot).expect("verify signature");
        assert!(is_valid, "La signature ed25519 du snapshot doit être valide");

        // 3. Vérification de détection d'altération (non-répudiation)
        let mut tampered = snapshot.clone();
        tampered.yjs_snapshot_base64 = "corrupted_payload".to_string();
        let is_tampered_valid = verify_snapshot_signature(&tampered).expect("verify signature");
        assert!(!is_tampered_valid, "Un snapshot altéré doit être rejeté");

        // 4. Rechargement depuis le disque
        let latest = load_latest_snapshot(vault_root, doc_id)
            .expect("load latest")
            .expect("must exist");
        assert_eq!(latest.snapshot_id, snapshot.snapshot_id);

        // 5. Test du bornage de l'espace disque (pruning)
        let snap_dir = get_snapshots_dir(vault_root, doc_id).expect("snap dir");
        for _ in 0..10 {
            create_and_save_snapshot(vault_root, doc_id, state_vector, yjs_snapshot, &profile)
                .expect("snap loop");
        }
        let pruned = prune_old_snapshots(&snap_dir, 5).expect("prune");
        assert!(pruned >= 6);
        let remaining = list_snapshots_for_doc(vault_root, doc_id).expect("list");
        assert_eq!(remaining.len(), 5);
    }
}
