use crate::{
    commands::SharedState,
    model::{AppState, MatchSource},
};
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
        refresh_geometry(&window, state)?;
    }
    window
        .set_ignore_cursor_events(state.settings.locked)
        .map_err(|error| error.to_string())?;
    app.emit("state-changed", state)
        .map_err(|error| error.to_string())?;
    refresh_visibility(&window, state)
}

fn refresh_geometry(window: &tauri::WebviewWindow, state: &AppState) -> Result<(), String> {
    let size = state
        .current_match
        .as_ref()
        .map(|current| crate::layout::overlay_size(current, &state.settings.layout))
        .unwrap_or((480.0, 436.0));
    crate::displays::apply(window, &state.settings, size)
}

pub fn should_show(state: &AppState, game_focused: bool) -> bool {
    state.current_match.as_ref().is_some_and(|current| {
        state.hidden_match_id.as_ref() != Some(&current.id)
            && (matches!(current.source, MatchSource::Demo)
                || !state.settings.focus_only
                || game_focused)
    })
}

fn refresh_visibility(window: &tauri::WebviewWindow, state: &AppState) -> Result<(), String> {
    let needs_focus = state
        .current_match
        .as_ref()
        .is_some_and(|current| matches!(current.source, MatchSource::Live))
        && state.settings.focus_only;
    let visible = should_show(
        state,
        !needs_focus || crate::focus::game_is_foreground(window, !state.settings.locked),
    );
    if window.is_visible().map_err(|error| error.to_string())? == visible {
        return Ok(());
    }
    if visible {
        show_without_focus(window)?;
    } else {
        window.hide().map_err(|error| error.to_string())?;
    }
    Ok(())
}

#[cfg(windows)]
fn show_without_focus(window: &tauri::WebviewWindow) -> Result<(), String> {
    use windows_sys::Win32::UI::WindowsAndMessaging::{ShowWindow, SW_SHOWNOACTIVATE};
    let handle = window.hwnd().map_err(|error| error.to_string())?;
    unsafe {
        ShowWindow(handle.0, SW_SHOWNOACTIVATE);
    }
    Ok(())
}

#[cfg(not(windows))]
fn show_without_focus(window: &tauri::WebviewWindow) -> Result<(), String> {
    window.show().map_err(|error| error.to_string())
}

pub async fn watch_desktop(app: tauri::AppHandle) {
    let mut ticks = 0u8;
    loop {
        tokio::time::sleep(std::time::Duration::from_millis(500)).await;
        let snapshot = match app.state::<SharedState>().lock() {
            Ok(state) => state.clone(),
            Err(_) => continue,
        };
        let Some(window) = app.get_webview_window("overlay") else {
            return;
        };
        if let Err(error) = refresh_visibility(&window, &snapshot) {
            eprintln!("{error}");
        }
        ticks = (ticks + 1) % 8;
        if ticks == 0 {
            if let Err(error) = refresh_geometry(&window, &snapshot) {
                eprintln!("{error}");
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn focus_and_manual_hiding_do_not_end_or_leak_into_the_next_match() {
        let mut state = AppState::default();
        let match_data = serde_json::json!({"id":"one","gameId":"aoe2-de","mode":"quick","map":"Arena","source":"live","players":[]});
        state.current_match = Some(serde_json::from_value(match_data).unwrap());
        assert!(!should_show(&state, false));
        assert!(should_show(&state, true));
        state.settings.focus_only = false;
        assert!(should_show(&state, false));
        state.hidden_match_id = Some("one".into());
        assert!(!should_show(&state, true));
        state.current_match.as_mut().unwrap().id = "two".into();
        assert!(should_show(&state, true));
        state.settings.focus_only = true;
        state.current_match.as_mut().unwrap().source = MatchSource::Demo;
        assert!(should_show(&state, false));
        state.current_match = None;
        assert!(!should_show(&state, true));
    }
}
