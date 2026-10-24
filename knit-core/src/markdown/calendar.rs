//! KnitCalendarIndex — agrégation des échéances `@YYYY-MM-DD` et `due:` / `echeance:` (B-031a).

use regex::Regex;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::sync::LazyLock;

use crate::error::{KnitError, Result};
use crate::markdown::frontmatter::parse_frontmatter;
use crate::vault::tree::{resolve_safe_path, write_file_content_with_guard};
use crate::watcher::guard::WriteGuard;

/// `@2026-10-20`, `@2026-10-20 14:00`, `@2026-10-20 14:00-15:30`
static DATE_MENTION_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"@(\d{4}-\d{2}-\d{2})(?:\s+(\d{2}:\d{2})(?:-(\d{2}:\d{2}))?)?")
        .expect("date mention regex valide")
});

/// Mentions collaborateur / coffre : `@vault` ou `@Prénom` (hors dates ISO).
static ASSIGNEE_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"@(vault|[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9._-]*(?:\s+[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9._-]*)?)")
        .expect("assignee regex valide")
});

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CalendarEvent {
    pub id: String,
    pub title: String,
    pub date: String,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    /// `None` = implicite vault ; `"vault"` explicite ; sinon nom collaborateur.
    pub assignee: Option<String>,
    pub rel_path: String,
    pub line: usize,
    /// Fragment brut à réécrire lors d'un DnD (ex. `@2026-10-20 14:00-15:30`).
    pub source_span: String,
    pub kind: String,
    #[serde(default)]
    pub completed: bool,
    #[serde(default)]
    pub priority: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "camelCase")]
pub struct CalendarIndexData {
    pub events: Vec<CalendarEvent>,
}

fn extract_assignee(line: &str) -> Option<String> {
    for caps in ASSIGNEE_RE.captures_iter(line) {
        let raw = caps.get(1)?.as_str();
        // Ignorer les dates ISO capturées par erreur
        if raw.chars().next().map(|c| c.is_ascii_digit()).unwrap_or(false) {
            continue;
        }
        return Some(raw.trim().to_string());
    }
    None
}

fn title_from_task_line(line: &str) -> String {
    let trimmed = line.trim_start();
    let without_box = trimmed
        .strip_prefix("- [ ]")
        .or_else(|| trimmed.strip_prefix("- [/]"))
        .or_else(|| trimmed.strip_prefix("- [x]"))
        .or_else(|| trimmed.strip_prefix("- [-]"))
        .or_else(|| trimmed.strip_prefix("- [?]"))
        .or_else(|| trimmed.strip_prefix("- [>]"))
        .or_else(|| trimmed.strip_prefix("- [!]"))
        .unwrap_or(trimmed)
        .trim();

    // Retirer mentions date / assignee / priorités pour un titre lisible
    let mut title = without_box.to_string();
    title = DATE_MENTION_RE.replace_all(&title, "").to_string();
    title = ASSIGNEE_RE.replace_all(&title, "").to_string();
    title = title
        .replace("!p1", "")
        .replace("!p2", "")
        .replace("!p3", "")
        .trim()
        .trim_matches(|c: char| c == '-' || c == '|' || c.is_whitespace())
        .to_string();
    if title.is_empty() {
        "Événement".to_string()
    } else {
        title
    }
}

fn push_event_from_match(
    events: &mut Vec<CalendarEvent>,
    rel_path: &str,
    line_idx: usize,
    line: &str,
    caps: &regex::Captures,
    kind: &str,
    title_override: Option<&str>,
    completed: bool,
    priority: Option<String>,
) {
    let date = caps.get(1).map(|m| m.as_str().to_string()).unwrap_or_default();
    if date.is_empty() {
        return;
    }
    let start_time = caps.get(2).map(|m| m.as_str().to_string());
    let end_time = caps.get(3).map(|m| m.as_str().to_string());
    let source_span = caps.get(0).map(|m| m.as_str().to_string()).unwrap_or_default();
    let assignee = extract_assignee(line);
    let title = title_override
        .map(|s| s.to_string())
        .unwrap_or_else(|| title_from_task_line(line));

    let id = format!("{}:{}:{}", rel_path, line_idx, date);
    events.push(CalendarEvent {
        id,
        title,
        date,
        start_time,
        end_time,
        assignee,
        rel_path: rel_path.to_string(),
        line: line_idx,
        source_span,
        kind: kind.to_string(),
        completed,
        priority,
    });
}

