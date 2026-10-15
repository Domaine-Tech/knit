mod commands;

use commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState::default())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            get_vault_tree,
            read_vault_file,
            write_vault_file,
            create_vault_file,
            create_vault_dir,
            delete_vault_path,
            trash_vault_path,
            restore_vault_path,
            commit_vault_trash,
            pick_vault_folder,
            reveal_in_explorer,
            start_vault_watcher,
            stop_vault_watcher,
            save_vault_asset,
            rename_vault_file,
            parse_frontmatter,
            update_frontmatter,
            get_file_backlinks,
        ])
        .run(tauri::generate_context!())
        .expect("Erreur lors de l'exécution de l'application Knit Tauri");
}
