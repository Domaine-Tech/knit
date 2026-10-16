pub mod frontmatter;
pub mod links;
pub mod search;
pub mod tags;
pub mod tasks;

pub use frontmatter::{get_frontmatter_field, parse_frontmatter, update_frontmatter_field, FrontmatterDoc};
pub use links::{
    compute_relative_path, find_backlinks_in_vault, refactor_links_in_content, refactor_links_in_vault,
    LinkRefactorReport,
};
pub use search::{search_vault, FileSearchResult, SearchQueryFilter, SearchSnippet};
pub use tags::{collect_vault_tags, TagInfo};
pub use tasks::{collect_vault_tasks, update_task_status, TaskCard};

