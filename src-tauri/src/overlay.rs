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
    refresh_visibility(&window, state, reposition).map(|_| ())
}

fn refresh_geometry(window: &tauri::WebviewWindow, state: &AppState) -> Result<(), String> {
    let size = state
        .current_match
        .as_ref()
        .map(|current| {
            crate::layout::window_size(
                current,
                &state.settings,
                state.settings.show_session
                    && crate::games::sc2::session::active_for(window.app_handle(), current),
            )
        })
        .unwrap_or((480.0, 436.0));
    let size = if state.current_match.is_none() && displayed_match(state).is_some() {
        (400.0, 164.0)
    } else {
        size
    };
    crate::displays::apply(window, &state.settings, size)
}

pub fn displayed_match(state: &AppState) -> Option<&crate::model::MatchSnapshot> {
    state.current_match.as_ref().or_else(|| {
        state
            .post_game
            .as_ref()
            .filter(|card| {
                ((matches!(card.game.source, MatchSource::Demo)
                    && !state.detection.config.enabled
                    && card.game.game_id == state.detection.config.game_id)
                    || (!matches!(card.game.source, MatchSource::Demo)
                        && state.detection.config.enabled
                        && card.game.belongs_to(&state.detection.config)))
                    && state.settings.post_game_seconds > 0
                    && card.expires_at > chrono::Utc::now()
            })
            .map(|card| &card.game)
    })
}

pub fn should_show(state: &AppState, game_focused: bool) -> bool {
    displayed_match(state).is_some_and(|current| {
        state.hidden_match_id.as_ref() != Some(&current.id)
            && (matches!(current.source, MatchSource::Demo)
                || !state.settings.focus_only
                || game_focused)
    })
}

fn refresh_visibility(
    window: &tauri::WebviewWindow,
    state: &AppState,
    raise: bool,
) -> Result<Option<&'static str>, String> {
    let needs_focus = displayed_match(state)
        .is_some_and(|current| matches!(current.source, MatchSource::Live))
        && state.settings.focus_only;
    let visible = should_show(
        state,
        !needs_focus
            || crate::focus::game_is_foreground(
                window,
                !state.settings.locked,
                &state.detection.config.game_id,
            ),
    );
    let was_visible = window.is_visible().map_err(|error| error.to_string())?;
    if was_visible == visible
        && (!visible || (!raise && is_topmost(window)? && is_above_foreground(window)?))
    {
        return Ok(None);
    }
    set_visibility(window, visible)?;
    Ok((was_visible != visible).then_some(if visible {
        "Overlay exibido."
    } else if state.current_match.is_none() {
        "Overlay ocultado: nenhuma partida ativa."
    } else if state.hidden_match_id.as_ref() == state.current_match.as_ref().map(|game| &game.id) {
        "Overlay ocultado pelo usuário."
    } else {
        "Overlay ocultado: jogo fora de foco ou foco indisponível."
    }))
}

#[cfg(windows)]
fn is_above_foreground(window: &tauri::WebviewWindow) -> Result<bool, String> {
    Ok(crate::visibility::is_above_foreground(
        window.hwnd().map_err(|error| error.to_string())?.0,
    ))
}

#[cfg(not(windows))]
fn is_above_foreground(_: &tauri::WebviewWindow) -> Result<bool, String> {
    Ok(true)
}

#[cfg(windows)]
fn is_topmost(window: &tauri::WebviewWindow) -> Result<bool, String> {
    Ok(crate::visibility::is_topmost(
        window.hwnd().map_err(|error| error.to_string())?.0,
    ))
}

#[cfg(not(windows))]
fn is_topmost(_: &tauri::WebviewWindow) -> Result<bool, String> {
    Ok(true)
}

#[cfg(windows)]
fn set_visibility(window: &tauri::WebviewWindow, visible: bool) -> Result<(), String> {
    let handle = window.hwnd().map_err(|error| error.to_string())?;
    // A visibilidade nativa não atualiza o cache do Tauri; show e hide devem usar Win32.
    crate::visibility::set_native_visibility(handle.0, visible)?;
    Ok(())
}

#[cfg(not(windows))]
fn set_visibility(window: &tauri::WebviewWindow, visible: bool) -> Result<(), String> {
    if visible {
        window.show()
    } else {
        window.hide()
    }
    .map_err(|error| error.to_string())
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
        match refresh_visibility(&window, &snapshot, false) {
            Ok(Some(reason)) => {
                if let Ok(mut state) = app.state::<SharedState>().lock() {
                    crate::diagnostics::record(&mut state, "visibility", reason);
                }
            }
            Err(error) => eprintln!("{error}"),
            Ok(None) => {}
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

    #[test]
    fn post_game_expires_and_respects_profile_focus_hiding_and_next_game() {
        let mut state = AppState::default();
        state.detection.config = crate::detection::model::DetectionConfig {
            game_id: "sc2".into(),
            enabled: true,
            profile: Some(crate::detection::model::Profile {
                profile_id: 42,
                name: "Nova".into(),
            }),
        };
        let game = serde_json::from_value(serde_json::json!({"id":"result","gameId":"sc2","mode":"unknown","map":"Arena","source":"live","selfPlayerId":"42","players":[{"id":"42","name":"Nova","civilization":"TERRAN","uniqueUnits":[],"symbol":""}]})).unwrap();
        state.post_game = Some(crate::model::PostGame {
            game,
            opponent_id: None,
            expires_at: chrono::Utc::now() + chrono::Duration::seconds(8),
        });
        assert!(should_show(&state, true));
        assert!(!should_show(&state, false));
        state.hidden_match_id = Some("result".into());
        assert!(!should_show(&state, true));
        state.hidden_match_id = None;
        state.settings.post_game_seconds = 0;
        assert!(!should_show(&state, true));
        state.settings.post_game_seconds = 8;
        state.detection.config.profile.as_mut().unwrap().profile_id = 99;
        assert!(!should_show(&state, true));
        state.detection.config.profile.as_mut().unwrap().profile_id = 42;
        state.post_game.as_mut().unwrap().expires_at =
            chrono::Utc::now() - chrono::Duration::seconds(1);
        assert!(!should_show(&state, true));
        let mut next = state.post_game.as_ref().unwrap().game.clone();
        next.id = "next".into();
        state.current_match = Some(next);
        assert_eq!(displayed_match(&state).unwrap().id, "next");
    }

    #[test]
    fn post_game_demo_needs_no_profile_or_focus_but_cannot_cross_game_or_detection_scope() {
        let mut state = AppState::default();
        state.detection.config.game_id = "sc2".into();
        let game = serde_json::from_value(serde_json::json!({"id":"demo-sc2-result-one","gameId":"sc2","mode":"ranked","map":"Arena","source":"demo","players":[]})).unwrap();
        state.post_game = Some(crate::model::PostGame {
            game,
            opponent_id: None,
            expires_at: chrono::Utc::now() + chrono::Duration::seconds(8),
        });
        assert!(should_show(&state, false));
        state.detection.config.enabled = true;
        assert!(!should_show(&state, true));
        state.detection.config.enabled = false;
        state.detection.config.game_id = "aoe4".into();
        assert!(!should_show(&state, true));
    }
}
