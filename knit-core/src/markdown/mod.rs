pub mod calendar;
pub mod frontmatter;
pub mod links;
pub mod patterns;
pub mod search;
pub mod suggest;
pub mod tags;
pub mod tasks;
pub mod vault_index;

pub use calendar::{
    build_calendar_index, extract_calendar_events_from_content, update_calendar_event_date,
    CalendarEvent, CalendarIndexData,
};
pub use frontmatter::{get_frontmatter_field, parse_frontmatter, update_frontmatter_field, FrontmatterDoc};
pub use links::{
    compute_relative_path, count_links_to_target, find_backlinks_in_vault, refactor_links_in_content,
    refactor_links_in_vault, LinkRefactorReport,
};
pub use search::{search_vault, FileSearchResult, SearchQueryFilter, SearchSnippet};
pub use suggest::{
    build_suggest_index, detect_doc_type, extract_headings_from_content, slugify_heading, HeadingItem,
    SuggestDocItem, SuggestIndexData, SuggestTagItem,
};
pub use tags::{collect_vault_tags, TagInfo};
pub use tasks::{collect_vault_tasks, update_task_status, TaskCard};
pub use vault_index::{
    build_and_cache_vault_index, build_vault_index, build_vault_index_from_contents,
    current_vault_index_generation, get_cached_vault_index, index_markdown_file,
    invalidate_vault_index_cache, FrontmatterFileEntry, IndexedInlineTask, IndexedMarkdownSlice,
    VaultIndexData,
};


