mod path;
mod fs_ops;
mod trash;
mod rename;

pub use path::{
    file_mtime_ms, is_media_ext, is_text_note_ext, is_vault_visible_file, is_watcher_relevant_file,
    normalize_rel_path, resolve_safe_path, FileNode,
};
pub use fs_ops::{
    create_dir, create_dir_with_guard, create_file, create_file_with_guard, delete_path,
    delete_path_with_guard, read_file_content, read_vault_tree, write_file_content,
    write_file_content_with_guard,
};
pub use trash::{
    commit_trash_to_os, list_trash_records, purge_all_trash, purge_trash_item, read_trash_preview,
    recover_orphaned_trash, restore_trash_path, restore_trash_path_with_guard, trash_container_path,
    trash_dir, trash_path, trash_path_with_guard, TrashRecord,
};
pub use rename::rename_file_and_refactor;

#[cfg(test)]
mod tests {
    use super::path::is_vault_visible_file;
    use super::*;
    use std::fs;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_vault(label: &str) -> PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .unwrap_or(0);
        let dir = std::env::temp_dir().join(format!("knit-tree-{}-{}", label, nanos));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).expect("temp vault");
        dir
    }

    #[test]
    fn tree_includes_markdown_and_media_under_assets() {
        let root = temp_vault("media");
        fs::create_dir_all(root.join("assets")).unwrap();
        fs::write(root.join("note.md"), "# hi\n").unwrap();
        fs::write(root.join("assets").join("logo.svg"), "<svg></svg>").unwrap();
        fs::write(root.join("assets").join("shot.png"), [0u8; 8]).unwrap();
        fs::write(root.join("secret.bin"), [1u8; 4]).unwrap();

        let tree = read_vault_tree(&root).expect("tree");
        let names: Vec<&str> = tree.iter().map(|n| n.name.as_str()).collect();
        assert!(names.contains(&"note.md"));
        assert!(names.contains(&"assets"));
        assert!(!names.contains(&"secret.bin"));

        let assets = tree.iter().find(|n| n.name == "assets").expect("assets dir");
        let media: Vec<&str> = assets.children.iter().map(|c| c.name.as_str()).collect();
        assert!(media.contains(&"logo.svg"));
        assert!(media.contains(&"shot.png"));

        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn visible_file_helpers() {
        assert!(is_vault_visible_file("x.md", Some("md")));
        assert!(is_vault_visible_file("a.SVG", Some("SVG")));
        assert!(is_vault_visible_file("KNIT.md", None));
        assert!(is_vault_visible_file(".knitshare", None));
        assert!(is_vault_visible_file(".cursorrules", None));
        assert!(!is_vault_visible_file("x.exe", Some("exe")));
    }

    #[test]
    fn tree_lists_dot_meta_including_knit_folder() {
        use crate::vault::walk::{is_always_excluded_name, is_watcher_ignored_name};

        let root = temp_vault("dots");
        fs::write(root.join("note.md"), "# hi\n").unwrap();
        fs::write(root.join(".knitshare"), "name: t\n").unwrap();
        fs::create_dir_all(root.join(".cursor").join("rules")).unwrap();
        fs::write(root.join(".cursor").join("rules").join("knit.mdc"), "x").unwrap();
        fs::create_dir_all(root.join(".knit")).unwrap();
        fs::write(root.join(".knit").join("AI_MEMORY.md"), "# mem\n").unwrap();
        fs::write(root.join(".knit").join("config.yaml"), "theme: auto\n").unwrap();
        fs::create_dir_all(root.join("node_modules")).unwrap();
        fs::write(root.join("node_modules").join("x.md"), "# no\n").unwrap();

        let tree = read_vault_tree(&root).expect("tree");
        let names: Vec<&str> = tree.iter().map(|n| n.name.as_str()).collect();
        assert!(names.contains(&"note.md"));
        assert!(names.contains(&".knitshare"));
        assert!(names.contains(&".cursor"));
        assert!(names.contains(&".knit"));
        assert!(!names.contains(&"node_modules"));
        assert!(!is_always_excluded_name(".knit"));
        assert!(is_watcher_ignored_name(".knit"));

        let knit = tree.iter().find(|n| n.name == ".knit").expect(".knit");
        let knit_names: Vec<&str> = knit.children.iter().map(|c| c.name.as_str()).collect();
        assert!(knit_names.contains(&"AI_MEMORY.md"));
        assert!(knit_names.contains(&"config.yaml"));

        let _ = fs::remove_dir_all(&root);
    }
}
