#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod detection;
mod games;
mod model;
mod overlay;
mod storage;

use commands::SharedState;
use std::sync::Mutex;
use tauri::{Emitter, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(Mutex::new(model::AppState::default()))
        .setup(|app| {
            let handle = app.handle().clone();
            let provider = games::aoe2::provider::Aoe2Provider::new()?;
            let config = storage::load_detection(&handle);
            let (updates, receiver) = tokio::sync::watch::channel(config.clone());
            app.manage(detection::service::DetectionController {
                provider: provider.clone(),
                updates,
            });
            {
                let state = app.state::<SharedState>();
                let mut state = state.lock().map_err(|error| error.to_string())?;
                state.settings = storage::load(&handle);
                state.last_synced = storage::load_last_match(&handle);
                state.detection.config = config.clone();
                if config.enabled {
                    state.detection.phase = "waiting".into();
                    state.detection.message = "Consultando partidas multiplayer…".into();
                }
                overlay::synchronize(&handle, &state, true)?;
            }
            let shortcut =
                app.global_shortcut()
                    .on_shortcut("CommandOrControl+Shift+O", |app, _, event| {
                        if event.state() != ShortcutState::Pressed {
                            return;
                        }
                        let state = app.state::<SharedState>();
                        if let Ok(mut state) = state.lock() {
                            let mut settings = state.settings.clone();
                            settings.locked = !settings.locked;
                            match storage::save(app, &settings) {
                                Ok(()) => {
                                    state.settings = settings;
                                    if let Err(error) = overlay::synchronize(app, &state, false) {
                                        eprintln!("{error}");
                                    }
                                }
                                Err(error) => eprintln!("{error}"),
                            }
                        };
                    });
            match shortcut {
                Ok(()) => {
                    let state = app.state::<SharedState>();
                    state
                        .lock()
                        .map_err(|error| error.to_string())?
                        .shortcut_available = true;
                }
                Err(error) => eprintln!("Atalho indisponível: {error}"),
            }
            let window = app
                .get_webview_window("overlay")
                .ok_or("Overlay não encontrado")?;
            window.on_window_event(move |event| {
                if let tauri::WindowEvent::Moved(position) = event {
                    let shared = handle.state::<SharedState>();
                    if let Ok(mut state) = shared.try_lock() {
                        state.settings.x = position.x;
                        state.settings.y = position.y;
                        if let Err(error) = storage::save(&handle, &state.settings) {
                            eprintln!("{error}");
                        }
                        if let Err(error) = handle.emit("state-changed", &*state) {
                            eprintln!("{error}");
                        }
                    };
                }
            });
            tauri::async_runtime::spawn(detection::service::run(
                app.handle().clone(),
                provider,
                receiver,
            ));
            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() == "main"
                && matches!(event, tauri::WindowEvent::CloseRequested { .. })
            {
                window.app_handle().exit(0);
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::read_state,
            commands::start_match,
            commands::finish_match,
            commands::configure_overlay,
            commands::identify_local_profile,
            commands::configure_detection,
            commands::sync_latest_match
        ])
        .run(tauri::generate_context!())
        .expect("Não foi possível iniciar o MatchDeck");
}
