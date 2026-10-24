//! Index coffre unifié (B-057) — un seul parcours disque pour FM, suggest, tâches et agenda.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::error::{KnitError, Result};
use crate::markdown::calendar::{extract_calendar_events_from_content, CalendarEvent, CalendarIndexData};
use crate::markdown::frontmatter::parse_frontmatter;
use crate::markdown::patterns::INLINE_TAG_RE;
use crate::markdown::suggest::{
    detect_doc_type, extract_headings_from_content, HeadingItem, SuggestDocItem, SuggestIndexData,
    SuggestTagItem,
};
use crate::vault::tree::file_mtime_ms;
use crate::vault::walk::iter_vault_md_files;

static VAULT_INDEX_GENERATION: AtomicU64 = AtomicU64::new(1);

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct FrontmatterFileEntry {
    pub path: String,
    pub name: String,
    pub title: String,
    pub doc_type: String,
    pub mtime: u64,
    pub fields: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct IndexedInlineTask {
    pub path: String,
    pub line_index: usize,
    pub status: String,
    pub text: String,
    pub raw_line: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "camelCase")]
pub struct VaultIndexData {
    /// Génération monotone pour invalider les caches frontend / process.
    pub generation: u64,
    pub suggest: SuggestIndexData,
    pub files: Vec<FrontmatterFileEntry>,
    pub tasks: Vec<IndexedInlineTask>,
    pub calendar: CalendarIndexData,
}

/// Projection d'un seul fichier (upsert unitaire).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IndexedMarkdownSlice {
    pub file: FrontmatterFileEntry,
    pub headings: Vec<HeadingItem>,
    pub file_tags: Vec<String>,
    pub tasks: Vec<IndexedInlineTask>,
    pub calendar_events: Vec<CalendarEvent>,
}

struct ProcessCache {
    vault_path: String,
    generation: u64,
    data: VaultIndexData,
}

static PROCESS_CACHE: Mutex<Option<ProcessCache>> = Mutex::new(None);

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

/// Invalide le cache process (watcher / écriture). Retourne la nouvelle génération.
pub fn invalidate_vault_index_cache() -> u64 {
    let gen = VAULT_INDEX_GENERATION.fetch_add(1, Ordering::SeqCst) + 1;
    if let Ok(mut guard) = PROCESS_CACHE.lock() {
        *guard = None;
    }
    gen
}

pub fn current_vault_index_generation() -> u64 {
    VAULT_INDEX_GENERATION.load(Ordering::SeqCst)
}

fn normalize_task_status(raw: &str) -> String {
    match raw {
        "x" | "X" => "x".to_string(),
        "/" => "/".to_string(),
        "-" => "-".to_string(),
        "?" => "?".to_string(),
        ">" => ">".to_string(),
        "!" => "!".to_string(),
        _ => " ".to_string(),
    }
}

fn extract_inline_tasks(rel_path: &str, content: &str) -> Vec<IndexedInlineTask> {
    let mut tasks = Vec::new();
    let mut in_code = false;

    for (line_index, raw_line) in content.lines().enumerate() {
        let trimmed = raw_line.trim_start();
        if trimmed.starts_with("```") {
            in_code = !in_code;
            continue;
        }
        if in_code {
            continue;
        }

        // Aligné sur TASK_LINE_RE TS : `[-*] [status] texte`
        let Some(after_bullet) = trimmed
            .strip_prefix("- [")
            .or_else(|| trimmed.strip_prefix("* ["))
        else {
            continue;
        };
        let Some((status_raw, rest)) = after_bullet.split_once(']') else {
            continue;
        };
        if status_raw.chars().count() != 1 {
            continue;
        }
        let text = rest.trim_start();
        tasks.push(IndexedInlineTask {
            path: rel_path.to_string(),
            line_index,
            status: normalize_task_status(status_raw),
            text: text.to_string(),
            raw_line: raw_line.to_string(),
        });
    }

    tasks
}

