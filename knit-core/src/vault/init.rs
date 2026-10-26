//! Initialisation d'un coffre-fort Knit (`init_vault`).

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

use crate::error::{KnitError, Result};

use super::config::{save_vault_config, VaultLocalConfig};
use super::init_templates as tpl;
use super::share::{has_syncable_content, new_vault_id};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InitVaultOptions {
    pub vault_name: String,
    #[serde(default = "default_true")]
    pub create_default_structure: bool,
    #[serde(default = "default_true")]
    pub install_ai_kit: bool,
    #[serde(default)]
    pub init_git: bool,
    #[serde(default = "default_hue")]
    pub hue: u16,
    #[serde(default = "default_theme")]
    pub theme: String,
}

fn default_true() -> bool {
    true
}

fn default_hue() -> u16 {
    35
}

fn default_theme() -> String {
    "auto".to_string()
}

impl Default for InitVaultOptions {
    fn default() -> Self {
        Self {
            vault_name: "Mon Projet".to_string(),
            create_default_structure: true,
            install_ai_kit: true,
            init_git: false,
            hue: default_hue(),
            theme: default_theme(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InitVaultResult {
    pub vault_path: String,
    pub vault_name: String,
    pub created_files: Vec<String>,
}

/// Crée un coffre Knit dans `vault_root` (dossier existant ou à créer).
pub fn init_vault(vault_root: &Path, options: &InitVaultOptions) -> Result<InitVaultResult> {
    if options.vault_name.trim().is_empty() {
        return Err(KnitError::Vault(
            "Le nom du coffre ne peut pas être vide".into(),
        ));
    }

    fs::create_dir_all(vault_root).map_err(KnitError::from)?;

    // Refuser d'écraser un coffre déjà initialisé
    let knitshare = vault_root.join(".knitshare");
    let knit_dir = vault_root.join(".knit");
    if knitshare.exists() || (knit_dir.exists() && knit_dir.join("identity").exists()) {
        return Err(KnitError::Vault(
            "Ce dossier contient déjà un coffre Knit".into(),
        ));
    }

    let mut created: Vec<String> = Vec::new();
    let name = options.vault_name.trim();

    // .knit/ local
    for sub in [
        ".knit",
        ".knit/crdt-state",
        ".knit/snapshots",
        ".knit/cache",
        ".knit/trash",
    ] {
        let p = vault_root.join(sub);
        fs::create_dir_all(&p).map_err(KnitError::from)?;
        created.push(format!("{sub}/"));
    }

    let mut local_cfg = VaultLocalConfig::default();
    local_cfg.theme = options.theme.clone();
    local_cfg.hue = options.hue.min(360);
    save_vault_config(vault_root, &local_cfg)?;
    created.push(".knit/config.yaml".into());

    write_rel(
        vault_root,
        ".knit/AI_MEMORY.md",
        tpl::ai_memory_seed(),
        &mut created,
    )?;

    // .knitshare partagé — id stable dès la création
    write_rel(
        vault_root,
        ".knitshare",
        &tpl::knitshare_yaml(name, Some(&new_vault_id())),
        &mut created,
    )?;

    if options.create_default_structure {
        for dir in ["wiki", "projet/taches", "projet/sprints", "assets"] {
            let p = vault_root.join(dir);
            fs::create_dir_all(&p).map_err(KnitError::from)?;
            created.push(format!("{dir}/"));
        }
        write_rel(
            vault_root,
            "wiki/accueil.md",
            &tpl::accueil_md(name),
            &mut created,
        )?;
    }

    if options.install_ai_kit {
        write_ai_kit(vault_root, name, &mut created)?;
    }

    if options.init_git {
        init_git_repo(vault_root, &mut created)?;
    }

    Ok(InitVaultResult {
        vault_path: vault_root.to_string_lossy().to_string(),
        vault_name: name.to_string(),
        created_files: created,
    })
}

fn write_rel(
    root: &Path,
    rel: &str,
    content: &str,
    created: &mut Vec<String>,
) -> Result<()> {
    let path = root.join(rel);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(KnitError::from)?;
    }
    fs::write(&path, content).map_err(KnitError::from)?;
    created.push(rel.to_string());
    Ok(())
}

fn write_ai_kit(root: &Path, vault_name: &str, created: &mut Vec<String>) -> Result<()> {
    write_rel(root, "KNIT.md", &tpl::knit_md(vault_name), created)?;
    write_rel(root, "GUIDE_IA.md", tpl::guide_ia_md(), created)?;
    write_rel(root, ".cursorrules", tpl::cursorrules(), created)?;
    write_rel(root, ".cursor/rules/knit.mdc", tpl::cursor_mdc(), created)?;
    write_rel(root, "CLAUDE.md", tpl::claude_md(), created)?;
    write_rel(root, "AGENTS.md", tpl::agents_md(), created)?;
    write_rel(
        root,
        ".agents/skills/knit/SKILL.md",
        tpl::skill_md(),
        created,
    )?;
    write_rel(
        root,
        ".github/copilot-instructions.md",
        tpl::copilot_instructions(),
        created,
    )?;
    write_rel(root, ".windsurfrules", tpl::windsurf_rules(), created)?;
    write_rel(root, ".clinerules", tpl::clinerules(), created)?;
    write_rel(root, ".aider.conf.yml", tpl::aider_conf(), created)?;
    Ok(())
}

fn init_git_repo(root: &Path, created: &mut Vec<String>) -> Result<()> {
    let gitignore = root.join(".gitignore");
    if !gitignore.exists() {
        fs::write(&gitignore, tpl::gitignore_knit()).map_err(KnitError::from)?;
        created.push(".gitignore".into());
    } else {
        let existing = fs::read_to_string(&gitignore).unwrap_or_default();
        if !existing.lines().any(|l| l.trim() == ".knit/") {
            let mut next = existing;
            if !next.ends_with('\n') && !next.is_empty() {
                next.push('\n');
            }
            next.push_str("\n# Knit — données locales\n.knit/\n");
            fs::write(&gitignore, next).map_err(KnitError::from)?;
            created.push(".gitignore".into());
        }
    }

    if root.join(".git").exists() {
        return Ok(());
    }

    let status = Command::new("git")
        .arg("init")
        .current_dir(root)
        .status()
        .map_err(|e| KnitError::Vault(format!("git init: {e}")))?;

    if !status.success() {
        return Err(KnitError::Vault(
            "git init a échoué (Git est-il installé ?)".into(),
        ));
    }
    created.push(".git/".into());
    Ok(())
}

/// Un coffre est considéré initialisé s'il possède un `.knitshare` (partagé).
pub fn is_vault_initialized(vault_root: &Path) -> bool {
    vault_root.join(".knitshare").exists()
}

/// Prépare un dossier local vide pour rejoindre un coffre.
/// La coquille n'a pas d'`id` : il sera copié depuis l'hôte, après confirmation.
pub fn prepare_join_vault(vault_root: &Path, vault_name: &str) -> Result<InitVaultResult> {
    if has_syncable_content(vault_root) {
        return Err(KnitError::Vault(
            "Ce dossier contient déjà des fichiers. Choisissez un dossier vide pour ne pas écraser ce travail.".into(),
        ));
    }
    if vault_root.join(".knitshare").exists() {
        let share = super::share::read_vault_share(vault_root)?;
        return Ok(InitVaultResult {
            vault_path: vault_root.to_string_lossy().to_string(),
            vault_name: share.nom,
            created_files: vec![],
        });
    }
    if vault_name.trim().is_empty() {
        return Err(KnitError::Vault(
            "Le nom du coffre ne peut pas être vide".into(),
        ));
    }
    fs::create_dir_all(vault_root).map_err(KnitError::from)?;
    let mut created: Vec<String> = Vec::new();
    for sub in [
        ".knit",
        ".knit/crdt-state",
        ".knit/snapshots",
        ".knit/cache",
        ".knit/trash",
    ] {
        fs::create_dir_all(vault_root.join(sub)).map_err(KnitError::from)?;
        created.push(format!("{sub}/"));
    }
    save_vault_config(vault_root, &VaultLocalConfig::default())?;
    created.push(".knit/config.yaml".into());
    write_rel(
        vault_root,
        ".knitshare",
        &tpl::knitshare_yaml(vault_name.trim(), None),
        &mut created,
    )?;
    Ok(InitVaultResult {
        vault_path: vault_root.to_string_lossy().to_string(),
        vault_name: vault_name.trim().to_string(),
        created_files: created,
    })
}

pub fn resolve_vault_path(path: &str) -> PathBuf {
    PathBuf::from(path)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_dir(label: &str) -> PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .unwrap_or(0);
        let dir = std::env::temp_dir().join(format!("knit-init-{label}-{nanos}"));
        let _ = fs::remove_dir_all(&dir);
        dir
    }

    #[test]
    fn init_creates_layout_and_ai_kit() {
        let root = temp_dir("full");
        let result = init_vault(
            &root,
            &InitVaultOptions {
                vault_name: "Test Vault".into(),
                create_default_structure: true,
                install_ai_kit: true,
                init_git: false,
                hue: 220,
                theme: "dark".into(),
            },
        )
        .expect("init");

        assert!(root.join(".knitshare").exists());
        assert!(root.join(".knit/config.yaml").exists());
        assert!(root.join(".knit/AI_MEMORY.md").exists());
        assert!(root.join("wiki/accueil.md").exists());
        assert!(root.join("GUIDE_IA.md").exists());
        assert!(root.join("KNIT.md").exists());
        assert!(root.join(".cursor/rules/knit.mdc").exists());
        assert!(root.join("CLAUDE.md").exists());
        assert!(root.join(".agents/skills/knit/SKILL.md").exists());
        assert!(result.created_files.iter().any(|f| f == ".knitshare"));

        let share = fs::read_to_string(root.join(".knitshare")).unwrap();
        assert!(share.contains("nom: \"Test Vault\""));

        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn init_refuses_existing_vault() {
        let root = temp_dir("dup");
        init_vault(&root, &InitVaultOptions::default()).unwrap();
        let err = init_vault(&root, &InitVaultOptions::default());
        assert!(err.is_err());
        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn is_vault_initialized_detects_knitshare() {
        let root = temp_dir("init-check");
        assert!(!is_vault_initialized(&root));
        init_vault(&root, &InitVaultOptions::default()).unwrap();
        assert!(is_vault_initialized(&root));
        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn prepare_join_creates_shell_without_ai_kit() {
        let root = temp_dir("join");
        let result = prepare_join_vault(&root, "Coffre partagé").expect("prepare_join");
        assert!(root.join(".knitshare").exists());
        assert!(root.join(".knit/config.yaml").exists());
        assert!(!root.join("GUIDE_IA.md").exists());
        assert!(!root.join("KNIT.md").exists());
        assert!(!root.join("wiki/accueil.md").exists());
        assert!(result.created_files.iter().any(|f| f == ".knitshare"));

        // Idempotent si déjà un coffre
        let again = prepare_join_vault(&root, "Autre").expect("re-join");
        assert!(again.created_files.is_empty());

        let _ = fs::remove_dir_all(&root);
    }
}
