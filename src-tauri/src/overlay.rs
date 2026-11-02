use crate::model::AppState;
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
        let (width, height) = crate::layout::overlay_size(current_match, &state.settings.layout);
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
