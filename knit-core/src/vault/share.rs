//! Identité logique d'un coffre (`.knitshare` : `id` + `nom`).

use crate::error::{KnitError, Result};
use rand::RngExt;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use walkdir::WalkDir;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct VaultShare {
    pub id: Option<String>,
    pub nom: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct JoinFolderReport {
    pub accepted: bool,
    pub reason: String,
    pub vault_name: String,
}

/// Décision de handshake. `Ok(true)` = même coffre. `Ok(false)` = dossier local en attente d'adoption.
pub fn vault_link_decision(local_id: Option<&str>, remote_id: Option<&str>) -> Result<bool> {
    match (local_id.filter(|s| !s.is_empty()), remote_id.filter(|s| !s.is_empty())) {
        (Some(local), Some(remote)) if local == remote => Ok(true),
        (Some(_), Some(_)) => Err(KnitError::Network(
            "Ce n'est pas le même coffre. La synchronisation est refusée pour ne pas mélanger deux travaux.".into(),
        )),
        (None, Some(_)) => Ok(false),
        (Some(_), None) => Err(KnitError::Network(
            "Le pair n'annonce pas d'identifiant de coffre.".into(),
        )),
        (None, None) => Err(KnitError::Network(
            "Identifiant de coffre manquant des deux côtés.".into(),
        )),
    }
}

pub fn new_vault_id() -> String {
    let mut bytes = [0u8; 16];
    rand::rng().fill(&mut bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    format!(
        "{:02x}{:02x}{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}{:02x}{:02x}{:02x}{:02x}",
        bytes[0], bytes[1], bytes[2], bytes[3],
        bytes[4], bytes[5],
        bytes[6], bytes[7],
        bytes[8], bytes[9],
        bytes[10], bytes[11], bytes[12], bytes[13], bytes[14], bytes[15]
    )
}

fn unquote(value: &str) -> String {
    let trimmed = value.trim().trim_matches('"').trim_matches('\'').trim();
    trimmed.to_string()
}

pub fn read_vault_share(vault_root: &Path) -> Result<VaultShare> {
    let path = vault_root.join(".knitshare");
    if !path.exists() {
        let nom = vault_root
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| "Coffre".to_string());
        return Ok(VaultShare { id: None, nom });
    }
    let text = fs::read_to_string(&path).map_err(KnitError::Io)?;
    Ok(parse_vault_share(&text, vault_root))
}

fn parse_vault_share(text: &str, vault_root: &Path) -> VaultShare {
    let mut id = None;
    let mut nom = String::new();
    for line in text.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }
        if let Some(rest) = trimmed.strip_prefix("nom:") {
            nom = unquote(rest);
        } else if let Some(rest) = trimmed.strip_prefix("id:") {
            let value = unquote(rest);
            if !value.is_empty() {
                id = Some(value);
            }
        }
    }
    if nom.is_empty() {
        nom = vault_root
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| "Coffre".to_string());
    }
    VaultShare { id, nom }
}

/// Insère ou remplace la ligne `id:` sans réécrire le reste du YAML.
pub fn write_vault_id(vault_root: &Path, vault_id: &str) -> Result<()> {
    let path = vault_root.join(".knitshare");
    let text = if path.exists() {
        fs::read_to_string(&path).map_err(KnitError::Io)?
    } else {
        String::new()
    };
    let id_line = format!("id: \"{}\"", vault_id.replace('"', "'"));
    let mut lines: Vec<String> = text.lines().map(|l| l.to_string()).collect();
    if let Some(pos) = lines.iter().position(|l| l.trim().starts_with("id:")) {
        lines[pos] = id_line;
    } else if let Some(pos) = lines.iter().position(|l| l.trim().starts_with("nom:")) {
        lines.insert(pos + 1, id_line);
    } else {
        lines.insert(0, id_line);
    }
    if !lines.iter().any(|l| l.trim().starts_with("version:")) {
        lines.push("version: 2".to_string());
    }
    let mut out = lines.join("\n");
    if !out.ends_with('\n') {
        out.push('\n');
    }
    fs::write(&path, out).map_err(KnitError::Io)?;
    Ok(())
}