fn collect_file_tags(fm_fields: &HashMap<String, String>, body: &str) -> Vec<String> {
    let mut tags = Vec::new();

    if let Some(raw_tags) = fm_fields.get("tags") {
        let clean = raw_tags.trim_start_matches('[').trim_end_matches(']');
        for t in clean.split(',') {
            let st = t.trim().trim_matches(['\'', '"', '#']);
            if !st.is_empty() {
                tags.push(st.to_string());
            }
        }
    }

    for cap in INLINE_TAG_RE.captures_iter(body) {
        if let Some(tag_match) = cap.get(1) {
            tags.push(tag_match.as_str().to_string());
        }
    }

    tags
}

/// Indexe un contenu Markdown déjà lu (upsert / démo Vite).
pub fn index_markdown_file(rel_path: &str, content: &str, mtime: Option<u64>) -> IndexedMarkdownSlice {
    let fm = parse_frontmatter(content);
    let name = Path::new(rel_path)
        .file_name()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| rel_path.to_string());
    let file_stem = Path::new(rel_path)
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| name.clone());

    let headings = extract_headings_from_content(rel_path, content);
    let mut title = fm
        .fields
        .get("title")
        .or_else(|| fm.fields.get("titre"))
        .cloned();
    if title.is_none() {
        for h in &headings {
            if h.level == 1 {
                title = Some(h.text.clone());
                break;
            }
        }
    }
    let final_title = title.unwrap_or(file_stem);
    let doc_type = detect_doc_type(content, rel_path);
    let file_tags = collect_file_tags(&fm.fields, &fm.body);
    let tasks = extract_inline_tasks(rel_path, content);
    let calendar_events = extract_calendar_events_from_content(rel_path, content);

    IndexedMarkdownSlice {
        file: FrontmatterFileEntry {
            path: rel_path.replace('\\', "/"),
            name,
            title: final_title,
            doc_type,
            mtime: mtime.unwrap_or_else(now_ms),
            fields: fm.fields,
        },
        headings,
        file_tags,
        tasks,
        calendar_events,
    }
}

fn aggregate_slices(slices: Vec<IndexedMarkdownSlice>, generation: u64) -> VaultIndexData {
    let mut docs = Vec::with_capacity(slices.len());
    let mut all_headings = Vec::new();
    let mut tag_counts: HashMap<String, usize> = HashMap::new();
    let mut files = Vec::with_capacity(slices.len());
    let mut tasks = Vec::new();
    let mut events = Vec::new();

    for slice in slices {
        docs.push(SuggestDocItem {
            rel_path: slice.file.path.clone(),
            title: slice.file.title.clone(),
            doc_type: slice.file.doc_type.clone(),
        });
        all_headings.extend(slice.headings);
        for tag in slice.file_tags {
            *tag_counts.entry(tag).or_insert(0) += 1;
        }
        files.push(slice.file);
        tasks.extend(slice.tasks);
        events.extend(slice.calendar_events);
    }

    docs.sort_by(|a, b| a.rel_path.cmp(&b.rel_path));
    all_headings.sort_by(|a, b| a.file_rel.cmp(&b.file_rel));
    files.sort_by(|a, b| a.path.cmp(&b.path));
    events.sort_by(|a, b| {
        a.date
            .cmp(&b.date)
            .then(a.start_time.cmp(&b.start_time))
            .then(a.rel_path.cmp(&b.rel_path))
    });

    let mut tags: Vec<SuggestTagItem> = tag_counts
        .into_iter()
        .map(|(tag, count)| SuggestTagItem { tag, count })
        .collect();
    tags.sort_by(|a, b| b.count.cmp(&a.count).then_with(|| a.tag.cmp(&b.tag)));

    VaultIndexData {
        generation,
        suggest: SuggestIndexData {
            docs,
            headings: all_headings,
            tags,
        },
        files,
        tasks,
        calendar: CalendarIndexData { events },
    }
}

/// Scan unique du coffre (FM + suggest + tâches inline + agenda).
pub fn build_vault_index(vault_root: &Path) -> Result<VaultIndexData> {
    if !vault_root.exists() || !vault_root.is_dir() {
        return Err(KnitError::VaultNotFound(vault_root.display().to_string()));
    }

    let generation = current_vault_index_generation();
    let mut slices = Vec::new();

    for md in iter_vault_md_files(vault_root, false) {
        let content = match fs::read_to_string(&md.path) {
            Ok(c) => c,
            Err(_) => continue,
        };
        let mtime = file_mtime_ms(&md.path);
        slices.push(index_markdown_file(&md.rel_path, &content, mtime));
    }

    Ok(aggregate_slices(slices, generation))
}

