#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod detection;
mod diagnostics;
mod displays;
mod focus;
mod games;
mod hotkeys;
mod language;
mod layout;
mod lifecycle;
mod model;
mod overlay;
mod placement;
mod preferences;
mod storage;
mod visibility;

use commands::SharedState;
use std::sync::Mutex;
use tauri::{Emitter, Manager};

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            lifecycle::open_main(app)
        }))
        .plugin(
            tauri_plugin_autostart::Builder::new()
                .args(["--autostart"])
                .build(),
        )
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(hotkeys::handle)
                .build(),
        )
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(Mutex::new(model::AppState::default()))
        .manage(storage::PositionSaveRevision::default())
        .manage(hotkeys::ConfigurationLock(Mutex::new(())))
        .setup(|app| {
            let handle = app.handle().clone();
            if let Some(window) = app.get_webview_window("main") {
                window.set_title(app.config().product_name.as_deref().unwrap_or("MatchDeck"))?;
            }
            let provider = games::aoe2::provider::Aoe2Provider::new()?;
            let aoe4 = games::aoe4::provider::Aoe4Provider::new()?;
            let sc2 = games::sc2::provider::Sc2Provider::new()?;
            let game_id = storage::selected_game(&handle);
            let preferences = storage::load_preferences(&handle);
            let mut config = storage::load_detection(&handle, &game_id);
            if !preferences.open_last_game && config.enabled {
                config.enabled = false;
                storage::save_detection(&handle, &config)?;
            }
            let (updates, receiver) = tokio::sync::watch::channel(config.clone());
            app.manage(detection::service::DetectionController {
                provider: provider.clone(),
                aoe4: aoe4.clone(),
                sc2: sc2.clone(),
                updates,
            });
            {
                let state = app.state::<SharedState>();
                let mut state = state.lock().map_err(|error| error.to_string())?;
                state.settings = storage::load(&handle, &game_id);
                state.preferences = preferences;
                use tauri_plugin_autostart::ManagerExt;
                state.autostart = handle.autolaunch().is_enabled().unwrap_or(false);
                state.last_synced = storage::load_last_match(&handle, &game_id);
                if let Some(snapshot) = &mut state.last_synced {
                    if snapshot.self_player_id.is_none() {
                        snapshot.self_player_id = config
                            .profile
                            .as_ref()
                            .map(|profile| profile.profile_id.to_string())
                            .filter(|id| snapshot.players.iter().any(|player| &player.id == id));
                    }
                }
                state.detection.config = config.clone();
                if config.enabled {
                    state.detection.phase = "waiting".into();
                    state.detection.message = "Consultando partidas multiplayer…".into();
                }
                overlay::synchronize(&handle, &state, true)?;
            }
            let tray_result = lifecycle::create_tray(&handle);
            {
                let shared = app.state::<SharedState>();
                let mut state = shared.lock().map_err(|error| error.to_string())?;
                state.tray_available = tray_result.is_ok();
                if !state.tray_available {
                    state.preferences.launch_minimized = false;
                    if state.preferences.close_action == preferences::CloseAction::Minimize {
                        state.preferences.close_action = preferences::CloseAction::Ask;
                    }
                }
                if let Err(error) = tray_result {
                    state.app_error = Some(format!("Bandeja indisponível: {error}"));
                }
                if !preferences::minimize_on_start(&state.preferences, state.tray_available) {
                    if let Some(window) = app.get_webview_window("main") {
                        window.show()?;
                    }
                }
            }
            hotkeys::initialize(&handle)?;
            let window = app
                .get_webview_window("overlay")
                .ok_or("Overlay não encontrado")?;
            window.on_window_event(move |event| {
                if let tauri::WindowEvent::Moved(position) = event {
                    let shared = handle.state::<SharedState>();
                    if let Ok(mut state) = shared.try_lock() {
                        state.settings.x = position.x;
                        state.settings.y = position.y;
                        storage::schedule_position_save(&handle);
                        if let Err(error) = handle.emit("state-changed", &*state) {
                            eprintln!("{error}");
                        }
                    };
                }
            });
            tauri::async_runtime::spawn(games::sc2::replay::watch(
                app.handle().clone(),
                sc2.clone(),
            ));
            tauri::async_runtime::spawn(detection::service::run(
                app.handle().clone(),
                provider,
                aoe4,
                sc2,
                receiver,
            ));
            tauri::async_runtime::spawn(overlay::watch_desktop(app.handle().clone()));
            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() == "main" {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    lifecycle::handle_close(window.app_handle());
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::read_state,
            commands::select_game,
            commands::start_match,
            commands::finish_match,
            commands::configure_overlay,
            commands::identify_local_profile,
            commands::profile_overview,
            commands::configure_detection,
            commands::sync_latest_match,
            commands::toggle_overlay_visibility,
            commands::list_monitors,
            lifecycle::configure_app,
            lifecycle::set_autostart,
            lifecycle::close_app,
            lifecycle::app_initialized,
            lifecycle::retry_detection,
            lifecycle::dismiss_app_error,
            diagnostics::diagnostics_report
        ])
        .run(tauri::generate_context!())
        .expect("Não foi possível iniciar o MatchDeck");
}
