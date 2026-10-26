mod commands;

use commands::*;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState::default())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let show_i = MenuItem::with_id(app, "show", "Ouvrir", true, None::<&str>)?;
            let settings_i =
                MenuItem::with_id(app, "settings", "Paramètres", true, None::<&str>)?;
            let check_updates_i = MenuItem::with_id(
                app,
                "check-updates",
                "Vérifier les mises à jour",
                true,
                None::<&str>,
            )?;
            let relaunch_update_i = MenuItem::with_id(
                app,
                "relaunch-update",
                "Redémarrer pour appliquer",
                false,
                None::<&str>,
            )?;
            {
                let state = app.state::<AppState>();
                *state
                    .tray_relaunch_item
                    .lock()
                    .map_err(|e| format!("tray relaunch lock: {e}"))? =
                    Some(relaunch_update_i.clone());
            }
            let quit_i = MenuItem::with_id(app, "quit", "Quitter", true, None::<&str>)?;
            let menu = Menu::with_items(
                app,
                &[
                    &show_i,
                    &settings_i,
                    &check_updates_i,
                    &relaunch_update_i,
                    &quit_i,
                ],
            )?;

            let icon = app
                .default_window_icon()
                .cloned()
                .ok_or_else(|| "Icône fenêtre manquante pour le tray".to_string())?;

            let _tray = TrayIconBuilder::with_id("main")
                .icon(icon)
                .menu(&menu)
                .tooltip("Knit — hors-ligne")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "settings" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                            let _ = window.emit("knit-open-settings", ());
                        }
                    }
                    "check-updates" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                            let _ = window.emit("knit-check-updates", ());
                        }
                    }
                    "relaunch-update" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                            let _ = window.emit("knit-relaunch-for-update", ());
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
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
            is_vault_initialized,
            init_vault,
            prepare_join_vault,
            get_vault_share,
            inspect_join_folder,
            get_vault_config,
            save_vault_config,
            list_vault_trash,
            purge_vault_trash_item,
            purge_all_vault_trash,
            read_trash_preview,
            commit_vault_trash_respecting_mode,
            reveal_in_explorer,
            start_vault_watcher,
            stop_vault_watcher,
            save_vault_asset,
            rename_vault_file,
            parse_frontmatter,
            update_frontmatter,
            get_file_backlinks,
            recover_vault_trash,
            start_p2p_network,
            stop_p2p_network,
            get_p2p_invitation_code,
            get_p2p_pin_code,
            refresh_p2p_pin_code,
            connect_p2p_by_pin,
            connect_p2p_peer,
            get_connected_peers,
            broadcast_yjs_update,
            broadcast_awareness,
            sync_asset_from_peers,
            get_local_peer_identity,
            get_user_profile,
            save_user_profile,
            upload_user_avatar,
            reset_user_avatar,
            apply_profile_to_git,
            save_doc_snapshot,
            list_doc_snapshots,
            load_latest_doc_snapshot,
            send_p2p_sync_step1,
            send_p2p_sync_step2,
            load_avatar_base64,
            replicate_vault,
            store_crdt_state,
            load_crdt_state_cmd,
            search_vault,
            get_vault_tasks,
            update_task_status,
            get_vault_tags,
            get_suggest_index,
            get_calendar_index,
            update_calendar_event_date,
            get_vault_index,
            invalidate_vault_index,
            index_markdown_content,
            open_external_path,
            set_tray_network_status,
            set_tray_relaunch_enabled,
        ])
        .run(tauri::generate_context!())
        .expect("Erreur lors de l'exécution de l'application Knit Tauri");
}