/// Construit l'index et le stocke dans le cache process.
pub fn build_and_cache_vault_index(vault_root: &Path) -> Result<VaultIndexData> {
    let data = build_vault_index(vault_root)?;
    let key = vault_root
        .canonicalize()
        .unwrap_or_else(|_| vault_root.to_path_buf())
        .to_string_lossy()
        .to_string();
    if let Ok(mut guard) = PROCESS_CACHE.lock() {
        *guard = Some(ProcessCache {
            vault_path: key,
            generation: data.generation,
            data: data.clone(),
        });
    }
    Ok(data)
}

/// Retourne l'index cache s'il est frais, sinon rescanne.
pub fn get_cached_vault_index(vault_root: &Path) -> Result<VaultIndexData> {
    let key = vault_root
        .canonicalize()
        .unwrap_or_else(|_| vault_root.to_path_buf())
        .to_string_lossy()
        .to_string();
    let gen = current_vault_index_generation();

    if let Ok(guard) = PROCESS_CACHE.lock() {
        if let Some(cache) = guard.as_ref() {
            if cache.vault_path == key && cache.generation == gen {
                return Ok(cache.data.clone());
            }
        }
    }

    build_and_cache_vault_index(vault_root)
}

/// Construit un index à partir de contenus déjà en mémoire (mode démo / fallback).
pub fn build_vault_index_from_contents(
    entries: &[(String, String)],
    mtimes: &HashMap<String, u64>,
) -> VaultIndexData {
    let generation = current_vault_index_generation();
    let slices: Vec<IndexedMarkdownSlice> = entries
        .iter()
        .filter(|(path, _)| {
            let lower = path.to_lowercase();
            lower.ends_with(".md") || lower.ends_with(".markdown") || path.ends_with("KNIT.md")
        })
        .map(|(path, content)| {
            let key = path.replace('\\', "/");
            index_markdown_file(&key, content, mtimes.get(&key).copied())
        })
        .collect();
    aggregate_slices(slices, generation)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn test_unified_vault_index_single_pass() {
        let dir = tempdir().unwrap();
        let root = dir.path();

        fs::write(
            root.join("note.md"),
            "---\ntags: [rust]\ntitre: Architecture\n---\n# Architecture\n- [ ] Faire B-057 @2026-10-24\n#inline\n",
        )
        .unwrap();
        fs::write(
            root.join("board.md"),
            "---\ntype: kanban\n---\n## À faire\n- [ ] Carte\n",
        )
        .unwrap();
        fs::write(
            root.join("whiteboard.md"),
            "---\ntype: canvas\n---\n{}\n",
        )
        .unwrap();
        fs::write(
            root.join("due-task.md"),
            "---\ntitre: Livraison\ndue: 2026-11-01\n---\nCorps\n",
        )
        .unwrap();

        let index = build_vault_index(root).unwrap();

        assert_eq!(index.files.len(), 4);
        assert!(index.files.iter().any(|f| f.doc_type == "kanban"));
        assert!(index.files.iter().any(|f| f.doc_type == "canvas"));
        assert!(index.files.iter().any(|f| f.title == "Architecture"));
        assert!(index.suggest.tags.iter().any(|t| t.tag == "rust" || t.tag == "inline"));
        assert!(index.tasks.iter().any(|t| t.text.contains("Faire B-057")));
        assert!(index.calendar.events.iter().any(|e| e.date == "2026-10-24"));
        assert!(index.calendar.events.iter().any(|e| e.date == "2026-11-01" && e.kind == "due"));

        // Cache hit
        let again = get_cached_vault_index(root).unwrap();
        assert_eq!(again.generation, index.generation);
        assert_eq!(again.files.len(), index.files.len());
    }

    #[test]
    fn test_detect_doc_type_path_heuristics() {
        assert_eq!(detect_doc_type("", "projet/mon-canvas.md"), "canvas");
        assert_eq!(detect_doc_type("---\ntype: slides\n---\n", "x.md"), "slides");
        assert_eq!(
            detect_doc_type("## A\n- [ ] x\n## B\n", "note.md"),
            "note"
        );
    }
}
