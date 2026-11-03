use crate::{
    commands::SharedState,
    preferences::{AppPreferences, CloseAction},
    storage,
};
use tauri::{Emitter, Manager, State};
use tauri_plugin_autostart::ManagerExt;

pub fn open_main(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[tauri::command]
pub fn dismiss_app_error(
    app: tauri::AppHandle,
    state: State<'_, SharedState>,
) -> Result<(), String> {
    let mut state = state.lock().map_err(|error| error.to_string())?;
    state.app_error = None;
    app.emit("state-changed", &*state)
        .map_err(|error| error.to_string())
}

fn exit_app(app: &tauri::AppHandle) {
    if let Ok(state) = app.state::<SharedState>().lock() {
        let _ = storage::save(app, &state.settings);
    }
    app.exit(0);
}

#[tauri::command]
pub fn configure_app(
    app: tauri::AppHandle,
    state: State<'_, SharedState>,
    preferences: AppPreferences,
) -> Result<(), String> {
    let mut state = state.lock().map_err(|error| error.to_string())?;
    if !state.tray_available
        && (preferences.launch_minimized || preferences.close_action == CloseAction::Minimize)
    {
        return Err("A bandeja está indisponível; mantenha a janela acessível.".into());
    }
    storage::save_preferences(&app, &preferences)?;
    let language_changed = state.preferences.language != preferences.language;
    let language = preferences.language;
    state.preferences = preferences;
    app.emit("state-changed", &*state)
        .map_err(|error| error.to_string())?;
    drop(state);
    if language_changed {
        refresh_tray_language(&app, language)?;
    }
    Ok(())
}

#[tauri::command]
pub fn set_autostart(
    app: tauri::AppHandle,
    state: State<'_, SharedState>,
    enabled: bool,
) -> Result<(), String> {
    if cfg!(debug_assertions) {
        return Err("Inicialização com Windows disponível somente no aplicativo instalado.".into());
    }
    let manager = app.autolaunch();
    if enabled {
        manager.enable()
    } else {
        manager.disable()
    }
    .map_err(|error| error.to_string())?;
    let mut state = state.lock().map_err(|error| error.to_string())?;
    state.autostart = manager.is_enabled().map_err(|error| error.to_string())?;
    app.emit("state-changed", &*state)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn app_initialized(
    app: tauri::AppHandle,
    state: State<'_, SharedState>,
    elapsed_ms: f64,
) -> Result<(), String> {
    if !elapsed_ms.is_finite() || elapsed_ms < 0.0 {
        return Err("Tempo de inicialização inválido".into());
    }
    let mut state = state.lock().map_err(|error| error.to_string())?;
    if state.startup_ms.is_none() {
        state.startup_ms = Some(elapsed_ms.min(3600000.0).round() as u64);
        crate::diagnostics::record(
            &mut state,
            "startup",
            "Interface e estado local inicializados.",
        );
        app.emit("state-changed", &*state)
            .map_err(|error| error.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn close_app(
    app: tauri::AppHandle,
    state: State<'_, SharedState>,
    action: String,
) -> Result<(), String> {
    let tray_available = {
        let mut state = state.lock().map_err(|error| error.to_string())?;
        state.close_requested = false;
        app.emit("state-changed", &*state)
            .map_err(|error| error.to_string())?;
        state.tray_available
    };
    match action.as_str() {
        "exit" => exit_app(&app),
        "minimize" if tray_available => app
            .get_webview_window("main")
            .ok_or("Janela principal indisponível")?
            .hide()
            .map_err(|error| error.to_string())?,
        "cancel" => {}
        _ => return Err("Ação de fechamento indisponível".into()),
    }
    Ok(())
}

pub fn handle_close(app: &tauri::AppHandle) {
    let action = {
        let shared = app.state::<SharedState>();
        let Ok(mut state) = shared.lock() else {
            return;
        };
        if state.startup_ms.is_none() || state.preferences.close_action == CloseAction::Exit {
            CloseAction::Exit
        } else if state.preferences.close_action == CloseAction::Minimize && state.tray_available {
            CloseAction::Minimize
        } else {
            state.close_requested = true;
            let _ = app.emit("state-changed", &*state);
            CloseAction::Ask
        }
    };
    match action {
        CloseAction::Exit => exit_app(app),
        CloseAction::Minimize => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.hide();
            }
        }
        CloseAction::Ask => open_main(app),
    }
}

#[tauri::command]
pub fn retry_detection(app: tauri::AppHandle) -> Result<(), String> {
    let shared = app.state::<SharedState>();
    let mut state = shared.lock().map_err(|error| error.to_string())?;
    if !state.detection.config.enabled {
        return Err("Ative a detecção antes de tentar novamente.".into());
    }
    state.detection.failures = 0;
    state.detection.phase = "waiting".into();
    state.detection.message = "Nova consulta solicitada; preservando a partida atual.".into();
    crate::diagnostics::record(
        &mut state,
        "network",
        "Nova tentativa solicitada pelo usuário.",
    );
    app.state::<crate::detection::service::DetectionController>()
        .updates
        .send_replace(state.detection.config.clone());
    app.emit("state-changed", &*state)
        .map_err(|error| error.to_string())
}

fn tray_menu(
    app: &tauri::AppHandle,
    language: crate::preferences::InterfaceLanguage,
) -> Result<tauri::menu::Menu<tauri::Wry>, String> {
    use tauri::menu::{Menu, MenuItem};
    let label = |message| crate::language::text(language, message);
    let items = [
        MenuItem::with_id(app, "open", label("Abrir MatchDeck"), true, None::<&str>),
        MenuItem::with_id(
            app,
            "detection",
            label("Ativar/desativar detecção"),
            true,
            None::<&str>,
        ),
        MenuItem::with_id(
            app,
            "visibility",
            label("Mostrar/ocultar overlay"),
            true,
            None::<&str>,
        ),
        MenuItem::with_id(
            app,
            "demo",
            label("Testar última partida"),
            true,
            None::<&str>,
        ),
        MenuItem::with_id(app, "exit", label("Sair do MatchDeck"), true, None::<&str>),
    ]
    .into_iter()
    .collect::<tauri::Result<Vec<_>>>()
    .map_err(|error| error.to_string())?;
    Menu::with_items(
        app,
        &items
            .iter()
            .map(|item| item as &dyn tauri::menu::IsMenuItem<_>)
            .collect::<Vec<_>>(),
    )
    .map_err(|error| error.to_string())
}

fn refresh_tray_language(
    app: &tauri::AppHandle,
    language: crate::preferences::InterfaceLanguage,
) -> Result<(), String> {
    if let Some(tray) = app.tray_by_id("matchdeck") {
        tray.set_menu(Some(tray_menu(app, language)?))
            .map_err(|error| error.to_string())?;
        tray.set_tooltip(Some(crate::language::text(
            language,
            "MatchDeck · clique para abrir",
        )))
        .map_err(|error| error.to_string())?;
    }
    Ok(())
}

pub fn create_tray(app: &tauri::AppHandle) -> Result<(), String> {
    use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
    let language = app
        .state::<SharedState>()
        .lock()
        .map_err(|error| error.to_string())?
        .preferences
        .language;
    let menu = tray_menu(app, language)?;
    TrayIconBuilder::with_id("matchdeck")
        .icon(app.default_window_icon().ok_or("Ícone da bandeja indisponível")?.clone())
        .tooltip(crate::language::text(language, "MatchDeck · clique para abrir"))
        .menu(&menu).show_menu_on_left_click(false)
        .on_tray_icon_event(|tray, event| { if matches!(event, TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. }) { open_main(tray.app_handle()); } })
        .on_menu_event(|app, event| {
            match event.id.as_ref() {
                "open" => open_main(app),
                "exit" => exit_app(app),
                "visibility" => { if let Err(error) = crate::commands::toggle_overlay_visibility(app.clone(), app.state()) { crate::diagnostics::report_error(app, error); open_main(app); } },
                "demo" => {
                    let snapshot = app.state::<SharedState>().lock().ok().and_then(|state| state.last_synced.clone());
                    let result = snapshot.ok_or_else(|| "Inicie uma demonstração com jogadores fictícios na aba Demonstração ou sincronize uma partida.".into()).and_then(|snapshot: crate::model::MatchSnapshot| crate::commands::start_match(app.clone(), app.state(), snapshot.as_demo()));
                    if let Err(error) = result { crate::diagnostics::report_error(app, error); }
                    open_main(app);
                },
                "detection" => {
                    let config = app.state::<SharedState>().lock().ok().map(|state| state.detection.config.clone());
                    if let Some(config) = config {
                        if !config.enabled && config.profile.is_none() { crate::diagnostics::report_error(app, "Configure um perfil na aba Partida antes de ativar a detecção.".into()); open_main(app); return; }
                        let app = app.clone();
                        tauri::async_runtime::spawn(async move {
                            let input = config.profile.map(|profile| profile.profile_id.to_string()).unwrap_or_default();
                            if let Err(error) = crate::commands::configure_detection(app.clone(), app.state(), app.state(), !config.enabled, input).await { crate::diagnostics::report_error(&app, error); open_main(&app); }
                        });
                    }
                },
                _ => {},
            }
        }).build(app).map_err(|error| error.to_string())?;
    Ok(())
}
