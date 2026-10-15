mod commands;

use commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            get_vault_tree,
            read_vault_file,
            write_vault_file,
            create_vault_file,
            create_vault_dir,
            pick_vault_folder,
            reveal_in_explorer,
        ])
        .run(tauri::generate_context!())
        .expect("Erreur lors de l'exécution de l'application Knit Tauri");
}