/// Extrait les événements calendrier d'un seul fichier Markdown (FM due + mentions `@date`).
pub fn extract_calendar_events_from_content(rel_path: &str, content: &str) -> Vec<CalendarEvent> {
    let mut events = Vec::new();
    let fm = parse_frontmatter(content);
    let file_name = Path::new(rel_path)
        .file_name()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| rel_path.to_string());

    let fm_statut = fm
        .fields
        .get("statut")
        .or_else(|| fm.fields.get("status"))
        .map(|s| s.to_lowercase());
    let fm_completed = fm_statut
        .as_deref()
        .map(|s| s == "termine" || s == "terminé" || s == "done")
        .unwrap_or(false);
    let fm_priority = fm
        .fields
        .get("priorite")
        .or_else(|| fm.fields.get("priority"))
        .map(|p| {
            let p_low = p.to_lowercase();
            if p_low.contains("haute")
                || p_low.contains("urgent")
                || p_low == "p1"
                || p_low.contains("!p1")
            {
                "p1".to_string()
            } else if p_low.contains("moyenne") || p_low == "p2" || p_low.contains("!p2") {
                "p2".to_string()
            } else if p_low.contains("basse")
                || p_low.contains("faible")
                || p_low == "p3"
                || p_low.contains("!p3")
            {
                "p3".to_string()
            } else {
                p.to_string()
            }
        });

    for key in ["due", "echeance", "échéance"] {
        if let Some(raw) = fm.fields.get(key) {
            let raw = raw.trim().trim_matches('"').trim_matches('\'');
            if let Some(caps) = DATE_MENTION_RE.captures(&format!("@{raw}")) {
                let titre = fm
                    .fields
                    .get("titre")
                    .cloned()
                    .or_else(|| fm.fields.get("title").cloned())
                    .unwrap_or_else(|| {
                        Path::new(&file_name)
                            .file_stem()
                            .map(|s| s.to_string_lossy().to_string())
                            .unwrap_or_else(|| "Échéance".to_string())
                    });
                let assignee = fm.fields.get("assigne").cloned();
                let date = caps
                    .get(1)
                    .map(|m| m.as_str().to_string())
                    .unwrap_or_default();
                events.push(CalendarEvent {
                    id: format!("{rel_path}:fm:{key}"),
                    title: titre,
                    date,
                    start_time: caps.get(2).map(|m| m.as_str().to_string()),
                    end_time: caps.get(3).map(|m| m.as_str().to_string()),
                    assignee,
                    rel_path: rel_path.to_string(),
                    line: 0,
                    source_span: format!("{key}: {raw}"),
                    kind: "due".to_string(),
                    completed: fm_completed,
                    priority: fm_priority.clone(),
                });
            } else if raw.len() >= 10
                && raw.as_bytes().get(4) == Some(&b'-')
                && raw.as_bytes().get(7) == Some(&b'-')
                && raw[..4].bytes().all(|b| b.is_ascii_digit())
            {
                let date = raw[..10].to_string();
                let titre = fm
                    .fields
                    .get("titre")
                    .cloned()
                    .or_else(|| fm.fields.get("title").cloned())
                    .unwrap_or_else(|| "Échéance".to_string());
                events.push(CalendarEvent {
                    id: format!("{rel_path}:fm:{key}"),
                    title: titre,
                    date,
                    start_time: None,
                    end_time: None,
                    assignee: fm.fields.get("assigne").cloned(),
                    rel_path: rel_path.to_string(),
                    line: 0,
                    source_span: format!("{key}: {raw}"),
                    kind: "due".to_string(),
                    completed: fm_completed,
                    priority: fm_priority.clone(),
                });
            }
        }
    }

    let mut in_code = false;
    for (idx, line) in content.lines().enumerate() {
        let trimmed = line.trim_start();
        if trimmed.starts_with("```") {
            in_code = !in_code;
            continue;
        }
        if in_code {
            continue;
        }

        for caps in DATE_MENTION_RE.captures_iter(line) {
            let is_task = trimmed.starts_with("- [");
            let kind = if is_task { "task" } else { "inline" };
            let completed = trimmed.starts_with("- [x]") || trimmed.starts_with("- [X]");
            let priority = if line.contains("!p1") {
                Some("p1".to_string())
            } else if line.contains("!p2") {
                Some("p2".to_string())
            } else if line.contains("!p3") {
                Some("p3".to_string())
            } else {
                None
            };

            push_event_from_match(
                &mut events,
                rel_path,
                idx + 1,
                line,
                &caps,
                kind,
                None,
                completed,
                priority,
            );
        }
    }

    events
}