pub fn is_syncable_rel(rel: &str) -> bool {
    let norm = rel.replace('\\', "/");
    if norm.is_empty() || norm.starts_with('/') || norm.contains(':') {
        return false;
    }
    let parts: Vec<&str> = norm.split('/').filter(|p| !p.is_empty()).collect();
    if parts.is_empty() || parts.iter().any(|p| *p == "..") {
        return false;
    }
    if parts[0] == ".knit" || parts[0] == ".git" {
        return false;
    }
    true
}

fn ignored_dir(name: &str) -> bool {
    name == ".knit" || name == ".git" || name == "node_modules" || name == "target"
}

/// Fichiers de contenu (hors `.knitshare` lui-même).
pub fn has_syncable_content(vault_root: &Path) -> bool {
    if !vault_root.exists() {
        return false;
    }
    for entry in WalkDir::new(vault_root).into_iter().filter_map(|e| e.ok()) {
        if !entry.file_type().is_file() {
            continue;
        }
        let rel = match entry.path().strip_prefix(vault_root) {
            Ok(p) => p.to_string_lossy().replace('\\', "/"),
            Err(_) => continue,
        };
        if rel == ".knitshare" {
            continue;
        }
        if !is_syncable_rel(&rel) {
            continue;
        }
        if entry
            .path()
            .components()
            .any(|c| ignored_dir(&c.as_os_str().to_string_lossy()))
        {
            continue;
        }
        return true;
    }
    false
}

/// Coffres legacy : attribue un id s'il y a déjà du contenu. Une coquille de join reste sans id.
pub fn prepare_share_for_session(vault_root: &Path) -> Result<VaultShare> {
    let mut share = read_vault_share(vault_root)?;
    if share.id.is_none() && vault_root.join(".knitshare").exists() && has_syncable_content(vault_root)
    {
        let id = new_vault_id();
        write_vault_id(vault_root, &id)?;
        share.id = Some(id);
    }
    Ok(share)
}

pub fn inspect_join_folder(vault_root: &Path) -> JoinFolderReport {
    if !vault_root.exists() {
        return JoinFolderReport {
            accepted: true,
            reason: "Dossier nouveau".into(),
            vault_name: String::new(),
        };
    }
    let share = read_vault_share(vault_root).unwrap_or(VaultShare {
        id: None,
        nom: String::new(),
    });
    if has_syncable_content(vault_root) {
        let name = if share.nom.is_empty() {
            "sans nom".to_string()
        } else {
            share.nom.clone()
        };
        return JoinFolderReport {
            accepted: false,
            reason: format!(
                "Ce dossier contient déjà le coffre « {name} ». Choisissez un dossier vide pour ne pas écraser ce travail."
            ),
            vault_name: share.nom,
        };
    }
    JoinFolderReport {
        accepted: true,
        reason: "Dossier vide ou coquille".into(),
        vault_name: share.nom,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn legacy_share_receives_id_only_when_content_exists() {
        let dir = tempdir().unwrap();
        fs::write(dir.path().join(".knitshare"), "nom: \"Alpha\"\nversion: 1\n").unwrap();
        let pending = prepare_share_for_session(dir.path()).unwrap();
        assert!(pending.id.is_none());

        fs::write(dir.path().join("accueil.md"), "# Hi\n").unwrap();
        let assigned = prepare_share_for_session(dir.path()).unwrap();
        assert!(assigned.id.is_some());
        assert_eq!(assigned.nom, "Alpha");
        let again = prepare_share_for_session(dir.path()).unwrap();
        assert_eq!(again.id, assigned.id);
    }

    #[test]
    fn occupied_folder_is_refused() {
        let dir = tempdir().unwrap();
        fs::write(dir.path().join("note.md"), "x").unwrap();
        let report = inspect_join_folder(dir.path());
        assert!(!report.accepted);
    }

    #[test]
    fn vault_link_refuses_distinct_ids() {
        assert!(vault_link_decision(Some("a"), Some("a")).unwrap());
        assert!(!vault_link_decision(None, Some("a")).unwrap());
        assert!(vault_link_decision(Some("a"), Some("b")).is_err());
        assert!(vault_link_decision(None, None).is_err());
    }
}
