use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

use crate::error::{KnitError, Result};
use crate::markdown::frontmatter::parse_frontmatter;
use crate::markdown::patterns::INLINE_TAG_RE;
use crate::vault::walk::iter_vault_md_files;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SearchSnippet {
    pub line_number: usize,
    pub line_content: String,
    pub match_start: usize,
    pub match_end: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct FileSearchResult {
    pub rel_path: String,
    pub file_name: String,
    pub total_matches: usize,
    pub snippets: Vec<SearchSnippet>,
}

#[derive(Debug, Clone, Default)]
pub struct SearchQueryFilter {
    pub term: String,
    pub tag_filter: Option<String>,
    pub path_filter: Option<String>,
}

/// Parse une chaîne de recherche contenant éventuellement des filtres `tag:#mon-tag` ou `path:dossier/`
pub fn parse_search_query(raw_query: &str) -> SearchQueryFilter {
    let mut term_parts = Vec::new();
    let mut tag_filter = None;
    let mut path_filter = None;

    for token in raw_query.split_whitespace() {
        if let Some(rest) = token.strip_prefix("tag:") {
            let clean_tag = rest.trim_start_matches('#').to_lowercase();
            if !clean_tag.is_empty() {
                tag_filter = Some(clean_tag);
            }
        } else if let Some(rest) = token.strip_prefix("path:") {
            let clean_path = rest.replace('\\', "/").to_lowercase();
            if !clean_path.is_empty() {
                path_filter = Some(clean_path);
            }
        } else {
            term_parts.push(token);
        }
    }

    SearchQueryFilter {
        term: term_parts.join(" "),
        tag_filter,
        path_filter,
    }
}

/// Recherche globale plein-texte dans l'ensemble des notes Markdown d'un coffre-fort
pub fn search_vault(vault_root: &Path, raw_query: &str) -> Result<Vec<FileSearchResult>> {
    if !vault_root.exists() || !vault_root.is_dir() {
        return Err(KnitError::VaultNotFound(vault_root.display().to_string()));
    }

    let filter = parse_search_query(raw_query);
    let term = filter.term.trim().to_lowercase();

    if term.is_empty() && filter.tag_filter.is_none() && filter.path_filter.is_none() {
        return Ok(Vec::new());
    }

    let mut results = Vec::new();

    for md in iter_vault_md_files(vault_root, true) {
        // Filtre de chemin `path:...`
        if let Some(ref path_sub) = filter.path_filter {
            if !md.rel_path.to_lowercase().contains(path_sub) {
                continue;
            }
        }

        let content = match fs::read_to_string(&md.path) {
            Ok(c) => c,
            Err(_) => continue,
        };

        // Filtre de tag `tag:...`
        if let Some(ref tag_sub) = filter.tag_filter {
            let fm = parse_frontmatter(&content);
            let mut file_tags: Vec<String> = Vec::new();

            if let Some(raw_tags) = fm.fields.get("tags") {
                let clean = raw_tags.trim_start_matches('[').trim_end_matches(']');
                for t in clean.split(',') {
                    let st = t.trim().trim_matches(['\'', '"', '#']).to_lowercase();
                    if !st.is_empty() {
                        file_tags.push(st);
                    }
                }
            }

            for cap in INLINE_TAG_RE.captures_iter(&content) {
                if let Some(m) = cap.get(1) {
                    file_tags.push(m.as_str().to_lowercase());
                }
            }

            if !file_tags.iter().any(|t| t == tag_sub || t.contains(tag_sub)) {
                continue;
            }
        }

        // Si le terme de recherche est vide mais que les filtres correspondent,
        // on retourne le fichier avec un snippet d'en-tête
        if term.is_empty() {
            results.push(FileSearchResult {
                rel_path: md.rel_path.clone(),
                file_name: md.file_name,
                total_matches: 1,
                snippets: vec![SearchSnippet {
                    line_number: 1,
                    line_content: content.lines().next().unwrap_or("").to_string(),
                    match_start: 0,
                    match_end: 0,
                }],
            });
            continue;
        }

        let mut snippets = Vec::new();
        let mut total_matches = 0;

        for (line_idx, line) in content.lines().enumerate() {
            let lower_line = line.to_lowercase();
            let mut search_from = 0;

            while let Some(pos) = lower_line[search_from..].find(&term) {
                let actual_start = search_from + pos;
                let actual_end = actual_start + term.len();
                total_matches += 1;

                if snippets.len() < 10 {
                    snippets.push(SearchSnippet {
                        line_number: line_idx + 1,
                        line_content: line.to_string(),
                        match_start: actual_start,
                        match_end: actual_end,
                    });
                }

                search_from = actual_end;
                if search_from >= lower_line.len() {
                    break;
                }
            }
        }

        if total_matches > 0 {
            results.push(FileSearchResult {
                rel_path: md.rel_path,
                file_name: md.file_name,
                total_matches,
                snippets,
            });
        }
    }

    // Tri par pertinence (nombre de correspondances décroissant)
    results.sort_by_key(|a| std::cmp::Reverse(a.total_matches));

    Ok(results)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_search_query_parsing() {
        let f = parse_search_query("crdt tag:#p2p path:wiki/");
        assert_eq!(f.term, "crdt");
        assert_eq!(f.tag_filter.as_deref(), Some("p2p"));
        assert_eq!(f.path_filter.as_deref(), Some("wiki/"));

        let f2 = parse_search_query("notion style");
        assert_eq!(f2.term, "notion style");
        assert_eq!(f2.tag_filter, None);
        assert_eq!(f2.path_filter, None);
    }

    #[test]
    fn test_search_vault_with_snippets_and_filters() {
        let dir = tempdir().unwrap();
        let root = dir.path();

        fs::create_dir_all(root.join("wiki")).unwrap();
        fs::write(
            root.join("wiki/doc1.md"),
            "---\ntags: [backend, p2p]\n---\n# Architecture\nLe CRDT Yjs assure la synchro.\nUn second CRDT est ici.",
        )
        .unwrap();

        fs::write(
            root.join("wiki/doc2.md"),
            "---\ntags: [frontend]\n---\n# Interface\nUtilise React et CodeMirror.",
        )
        .unwrap();

        // Recherche du mot "crdt"
        let res = search_vault(root, "crdt").unwrap();
        assert_eq!(res.len(), 1);
        assert_eq!(res[0].rel_path, "wiki/doc1.md");
        assert_eq!(res[0].total_matches, 2);
        assert_eq!(res[0].snippets.len(), 2);
        assert_eq!(res[0].snippets[0].line_number, 5);

        // Recherche avec filtre tag
        let res_tag = search_vault(root, "crdt tag:#p2p").unwrap();
        assert_eq!(res_tag.len(), 1);

        let res_no_match_tag = search_vault(root, "crdt tag:#frontend").unwrap();
        assert_eq!(res_no_match_tag.len(), 0);

        // Recherche avec filtre path
        let res_path = search_vault(root, "path:wiki/").unwrap();
        assert_eq!(res_path.len(), 2);
    }
}