/// Construit l'index calendrier du coffre (délègue au scan unifié B-057).
pub fn build_calendar_index(vault_root: &Path) -> Result<CalendarIndexData> {
    let index = crate::markdown::vault_index::get_cached_vault_index(vault_root)?;
    Ok(index.calendar)
}

/// Réécrit la date (et optionnellement l'heure) d'un événement dans le fichier source.
pub fn update_calendar_event_date(
    vault_root: &Path,
    rel_path: &str,
    source_span: &str,
    new_date: &str,
    new_start: Option<&str>,
    new_end: Option<&str>,
    guard: &WriteGuard,
) -> Result<()> {
    let safe_path = resolve_safe_path(vault_root, rel_path)?;
    if !safe_path.exists() {
        return Err(KnitError::FileNotFound(rel_path.to_string()));
    }

    let content = fs::read_to_string(&safe_path)?;
    if source_span.is_empty() || !content.contains(source_span) {
        return Err(KnitError::Custom(format!(
            "Fragment calendrier introuvable dans {rel_path}: {source_span}"
        )));
    }

    let replacement = if let Some(start) = new_start {
        if let Some(end) = new_end {
            format!("@{new_date} {start}-{end}")
        } else {
            format!("@{new_date} {start}")
        }
    } else if source_span.starts_with("due:") || source_span.starts_with("echeance:") || source_span.starts_with("échéance:") {
        // Frontmatter : conserver la clé
        let key = source_span
            .split(':')
            .next()
            .unwrap_or("due")
            .trim();
        if let Some(start) = new_start {
            if let Some(end) = new_end {
                format!("{key}: {new_date} {start}-{end}")
            } else {
                format!("{key}: {new_date} {start}")
            }
        } else {
            format!("{key}: {new_date}")
        }
    } else {
        format!("@{new_date}")
    };

    let updated = content.replacen(source_span, &replacement, 1);
    write_file_content_with_guard(vault_root, rel_path, &updated, guard)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::vault::tree;
    use tempfile::tempdir;

    #[test]
    fn test_build_calendar_index_parses_dates_and_ranges() {
        let dir = tempdir().expect("tempdir");
        let root = dir.path();
        tree::create_file(
            root,
            "notes.md",
            Some(
                "---\ntitre: Demo\ndue: 2026-11-01\nassigne: Alice\n---\n\n# Demo\n\n- [ ] Point sprint @2026-10-20 14:00-15:30 @vault\n- [ ] Relire doc @2026-10-21 @Bob\n",
            ),
        )
        .expect("create");

        let index = build_calendar_index(root).expect("index");
        assert!(index.events.len() >= 3);
        assert!(index.events.iter().any(|e| e.date == "2026-10-20" && e.start_time.as_deref() == Some("14:00")));
        assert!(index.events.iter().any(|e| e.date == "2026-11-01" && e.kind == "due"));
    }

    #[test]
    fn test_update_calendar_event_date_rewrites_span() {
        let dir = tempdir().expect("tempdir");
        let root = dir.path();
        let guard = WriteGuard::new();
        tree::create_file(
            root,
            "t.md",
            Some("- [ ] Faire X @2026-10-20 10:00\n"),
        )
        .expect("create");

        update_calendar_event_date(
            root,
            "t.md",
            "@2026-10-20 10:00",
            "2026-10-22",
            Some("11:30"),
            None,
            &guard,
        )
        .expect("update");

        let content = tree::read_file_content(root, "t.md").expect("read");
        assert!(content.contains("@2026-10-22 11:30"));
        assert!(!content.contains("@2026-10-20 10:00"));
    }
}
