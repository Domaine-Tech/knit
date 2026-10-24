use tauri::{AppHandle, Manager};

/// Met à jour le tooltip (et le titre) de l'icône tray selon l'état réseau.
/// `status` : `offline` | `lan` | `connected`
#[tauri::command]
pub async fn set_tray_network_status(app: AppHandle, status: String) -> Result<(), String> {
    let tooltip = match status.as_str() {
        "connected" => "Knit — connecté",
        "lan" => "Knit — réseau local strict",
        _ => "Knit — hors-ligne",
    };

    if let Some(tray) = app.tray_by_id("main") {
        tray.set_tooltip(Some(tooltip))
            .map_err(|e| format!("tray tooltip: {e}"))?;
        #[cfg(target_os = "windows")]
        {
            let _ = tray.set_title(Some(match status.as_str() {
                "connected" => "●",
                "lan" => "◐",
                _ => "○",
            }));
        }
    }

    // Focus window helper for frontend-triggered show (unused payload)
    let _ = app.get_webview_window("main");
    Ok(())
}
