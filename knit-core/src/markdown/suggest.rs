use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use walkdir::WalkDir;

use crate::error::{KnitError, Result};
use crate::markdown::frontmatter::parse_frontmatter;
use crate::vault::tree::normalize_rel_path;

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

/// Détecte le type de document d'après le frontmatter YAML
pub fn detect_doc_type(content: &str, rel_path: &str) -> String {
    let lower_path = rel_path.to_lowercase();
    if lower_path.contains("kanban") {
        return "kanban".to_string();
    }
    if lower_path.contains("tableau") || lower_path.contains("table") {
        return "table".to_string();
    }

    let fm = parse_frontmatter(content);
    if let Some(t) = fm.fields.get("type").map(|s| s.to_lowercase()) {
        if t.contains("kanban") || t.contains("board") {
            return "kanban".to_string();
        }
        if t.contains("table") || t.contains("tableau") {
            return "table".to_string();
        }
    }

    // Heuristique de contenu : titres H2 avec cases à cocher -> kanban
    let h2_count = content.lines().filter(|l| l.trim_start().starts_with("## ")).count();
    let task_count = content.lines().filter(|l| {
        let t = l.trim_start();
        t.starts_with("- [ ]") || t.starts_with("- [x]") || t.starts_with("- [/]")
    }).count();

    if h2_count >= 2 && task_count >= 1 {
        return "kanban".to_string();
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

/// Indexe l'ensemble du coffre pour l'autocomplétion ultra-rapide (< 2ms)
pub fn build_suggest_index(vault_root: &Path) -> Result<SuggestIndexData> {
    if !vault_root.exists() || !vault_root.is_dir() {
        return Err(KnitError::VaultNotFound(vault_root.display().to_string()));
    }

    let mut docs = Vec::new();
    let mut all_headings = Vec::new();
    let mut tag_counts: HashMap<String, usize> = HashMap::new();

    let tag_re = regex::Regex::new(r"(?:^|\s)#([a-zA-Z0-9_\-\/]+)").unwrap();

    for entry in WalkDir::new(vault_root)
        .follow_links(false)
        .into_iter()
        .filter_entry(|e| {
            if e.depth() == 0 {
                return true;
            }
            let name = e.file_name().to_string_lossy();
            !name.starts_with('.') && name != "target" && name != "node_modules" && name != "dist"
        })
    {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };

        if !entry.file_type().is_file() {
            continue;
        }

        let path = entry.path();
        let ext = path.extension().map(|e| e.to_string_lossy().to_lowercase());
        let is_md = ext.as_deref() == Some("md") || ext.as_deref() == Some("markdown");
        if !is_md {
            continue;
        }

        let rel_path = match path.strip_prefix(vault_root) {
            Ok(p) => normalize_rel_path(p),
            Err(_) => normalize_rel_path(path),
        };

        let content = match fs::read_to_string(path) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let doc_type = detect_doc_type(&content, &rel_path);
        let fm = parse_frontmatter(&content);

        // Titre : frontmatter title / titre, ou 1er H1, ou nom de fichier
        let mut title = fm.fields.get("title").or_else(|| fm.fields.get("titre")).cloned();
        let headings = extract_headings_from_content(&rel_path, &content);

        if title.is_none() {
            for h in &headings {
                if h.level == 1 {
                    title = Some(h.text.clone());
                    break;
                }
            }
        }

        let file_stem = Path::new(&rel_path)
            .file_stem()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_else(|| rel_path.clone());

        let final_title = title.unwrap_or(file_stem);

        docs.push(SuggestDocItem {
            rel_path: rel_path.clone(),
            title: final_title,
            doc_type,
        });

        all_headings.extend(headings);

        // Tags dans frontmatter
        if let Some(raw_tags) = fm.fields.get("tags") {
            let clean = raw_tags.trim_start_matches('[').trim_end_matches(']');
            for t in clean.split(',') {
                let st = t.trim().trim_matches(['\'', '"', '#']);
                if !st.is_empty() {
                    *tag_counts.entry(st.to_string()).or_insert(0) += 1;
                }
            }
        }

        // Tags inline dans le body
        for cap in tag_re.captures_iter(&fm.body) {
            if let Some(tag_match) = cap.get(1) {
                let tag = tag_match.as_str().to_string();
                *tag_counts.entry(tag).or_insert(0) += 1;
            }
        }
    }

    // Tri par ordre alphabétique
    docs.sort_by(|a, b| a.rel_path.cmp(&b.rel_path));
    all_headings.sort_by(|a, b| a.file_rel.cmp(&b.file_rel));

    let mut tags: Vec<SuggestTagItem> = tag_counts
        .into_iter()
        .map(|(tag, count)| SuggestTagItem { tag, count })
        .collect();
    tags.sort_by(|a, b| b.count.cmp(&a.count).then_with(|| a.tag.cmp(&b.tag)));

    Ok(SuggestIndexData {
        docs,
        headings: all_headings,
        tags,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
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
