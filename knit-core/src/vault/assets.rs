use std::fs;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::error::{KnitError, Result};
use crate::vault::tree::resolve_safe_path;
use crate::watcher::guard::WriteGuard;

/// Enregistre une pièce jointe binaire (image ou document) dans le dossier `assets/` du coffre-fort
pub fn save_asset(
    vault_root: &Path,
    filename_hint: Option<&str>,
    data: &[u8],
    guard: Option<&WriteGuard>,
) -> Result<String> {
    let assets_dir = vault_root.join("assets");
    if !assets_dir.exists() {
        fs::create_dir_all(&assets_dir)?;
    }

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);

    let clean_filename = match filename_hint {
        Some(hint) if !hint.trim().is_empty() => {
            let sanitized: String = hint
                .chars()
                .map(|c| if c.is_alphanumeric() || c == '.' || c == '-' || c == '_' { c } else { '_' })
                .collect();

            let target = assets_dir.join(&sanitized);
            if target.exists() {
                // Si le nom existe déjà, on insère le timestamp avant l'extension
                if let Some((stem, ext)) = sanitized.rsplit_once('.') {
                    format!("{}-{}.{}", stem, timestamp, ext)
                } else {
                    format!("{}-{}", sanitized, timestamp)
                }
            } else {
                sanitized
            }
        }
        _ => {
            format!("img-{}.png", timestamp)
        }
    };

    let rel_path = format!("assets/{}", clean_filename);
    let full_path = resolve_safe_path(vault_root, &rel_path)?;

    if let Some(g) = guard {
        g.begin_write(&full_path, data);
        if let Err(e) = fs::write(&full_path, data) {
            g.end_write(&full_path);
            return Err(KnitError::Io(e));
        }
        g.end_write(&full_path);
    } else {
        fs::write(&full_path, data)?;
    }

    Ok(rel_path)
}
