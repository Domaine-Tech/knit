use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use walkdir::WalkDir;

use crate::error::{KnitError, Result};
use crate::vault::tree::normalize_rel_path;
use crate::watcher::guard::WriteGuard;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct LinkRefactorReport {
    pub files_scanned: usize,
    pub files_modified: usize,
    pub links_updated: usize,
    pub modified_files: Vec<String>,
}

/// Calcule un chemin relatif propre (avec des barres '/') depuis le fichier appelant vers la cible
pub fn compute_relative_path(from_file_rel: &str, to_file_rel: &str) -> String {
    let clean_from = from_file_rel.replace('\\', "/");
    let clean_to = to_file_rel.replace('\\', "/");

    let from_path = Path::new(&clean_from);
    let from_dir = from_path.parent().unwrap_or(Path::new(""));
    let to_path = Path::new(&clean_to);

    let from_comps: Vec<_> = from_dir
        .components()
        .map(|c| c.as_os_str().to_string_lossy().to_string())
        .filter(|s| !s.is_empty() && s != ".")
        .collect();

    let to_comps: Vec<_> = to_path
        .components()
        .map(|c| c.as_os_str().to_string_lossy().to_string())
        .filter(|s| !s.is_empty() && s != ".")
        .collect();

    let mut common_len = 0;
    while common_len < from_comps.len()
        && common_len < to_comps.len()
        && from_comps[common_len] == to_comps[common_len]
    {
        common_len += 1;
    }

    let mut result_parts = Vec::new();
    for _ in common_len..from_comps.len() {
        result_parts.push("..".to_string());
    }
    for comp in &to_comps[common_len..] {
        result_parts.push(comp.clone());
    }

    if result_parts.is_empty() {
        to_path
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default()
    } else {
        result_parts.join("/")
    }
}

/// Normalise un chemin relatif cible depuis la position du document appelant
pub fn resolve_relative_target(from_file_rel: &str, target_link: &str) -> String {
    let clean_link = target_link.replace('\\', "/");
    if clean_link.starts_with('/') {
        return clean_link.trim_start_matches('/').to_string();
    }

    let from_path = Path::new(from_file_rel);
    let parent = from_path.parent().unwrap_or(Path::new(""));

    let combined = parent.join(&clean_link);
    let mut parts: Vec<String> = Vec::new();

    for comp in combined.components() {
        match comp {
            std::path::Component::Normal(c) => parts.push(c.to_string_lossy().to_string()),
            std::path::Component::ParentDir => {
                parts.pop();
            }
            std::path::Component::CurDir => {}
            _ => {}
        }
    }

    parts.join("/")
}

