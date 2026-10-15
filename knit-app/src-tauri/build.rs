fn main() {
    let attributes = tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&[
            "get_vault_tree",
            "read_vault_file",
            "write_vault_file",
            "create_vault_file",
            "create_vault_dir",
            "pick_vault_folder",
        ]),
    );
    tauri_build::try_build(attributes).expect("Erreur lors de la compilation de tauri-build");
}

