fn main() {
    let attributes = tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&[
            "get_vault_tree",
            "read_vault_file",
            "write_vault_file",
            "create_vault_file",
            "create_vault_dir",
            "delete_vault_path",
            "trash_vault_path",
            "restore_vault_path",
            "commit_vault_trash",
            "pick_vault_folder",
            "reveal_in_explorer",
            "start_vault_watcher",
            "stop_vault_watcher",
            "save_vault_asset",
            "rename_vault_file",
            "parse_frontmatter",
            "update_frontmatter",
            "get_file_backlinks",
            "recover_vault_trash",
        ]),
    );
    tauri_build::try_build(attributes).expect("Erreur lors de la compilation de tauri-build");
}
