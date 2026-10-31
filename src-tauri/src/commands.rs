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
    let incoming = if matches!(incoming.source, crate::model::MatchSource::Demo) {
        state
            .last_synced
            .as_ref()
            .map(MatchSnapshot::as_demo)
            .unwrap_or(incoming)
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
    let snapshot = controller.provider.snapshot(latest).await;
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
    overlay::synchronize(&app, &state, false)
}

#[tauri::command]
pub async fn identify_local_profile(
    controller: State<'_, DetectionController>,
) -> Result<Profile, String> {
    controller.provider.local_profile().await
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
