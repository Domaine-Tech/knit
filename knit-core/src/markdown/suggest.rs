use serde::{Deserialize, Serialize};
use std::path::Path;

use crate::error::Result;
use crate::markdown::frontmatter::parse_frontmatter;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct HeadingItem {
    pub file_rel: String,
    pub level: u8,
    pub text: String,
    pub slug: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SuggestDocItem {
    pub rel_path: String,
    pub title: String,
    pub doc_type: String, // "note" | "kanban" | "table"
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SuggestTagItem {
    pub tag: String,
    pub count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct SuggestIndexData {
    pub docs: Vec<SuggestDocItem>,
    pub headings: Vec<HeadingItem>,
    pub tags: Vec<SuggestTagItem>,
}

/// Génère un slug pour une ancre de titre (ex: "Mon Titre Section" -> "mon-titre-section")
pub fn slugify_heading(heading: &str) -> String {
    heading
        .trim()
        .to_lowercase()
        .chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' { c } else { '-' })
        .collect::<String>()
        .split('-')
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
        .join("-")
}

/// Détecte le type de document (aligné sur `detectDocType` TS : FM `type:` puis chemin).
pub fn detect_doc_type(content: &str, rel_path: &str) -> String {
    let fm = parse_frontmatter(content);
    if let Some(t) = fm.fields.get("type").map(|s| s.to_lowercase()) {
        if t.contains("kanban") || t.contains("board") {
            return "kanban".to_string();
        }
        if t.contains("table") || t.contains("tableau") {
            return "table".to_string();
        }
        if t.contains("calendar") || t.contains("agenda") {
            return "calendar".to_string();
        }
        if t.contains("canvas") {
            return "canvas".to_string();
        }
        if t.contains("slides") || t.contains("slide") {
            return "slides".to_string();
        }
        if t.contains("gallery") || t.contains("galerie") {
            return "gallery".to_string();
        }
        if t.contains("note") {
            return "note".to_string();
        }
    }

    // Plugins Obsidian legacy dans le YAML brut
    if let Some(raw) = &fm.raw_frontmatter {
        let lower = raw.to_lowercase();
        if lower.contains("kanban: true") || lower.contains("kanban-plugin:") {
            return "kanban".to_string();
        }
    }

    let lower_path = rel_path.to_lowercase();
    if lower_path.contains("kanban") || lower_path.ends_with(".kanban.md") {
        return "kanban".to_string();
    }
    if lower_path.contains("tableau")
        || lower_path.contains("table")
        || lower_path.ends_with(".table.md")
    {
        return "table".to_string();
    }
    if lower_path.contains("calendar")
        || lower_path.contains("agenda")
        || lower_path.ends_with(".calendar.md")
    {
        return "calendar".to_string();
    }
    if lower_path.contains("canvas") || lower_path.ends_with(".canvas.md") {
        return "canvas".to_string();
    }
    if lower_path.contains("slides")
        || lower_path.contains("diaporama")
        || lower_path.contains("slide")
        || lower_path.ends_with(".slides.md")
    {
        return "slides".to_string();
    }
    if lower_path.contains("gallery")
        || lower_path.contains("galerie")
        || lower_path.ends_with(".gallery.md")
    {
        return "gallery".to_string();
    }

    "note".to_string()
}

/// Extrait les titres (#, ##, ###) d'un contenu Markdown
pub fn extract_headings_from_content(rel_path: &str, content: &str) -> Vec<HeadingItem> {
    let mut items = Vec::new();
    let mut in_code_block = false;

    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("```") {
            in_code_block = !in_code_block;
            continue;
        }
        if in_code_block {
            continue;
        }

        if let Some(h1) = trimmed.strip_prefix("# ") {
            let t = h1.trim().to_string();
            let slug = slugify_heading(&t);
            items.push(HeadingItem {
                file_rel: rel_path.to_string(),
                level: 1,
                text: t,
                slug,
            });
        } else if let Some(h2) = trimmed.strip_prefix("## ") {
            let t = h2.trim().to_string();
            let slug = slugify_heading(&t);
            items.push(HeadingItem {
                file_rel: rel_path.to_string(),
                level: 2,
                text: t,
                slug,
            });
        } else if let Some(h3) = trimmed.strip_prefix("### ") {
            let t = h3.trim().to_string();
            let slug = slugify_heading(&t);
            items.push(HeadingItem {
                file_rel: rel_path.to_string(),
                level: 3,
                text: t,
                slug,
            });
        }
    }

    items
}

/// Indexe l'ensemble du coffre pour l'autocomplétion (vue sur le scan unifié B-057).
pub fn build_suggest_index(vault_root: &Path) -> Result<SuggestIndexData> {
    let index = crate::markdown::vault_index::get_cached_vault_index(vault_root)?;
    Ok(index.suggest)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn test_suggest_index_generation() {
        let dir = tempdir().unwrap();
        let root = dir.path();

        fs::write(
            root.join("note1.md"),
            "---\ntags: [rust, p2p]\n---\n# Architecture Globale\n## Moteur CRDT\nContenu avec #p2p",
        )
        .unwrap();

        fs::write(
            root.join("kanban-sprint.md"),
            "---\ntype: kanban\n---\n# Sprint 6\n## À faire\n- [ ] Tâche 1\n## En cours\n- [/] Tâche 2",
        )
        .unwrap();

        let index = build_suggest_index(root).unwrap();
        assert_eq!(index.docs.len(), 2);
        assert_eq!(index.docs[0].doc_type, "kanban");
        assert_eq!(index.docs[1].doc_type, "note");

        assert!(index.headings.iter().any(|h| h.text == "Moteur CRDT" && h.level == 2));
        assert!(index.tags.iter().any(|t| t.tag == "p2p"));
    }
}
