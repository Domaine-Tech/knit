pub mod frontmatter;
pub mod links;

pub use frontmatter::{get_frontmatter_field, parse_frontmatter, update_frontmatter_field, FrontmatterDoc};
pub use links::{
    compute_relative_path, find_backlinks_in_vault, refactor_links_in_content, refactor_links_in_vault,
    LinkRefactorReport,
};
