use crate::commands::{ipc, AppState};
use knit_core::markdown::{
    build_calendar_index as core_build_calendar_index,
    build_suggest_index as core_build_suggest_index,
    collect_vault_tags as core_collect_tags, collect_vault_tasks as core_collect_tasks,
    find_backlinks_in_vault, parse_frontmatter as core_parse_fm,
    search_vault as core_search_vault, update_calendar_event_date as core_update_calendar_date,
    update_frontmatter_field as core_update_fm,
    update_task_status as core_update_task_status, CalendarIndexData, FileSearchResult,
    FrontmatterDoc, SuggestIndexData, TagInfo, TaskCard,
};
use std::path::Path;

#[tauri::command]
pub async fn parse_frontmatter(content: String) -> Result<FrontmatterDoc, String> {
    Ok(core_parse_fm(&content))
}

#[tauri::command]
pub async fn update_frontmatter(
    content: String,
    key: String,
    value: String,
) -> Result<String, String> {
    Ok(core_update_fm(&content, &key, &value))
}

#[tauri::command]
pub async fn get_file_backlinks(
    vault_path: String,
    rel_path: String,
) -> Result<Vec<String>, String> {
    let path = Path::new(&vault_path);
    ipc(find_backlinks_in_vault(path, &rel_path))
}

#[tauri::command]
pub async fn search_vault(vault_path: String, query: String) -> Result<Vec<FileSearchResult>, String> {
    let p = Path::new(&vault_path);
    ipc(core_search_vault(p, &query))
}

#[tauri::command]
pub async fn get_vault_tasks(vault_path: String) -> Result<Vec<TaskCard>, String> {
    let p = Path::new(&vault_path);
    ipc(core_collect_tasks(p))
}

#[tauri::command]
pub async fn update_task_status(
    state: tauri::State<'_, AppState>,
    vault_path: String,
    rel_path: String,
    new_status: String,
) -> Result<(), String> {
    let p = Path::new(&vault_path);
    ipc(core_update_task_status(p, &rel_path, &new_status, &state.guard))
}

#[tauri::command]
pub async fn get_vault_tags(vault_path: String) -> Result<Vec<TagInfo>, String> {
    let p = Path::new(&vault_path);
    ipc(core_collect_tags(p))
}

#[tauri::command]
pub async fn get_suggest_index(vault_path: String) -> Result<SuggestIndexData, String> {
    let p = Path::new(&vault_path);
    ipc(core_build_suggest_index(p))
}

#[tauri::command]
pub async fn get_calendar_index(vault_path: String) -> Result<CalendarIndexData, String> {
    let p = Path::new(&vault_path);
    ipc(core_build_calendar_index(p))
}

#[tauri::command]
pub async fn update_calendar_event_date(
    state: tauri::State<'_, AppState>,
    vault_path: String,
    rel_path: String,
    source_span: String,
    new_date: String,
    new_start: Option<String>,
    new_end: Option<String>,
) -> Result<(), String> {
    let p = Path::new(&vault_path);
    ipc(core_update_calendar_date(
        p,
        &rel_path,
        &source_span,
        &new_date,
        new_start.as_deref(),
        new_end.as_deref(),
        &state.guard,
    ))
}

#[tauri::command]
pub async fn open_external_path(path_or_url: String) -> Result<(), String> {
    let raw = path_or_url.trim();
    if raw.is_empty() {
        return Ok(());
    }

    let clean = if let Some(stripped) = raw.strip_prefix("file:///") {
        stripped
    } else if let Some(stripped) = raw.strip_prefix("file://") {
        stripped
    } else {
        raw
    };

    #[cfg(target_os = "windows")]
    let p = Path::new(clean);

    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        if clean.starts_with("http://") || clean.starts_with("https://") || clean.starts_with("mailto:") {
            Command::new("cmd")
                .args(["/c", "start", "", clean])
                .creation_flags(CREATE_NO_WINDOW)
                .spawn()
                .map_err(|e| e.to_string())?;
        } else if p.is_dir() {
            Command::new("explorer")
                .arg(p)
                .spawn()
                .map_err(|e| e.to_string())?;
        } else {
            Command::new("cmd")
                .args(["/c", "start", "", clean])
                .creation_flags(CREATE_NO_WINDOW)
                .spawn()
                .map_err(|e| e.to_string())?;
        }
    }

    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        Command::new("open")
            .arg(clean)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "linux")]
    {
        use std::process::Command;
        Command::new("xdg-open")
            .arg(clean)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}
