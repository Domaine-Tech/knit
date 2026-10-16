use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::Path;
use walkdir::WalkDir;

use crate::error::{KnitError, Result};
use crate::markdown::frontmatter::parse_frontmatter;
use crate::vault::tree::normalize_rel_path;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct TagInfo {
    pub tag: String,
    pub count: usize,
    pub files: Vec<String>,
}

/// Extrait tous les tags du coffre (frontmatter YAML et inline `#tag`)
pub fn collect_vault_tags(vault_root: &Path) -> Result<Vec<TagInfo>> {
    if !vault_root.exists() || !vault_root.is_dir() {
        return Err(KnitError::VaultNotFound(vault_root.display().to_string()));
    }

    let mut tag_map: HashMap<String, HashSet<String>> = HashMap::new();
    let inline_tag_re = Regex::new(r"(?:^|[\s(])#([a-zA-Z0-9_\-\/]+)").unwrap();

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
        let name = entry.file_name().to_string_lossy().to_string();

        let ext = path.extension().map(|e| e.to_string_lossy().to_lowercase());
        let is_md = ext.as_deref() == Some("md") || ext.as_deref() == Some("markdown") || name == "KNIT.md";

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

        // 1. Tags du Frontmatter YAML
        let fm = parse_frontmatter(&content);
        if let Some(raw_tags) = fm.fields.get("tags") {
            let clean = raw_tags.trim_start_matches('[').trim_end_matches(']');
            for t in clean.split(',') {
                let st = t.trim().trim_matches(['\'', '"', '#']).to_lowercase();
                if !st.is_empty() {
                    tag_map
                        .entry(st)
                        .or_default()
                        .insert(rel_path.clone());
                }
            }
        }

        // 2. Tags inline `#tag` dans le corps du texte
        for line in fm.body.lines() {
            let trimmed = line.trim();
            // Ignorer les titres markdown `# Mon Titre`, `## Sous-titre` etc.
            if trimmed.starts_with('#') && trimmed.chars().take_while(|c| *c == '#').count() <= 6 {
                let after_hashes = trimmed.trim_start_matches('#');
                if after_hashes.starts_with(' ') {
                    // C'est un titre Markdown, on ne le traite pas comme tag inline
                    continue;
                }
            }

            for cap in inline_tag_re.captures_iter(line) {
                if let Some(m) = cap.get(1) {
                    let tag = m.as_str().to_lowercase();
                    if !tag.is_empty() && !tag.chars().all(|c| c.is_ascii_digit()) {
                        tag_map
                            .entry(tag)
                            .or_default()
                            .insert(rel_path.clone());
                    }
                }
            }
        }
    }

    let mut tags: Vec<TagInfo> = tag_map
        .into_iter()
        .map(|(tag, file_set)| {
            let mut files: Vec<String> = file_set.into_iter().collect();
            files.sort();
            TagInfo {
                count: files.len(),
                tag,
                files,
            }
        })
        .collect();

    // Tri par fréquence décroissante puis ordre alphabétique
    tags.sort_by(|a, b| b.count.cmp(&a.count).then_with(|| a.tag.cmp(&b.tag)));

    Ok(tags)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_collect_vault_tags() {
        let dir = tempdir().unwrap();
        let root = dir.path();

        fs::write(
            root.join("note1.md"),
            "---\ntags: [backend, p2p]\n---\n# Titre\nTexte avec #dev/rust et #backend.",
        )
        .unwrap();

        fs::write(
            root.join("note2.md"),
            "---\ntags: [p2p, ui]\n---\n# Un autre titre\nVoici du texte.",
        )
        .unwrap();

        let tags = collect_vault_tags(root).unwrap();
        let p2p = tags.iter().find(|t| t.tag == "p2p").unwrap();
        assert_eq!(p2p.count, 2);

        let dev_rust = tags.iter().find(|t| t.tag == "dev/rust").unwrap();
        assert_eq!(dev_rust.count, 1);
        assert_eq!(dev_rust.files, vec!["note1.md"]);
    }
}
