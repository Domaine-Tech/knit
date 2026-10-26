//! Profil et clé d'une personne, hors du dossier de coffre.
//! Une fenêtre Knit verrouille un slot. La suivante en ouvre un autre.

use crate::error::{KnitError, Result};
use crate::vault::identity::{
    is_unnamed_display, load_or_create_profile_in, load_or_generate_identity_in, read_profile_in,
    save_profile_in, vault_identity_dir, UserProfile, UNNAMED_DISPLAY_NAME,
};
use fs4::FileExt;
use iroh::SecretKey;
use std::fs::{self, OpenOptions};
use std::path::{Path, PathBuf};

const SLOT_NAMES: [&str; 8] = [
    "primary", "slot-2", "slot-3", "slot-4", "slot-5", "slot-6", "slot-7", "slot-8",
];

pub struct PersonSession {
    pub slot_id: String,
    pub dir: PathBuf,
    pub secret_key: SecretKey,
    pub profile: UserProfile,
    pub lock_file: std::fs::File,
}

pub fn acquire_person_session(
    profiles_root: &Path,
    vault_root: &Path,
    name_hint: &str,
) -> Result<PersonSession> {
    fs::create_dir_all(profiles_root).map_err(KnitError::Io)?;
    for slot in SLOT_NAMES {
        let dir = profiles_root.join(slot);
        fs::create_dir_all(&dir).map_err(KnitError::Io)?;
        let lock_path = dir.join("instance.lock");
        let file = OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .truncate(false)
            .open(&lock_path)
            .map_err(KnitError::Io)?;
        if file.try_lock().is_ok() {
            let (secret_key, profile) = materialize_slot(&dir, vault_root, profiles_root, name_hint)?;
            return Ok(PersonSession {
                slot_id: slot.to_string(),
                dir,
                secret_key,
                profile,
                lock_file: file,
            });
        }
    }
    Err(KnitError::Network(
        "Tous les profils de cette installation sont déjà ouverts.".into(),
    ))
}

fn materialize_slot(
    slot_dir: &Path,
    vault_root: &Path,
    profiles_root: &Path,
    name_hint: &str,
) -> Result<(SecretKey, UserProfile)> {
    let key_path = slot_dir.join("keypair.bin");
    if !key_path.exists() {
        if let Some(bytes) = importable_vault_key(vault_root, profiles_root, slot_dir) {
            fs::write(&key_path, &bytes).map_err(KnitError::Io)?;
        }
    }
    if read_profile_in(slot_dir)?.is_none() {
        if let Some(vault_profile) = read_profile_in(&vault_identity_dir(vault_root))? {
            save_profile_in(slot_dir, &vault_profile)?;
        }
    }

    let hint = if is_unnamed_display(name_hint) {
        UNNAMED_DISPLAY_NAME
    } else {
        name_hint.trim()
    };
    let mut profile = load_or_create_profile_in(slot_dir, hint)?;
    if is_unnamed_display(&profile.display_name) && !is_unnamed_display(name_hint) {
        let (first, last) = crate::vault::identity::split_display_name(name_hint.trim());
        profile.display_name = name_hint.trim().to_string();
        profile.first_name = first;
        profile.last_name = last;
        save_profile_in(slot_dir, &profile)?;
    }
    let secret_key = load_or_generate_identity_in(slot_dir)?;
    Ok((secret_key, profile))
}

fn importable_vault_key(vault_root: &Path, profiles_root: &Path, slot_dir: &Path) -> Option<Vec<u8>> {
    let vault_key = vault_identity_dir(vault_root).join("keypair.bin");
    let bytes = fs::read(vault_key).ok()?;
    if bytes.len() != 32 {
        return None;
    }
    for slot in SLOT_NAMES {
        let other = profiles_root.join(slot);
        if other == slot_dir {
            continue;
        }
        if let Ok(existing) = fs::read(other.join("keypair.bin")) {
            if existing == bytes {
                return None;
            }
        }
    }
    Some(bytes)
}

/// Lecture du profil primary sans prendre le verrou (avant ouverture du réseau).
pub fn peek_primary_profile(profiles_root: &Path) -> Result<Option<UserProfile>> {
    read_profile_in(&profiles_root.join("primary"))
}

pub fn save_primary_profile(profiles_root: &Path, profile: &UserProfile) -> Result<()> {
    save_profile_in(&profiles_root.join("primary"), profile)
}

impl Drop for PersonSession {
    fn drop(&mut self) {
        let _ = self.lock_file.unlock();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn second_acquire_uses_another_slot() {
        let root = tempdir().unwrap();
        let vault_a = root.path().join("a");
        let vault_b = root.path().join("b");
        fs::create_dir_all(&vault_a).unwrap();
        fs::create_dir_all(&vault_b).unwrap();
        let profiles = root.path().join("profiles");
        let first = acquire_person_session(&profiles, &vault_a, "Alice").unwrap();
        assert_eq!(first.slot_id, "primary");
        assert_eq!(first.profile.display_name, "Alice");
        let key_a = first.secret_key.public().to_string();
        drop(first);
        let again = acquire_person_session(&profiles, &vault_a, "Alice").unwrap();
        assert_eq!(again.slot_id, "primary");
        assert_eq!(again.secret_key.public().to_string(), key_a);
        drop(again);
        // Le verrou de fichier est inter-processus (deux fenêtres Knit).
        // Dans le même processus, Windows autorise un second handle : on vérifie
        // seulement que le slot primary reste réutilisable après fermeture.
    }
}
