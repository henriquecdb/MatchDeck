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
pub fn select_game(
    app: tauri::AppHandle,
    state: State<'_, SharedState>,
    game_id: String,
    controller: State<'_, DetectionController>,
) -> Result<(), String> {
    if !crate::games::supports(&game_id) {
        return Err("Integração de jogo indisponível".into());
    }
    let snapshot = {
        let mut state = state.lock().map_err(|error| error.to_string())?;
        if state.detection.config.game_id == game_id {
            return Ok(());
        }
        if state.current_match.is_some() {
            return Err("Desative a detecção e encerre a demonstração para trocar de jogo".into());
        }
        let mut previous = state.detection.config.clone();
        previous.enabled = false;
        storage::save_detection(&app, &previous)?;
        let mut config = storage::load_detection(&app, &game_id);
        config.enabled = false;
        storage::save_detection(&app, &config)?;
        storage::save_selected_game(&app, &game_id)?;
        state.settings = storage::load(&app, &game_id);
        state.last_synced = storage::load_last_match(&app, &game_id);
        state.detection = Default::default();
        state.detection.config = config;
        state.hidden_match_id = None;
        state.clone()
    };
    controller
        .updates
        .send_replace(snapshot.detection.config.clone());
    overlay::synchronize(&app, &snapshot, true)
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
    if incoming.game_id != state.detection.config.game_id {
        return Err("A demonstração deve corresponder ao jogo selecionado".into());
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
    let config = state
        .lock()
        .map_err(|error| error.to_string())?
        .detection
        .config
        .clone();
    let profile = config
        .profile
        .as_ref()
        .ok_or("Configure um perfil na aba Partida")?;
    let mut snapshot = if config.game_id == "aoe4" {
        let remote = controller
            .aoe4
            .last_game(profile.profile_id, true)
            .await?
            .ok_or("Nenhuma partida disponível no AoE4 World")?;
        if !remote.supported() || !remote.includes(profile.profile_id) {
            return Err("A última partida não é um 1v1 compatível".into());
        }
        remote.snapshot(profile.profile_id)
    } else {
        let feed = controller.provider.matches(profile.profile_id).await?;
        let latest = feed
            .matches
            .iter()
            .filter(|candidate| candidate.includes(profile.profile_id) && candidate.supported())
            .max_by_key(|candidate| candidate.started)
            .ok_or("Nenhuma partida compatível encontrada para este perfil")?;
        controller.provider.snapshot(latest).await
    };
    snapshot.self_player_id = Some(profile.profile_id.to_string());
    let published = {
        let mut state = state.lock().map_err(|error| error.to_string())?;
        if state.detection.config.game_id != config.game_id
            || state
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
    state: State<'_, SharedState>,
) -> Result<Profile, String> {
    if state
        .lock()
        .map_err(|error| error.to_string())?
        .detection
        .config
        .game_id
        == "aoe4"
    {
        return Err("Informe o ID ou link do perfil no AoE4 World".into());
    }
    controller.provider.local_profile().await
}

#[tauri::command]
pub async fn profile_overview(
    controller: State<'_, DetectionController>,
    state: State<'_, SharedState>,
) -> Result<crate::games::profile::ProfileOverview, String> {
    let (game_id, profile_id) = {
        let state = state.lock().map_err(|error| error.to_string())?;
        let profile_id = state
            .detection
            .config
            .profile
            .as_ref()
            .map(|profile| profile.profile_id)
            .ok_or("Vincule um perfil na aba Partida")?;
        (state.detection.config.game_id.clone(), profile_id)
    };
    match game_id.as_str() {
        "aoe4" => controller.aoe4.profile_overview(profile_id).await,
        "aoe2-de" => controller.provider.profile_overview(profile_id).await,
        _ => Err("Integração de jogo indisponível".into()),
    }
}

#[tauri::command]
pub async fn configure_detection(
    app: tauri::AppHandle,
    controller: State<'_, DetectionController>,
    state: State<'_, SharedState>,
    enabled: bool,
    profile_input: String,
) -> Result<(), String> {
    let game_id = state
        .lock()
        .map_err(|error| error.to_string())?
        .detection
        .config
        .game_id
        .clone();
    let profile = if enabled {
        Some(if game_id == "aoe4" {
            controller.aoe4.resolve_profile(&profile_input).await?
        } else {
            controller.provider.resolve_profile(&profile_input).await?
        })
    } else {
        state
            .lock()
            .map_err(|error| error.to_string())?
            .detection
            .config
            .profile
            .clone()
    };
    let config = DetectionConfig {
        enabled,
        profile,
        game_id: game_id.clone(),
    };
    let snapshot = {
        let mut state = state.lock().map_err(|error| error.to_string())?;
        if state.detection.config.game_id != game_id {
            return Err("O jogo foi alterado; tente novamente".into());
        }
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
    game_id: Option<String>,
) -> Result<(), String> {
    let mut state = state.lock().map_err(|error| error.to_string())?;
    if game_id
        .as_ref()
        .is_some_and(|id| id != &state.detection.config.game_id)
    {
        return Err("O jogo foi alterado; tente novamente".into());
    }
    let settings = settings.normalize();
    storage::save(&app, &settings, &state.detection.config.game_id)?;
    state.settings = settings;
    overlay::synchronize(&app, &state, true)
}
