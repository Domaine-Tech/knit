//! Configuration locale du coffre (`.knit/config.yaml`) — jamais synchronisée.

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

use crate::error::{KnitError, Result};

/// Mode de corbeille après staging dans `.knit/trash/`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "snake_case")]
pub enum TrashMode {
    /// Après le toast d'annulation, envoie vers la corbeille OS.
    #[default]
    Os,
    /// Conserve exclusivement dans `.knit/trash/` (pas d'appel `trash::delete`).
    Knit,
}

impl TrashMode {
    pub fn as_str(self) -> &'static str {
        match self {
            TrashMode::Os => "os",
            TrashMode::Knit => "knit",
        }
    }

    pub fn parse(s: &str) -> Self {
        match s.trim().to_ascii_lowercase().as_str() {
            "knit" | "integrated" | "local" => TrashMode::Knit,
            _ => TrashMode::Os,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultLocalConfig {
    #[serde(default = "default_theme")]
    pub theme: String,
    #[serde(default = "default_hue")]
    pub hue: u16,
    #[serde(default)]
    pub trash_mode: TrashMode,
    #[serde(default)]
    pub lan_only: bool,
}

fn default_theme() -> String {
    "auto".to_string()
}

fn default_hue() -> u16 {
    35
}

impl Default for VaultLocalConfig {
    fn default() -> Self {
        Self {
            theme: default_theme(),
            hue: default_hue(),
            trash_mode: TrashMode::Os,
            lan_only: false,
        }
    }
}

pub fn config_path(vault_root: &Path) -> std::path::PathBuf {
    vault_root.join(".knit").join("config.yaml")
}

pub fn load_vault_config(vault_root: &Path) -> VaultLocalConfig {
    let path = config_path(vault_root);
    if !path.exists() {
        return VaultLocalConfig::default();
    }
    match fs::read_to_string(&path) {
        Ok(raw) => parse_config_yaml(&raw).unwrap_or_default(),
        Err(_) => VaultLocalConfig::default(),
    }
}

/// Parseur YAML minimal (clés scalaires) pour éviter une dépendance lourde.
fn parse_config_yaml(raw: &str) -> Result<VaultLocalConfig> {
    let mut cfg = VaultLocalConfig::default();
    for line in raw.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }
        let Some((key, value)) = trimmed.split_once(':') else {
            continue;
        };
        let key = key.trim();
        let value = value.trim().trim_matches('"').trim_matches('\'');
        match key {
            "theme" => cfg.theme = value.to_string(),
            "hue" => {
                if let Ok(h) = value.parse::<u16>() {
                    cfg.hue = h.min(360);
                }
            }
            "trash_mode" => cfg.trash_mode = TrashMode::parse(value),
            "lan_only" => {
                cfg.lan_only = matches!(value.to_ascii_lowercase().as_str(), "true" | "1" | "yes");
            }
            _ => {}
        }
    }
    Ok(cfg)
}

pub fn save_vault_config(vault_root: &Path, cfg: &VaultLocalConfig) -> Result<()> {
    let knit_dir = vault_root.join(".knit");
    fs::create_dir_all(&knit_dir).map_err(KnitError::from)?;
    let content = format!(
        r#"# .knit/config.yaml — Configuration STRICTEMENT locale (jamais synchronisée)
theme: {theme}
hue: {hue}
trash_mode: {trash_mode}
lan_only: {lan_only}
"#,
        theme = cfg.theme,
        hue = cfg.hue,
        trash_mode = cfg.trash_mode.as_str(),
        lan_only = cfg.lan_only,
    );
    fs::write(config_path(vault_root), content).map_err(KnitError::from)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn roundtrip_config() {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .unwrap_or(0);
        let dir = std::env::temp_dir().join(format!("knit-cfg-{nanos}"));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();

        let mut cfg = VaultLocalConfig::default();
        cfg.theme = "dark".into();
        cfg.hue = 220;
        cfg.trash_mode = TrashMode::Knit;
        cfg.lan_only = true;
        save_vault_config(&dir, &cfg).unwrap();
        let loaded = load_vault_config(&dir);
        assert_eq!(loaded.theme, "dark");
        assert_eq!(loaded.hue, 220);
        assert_eq!(loaded.trash_mode, TrashMode::Knit);
        assert!(loaded.lan_only);

        let _ = fs::remove_dir_all(&dir);
    }
}
