use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

use crate::error::{KnitError, Result};
use crate::markdown::frontmatter::{parse_frontmatter, update_frontmatter_field};
use crate::vault::tree::{resolve_safe_path, write_file_content_with_guard};
use crate::vault::walk::iter_vault_md_files;
use crate::watcher::guard::WriteGuard;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct TaskCard {
    pub rel_path: String,
    pub id: String,
    pub titre: String,
    pub statut: String,
    pub priorite: Option<String>,
    pub assigne: Option<String>,
    pub sprint: Option<String>,
    pub echeance: Option<String>,
    pub tags: Vec<String>,
    pub snippet: String,
}

/// Extrait l'ensemble des tâches du coffre-fort depuis les frontmatters YAML des fichiers Markdown
pub fn collect_vault_tasks(vault_root: &Path) -> Result<Vec<TaskCard>> {
    if !vault_root.exists() || !vault_root.is_dir() {
        return Err(KnitError::VaultNotFound(vault_root.display().to_string()));
    }

    let mut tasks = Vec::new();

    for md in iter_vault_md_files(vault_root, false) {
        let content = match fs::read_to_string(&md.path) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let fm = parse_frontmatter(&content);

        // Si le fichier possède un champ `statut` ou `type: tache` ou est dans `projet/taches`
        let has_status = fm.fields.contains_key("statut");
        let is_task_type = fm.fields.get("type").map(|t| t == "tache").unwrap_or(false);
        let in_taches_dir =
            md.rel_path.starts_with("projet/taches") || md.rel_path.contains("/taches/");

        if !has_status && !is_task_type && !in_taches_dir {
            continue;
        }

        let statut = fm
            .fields
            .get("statut")
            .cloned()
            .unwrap_or_else(|| "a-faire".to_string())
            .to_lowercase();

        let id = fm.fields.get("id").cloned().unwrap_or_else(|| {
            Path::new(&md.file_name)
                .file_stem()
                .map(|s| s.to_string_lossy().to_string())
                .unwrap_or_else(|| "task".to_string())
        });

        // Titre : champ frontmatter `titre`, sinon premier H1 (`# ...`), sinon nom de fichier
        let titre = if let Some(t) = fm.fields.get("titre") {
            t.clone()
        } else {
            let mut extracted = None;
            for line in fm.body.lines() {
                let trimmed = line.trim();
                if let Some(h1) = trimmed.strip_prefix("# ") {
                    extracted = Some(h1.trim().to_string());
                    break;
                }
            }
            extracted.unwrap_or_else(|| {
                Path::new(&md.file_name)
                    .file_stem()
                    .map(|s| s.to_string_lossy().to_string())
                    .unwrap_or_else(|| "Tâche sans titre".to_string())
            })
        };

        let priorite = fm.fields.get("priorite").cloned();
        let assigne = fm.fields.get("assigne").cloned();
        let sprint = fm.fields.get("sprint").cloned();
        let echeance = fm.fields.get("echeance").cloned();

        let mut tags = Vec::new();
        if let Some(raw_tags) = fm.fields.get("tags") {
            let clean = raw_tags.trim_start_matches('[').trim_end_matches(']');
            for t in clean.split(',') {
                let st = t.trim().trim_matches(['\'', '"', '#']);
                if !st.is_empty() {
                    tags.push(st.to_string());
                }
            }
        }

        // Extrait de texte pour aperçu de la carte
        let snippet = fm
            .body
            .lines()
            .filter(|l| !l.trim().is_empty() && !l.trim().starts_with('#'))
            .take(2)
            .collect::<Vec<_>>()
            .join(" ");

        tasks.push(TaskCard {
            rel_path: md.rel_path,
            id,
            titre,
            statut,
            priorite,
            assigne,
            sprint,
            echeance,
            tags,
            snippet,
        });
    }

    // Tri naturel par ID ou chemin
    tasks.sort_by(|a, b| a.id.cmp(&b.id));

    Ok(tasks)
}

/// Met à jour le statut d'une tâche dans son fichier Markdown sur disque sans altérer le reste
pub fn update_task_status(
    vault_root: &Path,
    rel_path: &str,
    new_status: &str,
    guard: &WriteGuard,
) -> Result<()> {
    let safe_path = resolve_safe_path(vault_root, rel_path)?;
    if !safe_path.exists() {
        return Err(KnitError::FileNotFound(rel_path.to_string()));
    }

    let content = fs::read_to_string(&safe_path)?;
    let updated = update_frontmatter_field(&content, "statut", new_status);

    write_file_content_with_guard(vault_root, rel_path, &updated, guard)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_collect_vault_tasks_and_update_status() {
        let dir = tempdir().unwrap();
        let root = dir.path();
        let guard = WriteGuard::new();

        fs::create_dir_all(root.join("projet/taches")).unwrap();
        let task_file = root.join("projet/taches/task-001.md");
        fs::write(
            &task_file,
            "---\nid: task-001\ntitre: Créer le moteur CRDT\nstatut: a-faire\npriorite: critique\nassigne: Thomas\ntags: [backend, p2p]\n---\n\n# Créer le moteur CRDT\nDescription détaillée de la tâche.",
        )
        .unwrap();

        let tasks = collect_vault_tasks(root).unwrap();
        assert_eq!(tasks.len(), 1);
        assert_eq!(tasks[0].id, "task-001");
        assert_eq!(tasks[0].titre, "Créer le moteur CRDT");
        assert_eq!(tasks[0].statut, "a-faire");
        assert_eq!(tasks[0].priorite.as_deref(), Some("critique"));
        assert_eq!(tasks[0].assigne.as_deref(), Some("Thomas"));
        assert_eq!(tasks[0].tags, vec!["backend", "p2p"]);

        // Mise à jour vers "en-cours"
        update_task_status(root, "projet/taches/task-001.md", "en-cours", &guard).unwrap();

        let updated_content = fs::read_to_string(&task_file).unwrap();
        assert!(updated_content.contains("statut: en-cours"));
        assert!(updated_content.contains("id: task-001"));
        assert!(updated_content.contains("Description détaillée de la tâche."));

        let tasks_after = collect_vault_tasks(root).unwrap();
        assert_eq!(tasks_after[0].statut, "en-cours");
    }
}
