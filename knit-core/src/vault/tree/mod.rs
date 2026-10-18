mod path;
mod fs_ops;
mod trash;
mod rename;

pub use path::{
    is_media_ext, is_text_note_ext, is_vault_visible_file, is_watcher_relevant_file,
    normalize_rel_path, resolve_safe_path, FileNode,
};
pub use fs_ops::{
    create_dir, create_dir_with_guard, create_file, create_file_with_guard, delete_path,
    delete_path_with_guard, read_file_content, read_vault_tree, write_file_content,
    write_file_content_with_guard,
};
pub use trash::{
    commit_trash_to_os, recover_orphaned_trash, restore_trash_path, restore_trash_path_with_guard,
    trash_path, trash_path_with_guard, TrashRecord,
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
        assert!(!is_vault_visible_file("x.exe", Some("exe")));
    }
}