/// Met à jour les liens Markdown et WikiLinks dans le contenu d'un document spécifique
pub fn refactor_links_in_content(
    content: &str,
    current_file_rel: &str,
    old_target_rel: &str,
    new_target_rel: &str,
) -> (String, usize) {
    let mut links_count = 0;

    let norm_old = old_target_rel.replace('\\', "/").trim_start_matches('/').to_string();
    let norm_new = new_target_rel.replace('\\', "/").trim_start_matches('/').to_string();

    let old_stem = Path::new(&norm_old)
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_default();
    let new_stem = Path::new(&norm_new)
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_default();

    // 1. Détection & remplacement des WikiLinks : [[cible]] ou [[cible|alias]]
    let wikilink_re = regex::Regex::new(r"\[\[([^\]|]+)(?:\|([^\]]+))?\]\]").unwrap();
    let intermediate = wikilink_re.replace_all(content, |caps: &regex::Captures| {
        let target = caps.get(1).unwrap().as_str().trim();
        let alias = caps.get(2).map(|m| m.as_str());

        let target_clean = target.replace('\\', "/");
        let target_stem = Path::new(&target_clean)
            .file_stem()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_else(|| target_clean.clone());

        let is_folder_rename = !norm_old.ends_with(".md") && !norm_old.contains('.');
        let is_match = if is_folder_rename {
            target_clean.starts_with(&format!("{}/", norm_old))
        } else if target_clean.contains('/') {
            target_clean == norm_old || target_clean == norm_old.strip_suffix(".md").unwrap_or(&norm_old)
        } else {
            target_stem == old_stem
        };

        if is_match {
            links_count += 1;
            let replacement_target = if is_folder_rename {
                let suffix = &target_clean[norm_old.len() + 1..];
                format!("{}/{}", norm_new, suffix)
            } else if target_clean.contains('/') {
                norm_new.strip_suffix(".md").unwrap_or(&norm_new).to_string()
            } else {
                new_stem.clone()
            };

            match alias {
                Some(a) => format!("[[{}|{}]]", replacement_target, a),
                None => format!("[[{}]]", replacement_target),
            }
        } else {
            caps.get(0).unwrap().as_str().to_string()
        }
    });

    // 2. Détection & remplacement des liens Markdown : [Label](cible) ou ![Alt](cible) avec titre optionnel
    let mdlink_re = regex::Regex::new(r#"(!?\[[^\]]*\])\(([^)\s]+)(?:\s+("[^"]*"|'[^']*'))?\)"#).unwrap();
    let final_content = mdlink_re.replace_all(&intermediate, |caps: &regex::Captures| {
        let label_part = caps.get(1).unwrap().as_str();
        let raw_target = caps.get(2).unwrap().as_str().trim();
        let title_part = caps.get(3).map(|m| m.as_str());

        if raw_target.starts_with("http://")
            || raw_target.starts_with("https://")
            || raw_target.starts_with("mailto:")
            || raw_target.starts_with('#')
        {
            return caps.get(0).unwrap().as_str().to_string();
        }

        let (path_part, anchor_part) = match raw_target.split_once('#') {
            Some((p, a)) => (p.trim(), Some(a)),
            None => (raw_target, None),
        };

        let resolved = resolve_relative_target(current_file_rel, path_part);

        let is_folder_rename = !norm_old.ends_with(".md") && !norm_old.contains('.');
        let is_direct_match = resolved == norm_old;
        let is_subpath_match = is_folder_rename && resolved.starts_with(&format!("{}/", norm_old));

        if is_direct_match || is_subpath_match {
            links_count += 1;
            let target_for_rel = if is_subpath_match {
                let suffix = &resolved[norm_old.len() + 1..];
                format!("{}/{}", norm_new, suffix)
            } else {
                norm_new.clone()
            };

            let new_rel = compute_relative_path(current_file_rel, &target_for_rel);
            let final_link = match anchor_part {
                Some(anchor) => format!("{new_rel}#{anchor}"),
                None => new_rel,
            };

            let title_str = title_part.map(|t| format!(" {}", t)).unwrap_or_default();
            format!("{label_part}({final_link}{title_str})")
        } else {
            caps.get(0).unwrap().as_str().to_string()
        }
    });

    (final_content.into_owned(), links_count)
}

/// Refactorise tous les liens pointant vers `old_rel_path` dans tout le coffre-fort
pub fn refactor_links_in_vault(
    vault_root: &Path,
    old_rel_path: &str,
    new_rel_path: &str,
    guard: &WriteGuard,
) -> Result<LinkRefactorReport> {
    let mut report = LinkRefactorReport::default();
    let canonical_root = vault_root
        .canonicalize()
        .unwrap_or_else(|_| vault_root.to_path_buf());

    for entry in WalkDir::new(&canonical_root)
        .into_iter()
        .filter_entry(|e| {
            if e.depth() == 0 {
                return true;
            }
            let name = e.file_name().to_string_lossy();
            !name.starts_with('.')
                && name != "target"
                && name != "node_modules"
                && name != "dist"
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
        let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
        if ext != "md" && ext != "markdown" {
            continue;
        }

        report.files_scanned += 1;

        let rel_path = match path.strip_prefix(&canonical_root) {
            Ok(p) => normalize_rel_path(p),
            Err(_) => continue,
        };

        let content = match fs::read_to_string(path) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let (new_content, links_modified) =
            refactor_links_in_content(&content, &rel_path, old_rel_path, new_rel_path);

        if links_modified > 0 {
            // Écriture protégée par le WriteGuard pour ne pas déclencher de rebond
            guard.begin_write(path, new_content.as_bytes());
            if let Err(e) = fs::write(path, new_content.as_bytes()) {
                guard.end_write(path);
                return Err(KnitError::Io(e));
            }
            guard.end_write(path);

            report.files_modified += 1;
            report.links_updated += links_modified;
            report.modified_files.push(rel_path);
        }
    }

    Ok(report)
}

/// Trouve toutes les notes du coffre qui référencent un fichier cible (Backlinks)
pub fn find_backlinks_in_vault(vault_root: &Path, target_rel_path: &str) -> Result<Vec<String>> {
    let mut backlinks = Vec::new();
    let norm_target = target_rel_path.replace('\\', "/").trim_start_matches('/').to_string();
    let canonical_root = vault_root
        .canonicalize()
        .unwrap_or_else(|_| vault_root.to_path_buf());

    let _target_stem = Path::new(&norm_target)
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_default();

    for entry in WalkDir::new(&canonical_root)
        .into_iter()
        .filter_entry(|e| {
            if e.depth() == 0 {
                return true;
            }
            let name = e.file_name().to_string_lossy();
            !name.starts_with('.') && name != "target" && name != "node_modules"
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
        let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
        if ext != "md" && ext != "markdown" {
            continue;
        }

        let rel_path = match path.strip_prefix(&canonical_root) {
            Ok(p) => normalize_rel_path(p),
            Err(_) => continue,
        };

        if rel_path == norm_target {
            continue;
        }

        let content = match fs::read_to_string(path) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let (_, count) =
            refactor_links_in_content(&content, &rel_path, &norm_target, "__test_target__");
        if count > 0 {
            backlinks.push(rel_path);
        }
    }

    Ok(backlinks)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compute_relative_path() {
        assert_eq!(
            compute_relative_path("wiki/archi.md", "wiki/core/architecture.md"),
            "core/architecture.md"
        );
        assert_eq!(
            compute_relative_path("projet/taches/task-001.md", "wiki/architecture.md"),
            "../../wiki/architecture.md"
        );
        assert_eq!(
            compute_relative_path("accueil.md", "wiki/piliers.md"),
            "wiki/piliers.md"
        );
        assert_eq!(
            compute_relative_path("wiki/piliers.md", "accueil.md"),
            "../accueil.md"
        );
    }

    #[test]
    fn test_refactor_markdown_and_wikilinks() {
        let content = r#"# Document Test

Voir [Architecture](archi.md) pour les détails.
Voir aussi [Doc](../wiki/archi.md#section) et image ![Logo](assets/logo.png).
WikiLink : [[archi]] et [[archi|Mon Archi]].
"#;

        let (updated, count) =
            refactor_links_in_content(content, "wiki/index.md", "wiki/archi.md", "wiki/core/architecture.md");

        assert_eq!(count, 4); // [Architecture], [Doc], [[archi]], [[archi|Mon Archi]]
        assert!(updated.contains("[Architecture](core/architecture.md)"));
        assert!(updated.contains("[Doc](core/architecture.md#section)"));
        assert!(updated.contains("[[architecture]]"));
        assert!(updated.contains("[[architecture|Mon Archi]]"));
        assert!(updated.contains("![Logo](assets/logo.png)")); // Inchangé
    }

    #[test]
    fn test_refactor_folder_rename_and_titles() {
        let content = r#"# Dossier
Lien vers [Doc](wiki/guide.md "Guide officiel") et [[wiki/guide]].
Lien vers [Autre](autre/note.md).
"#;
        let (updated, count) =
            refactor_links_in_content(content, "accueil.md", "wiki", "documentation");

        assert_eq!(count, 2);
        assert!(updated.contains("[Doc](documentation/guide.md \"Guide officiel\")"));
        assert!(updated.contains("[[documentation/guide]]"));
        assert!(updated.contains("[Autre](autre/note.md)")); // Inchangé
    }
}
