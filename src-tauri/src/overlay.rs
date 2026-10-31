use crate::model::{AppState, OverlayLayout};
use tauri::{Emitter, Manager};

pub fn synchronize(
    app: &tauri::AppHandle,
    state: &AppState,
    reposition: bool,
) -> Result<(), String> {
    let window = app
        .get_webview_window("overlay")
        .ok_or("Overlay não encontrado")?;
    if reposition {
        window
            .set_position(tauri::PhysicalPosition::new(
                state.settings.x,
                state.settings.y,
            ))
            .map_err(|error| error.to_string())?;
    }
    window
        .set_ignore_cursor_events(state.settings.locked)
        .map_err(|error| error.to_string())?;
    if let Some(current_match) = &state.current_match {
        let (width, base_height, row_height) = match state.settings.layout {
            OverlayLayout::Detailed => (480.0, 136.0, 150.0),
            OverlayLayout::Compact => (400.0, 116.0, 102.0),
        };
        let height = base_height + current_match.players.len() as f64 * row_height;
        window
            .set_size(tauri::LogicalSize::new(width, height))
            .map_err(|error| error.to_string())?;
    }
    app.emit("state-changed", state)
        .map_err(|error| error.to_string())?;
    if state.current_match.is_some() {
        window.show().map_err(|error| error.to_string())?;
    } else {
        window.hide().map_err(|error| error.to_string())?;
    }
    Ok(())
}
