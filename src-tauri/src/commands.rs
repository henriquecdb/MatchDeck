use crate::detection::{
    model::{DetectionConfig, Profile},
    service::DetectionController,
};
use crate::{
    model::{AppState, MatchSnapshot, OverlaySettings},
    overlay, storage,
};
use std::sync::Mutex;
use tauri::State;

pub type SharedState = Mutex<AppState>;

#[tauri::command]
pub fn read_state(state: State<'_, SharedState>) -> Result<AppState, String> {
    Ok(state.lock().map_err(|error| error.to_string())?.clone())
}

#[tauri::command]
pub fn start_match(
    app: tauri::AppHandle,
    state: State<'_, SharedState>,
    incoming: MatchSnapshot,
) -> Result<(), String> {
    let mut state = state.lock().map_err(|error| error.to_string())?;
    if state.detection.config.enabled {
        return Err("Desative a detecção real antes de iniciar uma demonstração".into());
    }
    if !crate::games::supports(&incoming.game_id) {
        return Err("Integração de jogo indisponível".into());
    }
    let incoming = if incoming.replay_of.is_some()
        && matches!(incoming.source, crate::model::MatchSource::Demo)
    {
        state
            .last_synced
            .as_ref()
            .map(MatchSnapshot::as_demo)
            .ok_or("Nenhuma partida sincronizada disponível para demonstração")?
    } else {
        incoming
    };
    if state
        .current_match
        .as_ref()
        .is_some_and(|current| current.id == incoming.id)
    {
        return Ok(());
    }
    if incoming.players.is_empty() || incoming.players.len() > 8 {
        return Err("A partida deve ter entre 1 e 8 jogadores".into());
    }
    state.current_match = Some(incoming);
    overlay::synchronize(&app, &state, true)
}

#[tauri::command]
pub async fn sync_latest_match(
    app: tauri::AppHandle,
    controller: State<'_, DetectionController>,
    state: State<'_, SharedState>,
) -> Result<(), String> {
    let profile = state
        .lock()
        .map_err(|error| error.to_string())?
        .detection
        .config
        .profile
        .clone()
        .ok_or("Configure um perfil na seção de detecção antes de sincronizar")?;
    let feed = controller.provider.matches(profile.profile_id).await?;
    let latest = feed
        .matches
        .iter()
        .filter(|candidate| candidate.includes(profile.profile_id) && candidate.supported())
        .max_by_key(|candidate| candidate.started)
        .ok_or("Nenhuma partida compatível encontrada para este perfil")?;
    let mut snapshot = controller.provider.snapshot(latest).await;
    snapshot.self_player_id = Some(profile.profile_id.to_string());
    let published = {
        let mut state = state.lock().map_err(|error| error.to_string())?;
        if state
            .detection
            .config
            .profile
            .as_ref()
            .map(|profile| profile.profile_id)
            != Some(profile.profile_id)
        {
            return Err("O perfil foi alterado durante a sincronização; tente novamente".into());
        }
        storage::save_last_match(&app, &snapshot)?;
        state.last_synced = Some(snapshot);
        state.clone()
    };
    use tauri::Emitter;
    app.emit("state-changed", published)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn finish_match(app: tauri::AppHandle, state: State<'_, SharedState>) -> Result<(), String> {
    let mut state = state.lock().map_err(|error| error.to_string())?;
    if state.detection.config.enabled {
        return Err("Desative a detecção para esconder a partida real".into());
    }
    state.current_match = None;
    state.hidden_match_id = None;
    overlay::synchronize(&app, &state, false)
}

#[tauri::command]
pub fn toggle_overlay_visibility(
    app: tauri::AppHandle,
    state: State<'_, SharedState>,
) -> Result<(), String> {
    let mut state = state.lock().map_err(|error| error.to_string())?;
    let id = state
        .current_match
        .as_ref()
        .map(|current| current.id.clone())
        .ok_or("Não há partida em andamento")?;
    state.hidden_match_id = if state.hidden_match_id.as_ref() == Some(&id) {
        None
    } else {
        Some(id)
    };
    overlay::synchronize(&app, &state, false)
}

#[tauri::command]
pub fn list_monitors(
    app: tauri::AppHandle,
) -> Result<Vec<crate::displays::DisplayMonitor>, String> {
    use tauri::Manager;
    crate::displays::list(
        &app.get_webview_window("overlay")
            .ok_or("Overlay não encontrado")?,
    )
}

#[tauri::command]
pub async fn identify_local_profile(
    controller: State<'_, DetectionController>,
) -> Result<Profile, String> {
    controller.provider.local_profile().await
}

#[tauri::command]
pub async fn profile_overview(
    controller: State<'_, DetectionController>,
    state: State<'_, SharedState>,
) -> Result<crate::games::aoe2::profile::ProfileOverview, String> {
    let profile_id = state
        .lock()
        .map_err(|error| error.to_string())?
        .detection
        .config
        .profile
        .as_ref()
        .map(|profile| profile.profile_id)
        .ok_or("Vincule um perfil na aba Partida")?;
    controller.provider.profile_overview(profile_id).await
}

#[tauri::command]
pub async fn configure_detection(
    app: tauri::AppHandle,
    controller: State<'_, DetectionController>,
    state: State<'_, SharedState>,
    enabled: bool,
    profile_input: String,
) -> Result<(), String> {
    let profile = if enabled {
        Some(controller.provider.resolve_profile(&profile_input).await?)
    } else {
        state
            .lock()
            .map_err(|error| error.to_string())?
            .detection
            .config
            .profile
            .clone()
    };
    let config = DetectionConfig { enabled, profile };
    let snapshot = {
        let mut state = state.lock().map_err(|error| error.to_string())?;
        storage::save_detection(&app, &config)?;
        state.detection.config = config.clone();
        state.detection.phase = if enabled { "waiting" } else { "disabled" }.into();
        state.detection.message = if enabled {
            "Consultando partidas multiplayer…"
        } else {
            "Detecção desativada"
        }
        .into();
        state.detection.last_checked = None;
        state.detection.failures = 0;
        crate::diagnostics::record(
            &mut state,
            "detection",
            if enabled {
                "Monitoramento ativado."
            } else {
                "Monitoramento desativado."
            },
        );
        state.current_match = None;
        state.clone()
    };
    controller.updates.send_replace(config);
    overlay::synchronize(&app, &snapshot, false)
}

#[tauri::command]
pub fn configure_overlay(
    app: tauri::AppHandle,
    state: State<'_, SharedState>,
    settings: OverlaySettings,
) -> Result<(), String> {
    let mut state = state.lock().map_err(|error| error.to_string())?;
    let settings = settings.normalize();
    storage::save(&app, &settings)?;
    state.settings = settings;
    overlay::synchronize(&app, &state, true)
}
