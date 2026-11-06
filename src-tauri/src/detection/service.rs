use super::model::{retry_delay, DetectionConfig};
use crate::{
    commands::SharedState,
    games::aoe2::{
        provider::{now, Aoe2Provider},
        response::{self, MatchFeed, RemoteMatch},
    },
    model::MatchSource,
    overlay, storage,
};
use std::time::Duration;
use tauri::{Emitter, Manager};
use tokio::sync::watch;

pub struct DetectionController {
    pub provider: Aoe2Provider,
    pub aoe4: crate::games::aoe4::provider::Aoe4Provider,
    pub sc2: crate::games::sc2::provider::Sc2Provider,
    pub updates: watch::Sender<DetectionConfig>,
}

pub enum MatchAction<'a> {
    Start(&'a RemoteMatch),
    Finish,
    Keep,
}

pub fn decide<'a>(
    feed: &'a MatchFeed,
    profile_id: u64,
    current_id: Option<&str>,
    time: chrono::DateTime<chrono::Utc>,
) -> MatchAction<'a> {
    if let Some(candidate) = response::ongoing(feed, profile_id, time) {
        if current_id != Some(format!("aoe2-{}", candidate.match_id).as_str()) {
            return MatchAction::Start(candidate);
        }
        return MatchAction::Keep;
    }
    let confirmed_end = current_id.is_some_and(|current_id| {
        feed.matches.iter().any(|candidate| {
            candidate.includes(profile_id)
                && format!("aoe2-{}", candidate.match_id) == current_id
                && candidate.is_finished()
        })
    });
    if confirmed_end {
        MatchAction::Finish
    } else {
        MatchAction::Keep
    }
}

pub(crate) fn update(
    app: &tauri::AppHandle,
    config: &DetectionConfig,
    phase: &str,
    message: String,
) -> Result<(), String> {
    let shared = app.state::<SharedState>();
    let mut state = shared.lock().map_err(|error| error.to_string())?;
    if state.detection.config != *config {
        return Ok(());
    }
    state.detection.phase = phase.into();
    state.detection.message = message;
    if phase == "error" {
        state.detection.failures = state.detection.failures.saturating_add(1);
        crate::diagnostics::record(
            &mut state,
            "network",
            "Consulta falhou; nova tentativa com intervalo progressivo.",
        );
    }
    app.emit("state-changed", &*state)
        .map_err(|error| error.to_string())
}

async fn cycle(
    app: &tauri::AppHandle,
    provider: &Aoe2Provider,
    config: &DetectionConfig,
) -> Result<(), String> {
    let profile = config.profile.as_ref().ok_or("Selecione um perfil AoE2")?;
    let feed = provider.matches(profile.profile_id).await?;
    let current_id = {
        let shared = app.state::<SharedState>();
        let state = shared.lock().map_err(|error| error.to_string())?;
        state
            .current_match
            .as_ref()
            .filter(|current| matches!(current.source, MatchSource::Live))
            .map(|current| current.id.clone())
    };
    let action = decide(&feed, profile.profile_id, current_id.as_deref(), now());
    let new_match = if let MatchAction::Start(remote) = &action {
        let player_count: usize = remote.teams.iter().map(|team| team.players.len()).sum();
        if !(1..=8).contains(&player_count) {
            return Err("A fonte retornou uma quantidade inválida de jogadores".into());
        }
        update(
            app,
            config,
            "loading",
            "Partida encontrada; carregando os dados dos jogadores".into(),
        )?;
        let cached = app
            .state::<SharedState>()
            .lock()
            .map_err(|error| error.to_string())?
            .last_synced
            .clone()
            .filter(|cached| can_resume(cached, remote, profile.profile_id));
        let resumed = cached.is_some();
        let mut snapshot = if let Some(cached) = cached {
            cached
        } else {
            provider.snapshot(remote).await
        };
        for _ in 0..2 {
            if resumed || snapshot.warnings.is_empty() {
                break;
            }
            tokio::time::sleep(Duration::from_secs(5)).await;
            snapshot = provider.snapshot(remote).await;
        }
        snapshot.self_player_id = Some(profile.profile_id.to_string());
        Some(snapshot)
    } else {
        None
    };
    let changed = new_match.is_some() || matches!(action, MatchAction::Finish);
    let snapshot = {
        let shared = app.state::<SharedState>();
        let mut state = shared.lock().map_err(|error| error.to_string())?;
        if state.detection.config != *config {
            return Ok(());
        }
        if let Some(mut new_match) = new_match {
            crate::diagnostics::record(
                &mut state,
                "match",
                "Partida capturada ou retomada; dados preservados até o encerramento.",
            );
            if let Err(error) = storage::save_last_match(app, &new_match) {
                new_match.warnings.push(format!(
                    "Não foi possível salvar a partida para demonstração: {error}"
                ));
            }
            state.last_synced = Some(new_match.clone());
            state.current_match = Some(new_match);
        }
        if matches!(action, MatchAction::Finish) {
            crate::diagnostics::record(&mut state, "match", "Encerramento confirmado pela fonte.");
            if let Some(current) = &state.current_match {
                if let Some(remote) = feed
                    .matches
                    .iter()
                    .find(|candidate| format!("aoe2-{}", candidate.match_id) == current.id)
                {
                    let mut result = crate::games::aoe2::outcome::record_outcome(current, remote);
                    if let Err(error) = storage::save_last_match(app, &result) {
                        result
                            .warnings
                            .push(format!("Não foi possível salvar o resultado: {error}"));
                    }
                    state.last_synced = Some(result);
                }
            }
            state.current_match = None;
        }
        if state.current_match.is_none() {
            if let Some(cached) = state
                .last_synced
                .as_ref()
                .filter(|cached| cached.finished_at.is_none())
            {
                if let Some(remote) = feed.matches.iter().find(|remote| {
                    cached.id == format!("aoe2-{}", remote.match_id)
                        && remote.includes(profile.profile_id)
                        && remote.is_finished()
                }) {
                    let result = crate::games::aoe2::outcome::record_outcome(cached, remote);
                    storage::save_last_match(app, &result)?;
                    state.last_synced = Some(result);
                    crate::diagnostics::record(
                        &mut state,
                        "match",
                        "Resultado recuperado após interrupção do aplicativo.",
                    );
                }
            }
        }
        state.detection.failures = 0;
        state.detection.last_checked = Some(now().to_rfc3339());
        let active = state.current_match.is_some();
        state.detection.phase = if active { "in-match" } else { "waiting" }.into();
        state.detection.message = if active {
            "Partida em andamento · dados do início".into()
        } else {
            "Aguardando partida publicada pela fonte".into()
        };
        state.clone()
    };
    if changed {
        overlay::synchronize(app, &snapshot, true)
    } else {
        app.emit("state-changed", snapshot)
            .map_err(|error| error.to_string())
    }
}

fn can_resume(cached: &crate::model::MatchSnapshot, remote: &RemoteMatch, profile_id: u64) -> bool {
    cached.game_id == "aoe2-de"
        && matches!(cached.source, MatchSource::Live)
        && cached.finished_at.is_none()
        && cached.id == format!("aoe2-{}", remote.match_id)
        && cached
            .players
            .iter()
            .any(|player| player.id == profile_id.to_string())
}

pub async fn run(
    app: tauri::AppHandle,
    provider: Aoe2Provider,
    aoe4: crate::games::aoe4::provider::Aoe4Provider,
    sc2: crate::games::sc2::provider::Sc2Provider,
    mut updates: watch::Receiver<DetectionConfig>,
) {
    let mut failures = 0;
    let mut sc2_session = crate::games::sc2::client::Session::default();
    loop {
        let config = updates.borrow_and_update().clone();
        if !config.enabled {
            if updates.changed().await.is_err() {
                break;
            }
            failures = 0;
            continue;
        }
        tokio::select! {
            changed = updates.changed() => {
                if changed.is_err() { break; }
                failures = 0;
                continue;
            }
            result = async {
                if config.game_id == "sc2" { crate::games::sc2::service::cycle(&app, &sc2, &config, &mut sc2_session).await }
                else if config.game_id == "aoe4" { crate::games::aoe4::service::cycle(&app, &aoe4, &config).await }
                else { cycle(&app, &provider, &config).await }
            } => {
                match result {
                    Ok(()) => failures = 0,
                    Err(error) => {
                        failures += 1;
                        let message = format!("{error}. Nova tentativa em {} s. O overlay atual será mantido.", retry_delay(failures));
                        if let Err(error) = update(&app, &config, "error", message) { eprintln!("{error}"); }
                    }
                }
            }
        }
        tokio::select! {
            changed = updates.changed() => {
                if changed.is_err() { break; }
                failures = 0;
            }
            _ = tokio::time::sleep(Duration::from_secs(if config.game_id == "sc2" && failures == 0 { 2 } else { retry_delay(failures) })) => {}
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn feed(finished: serde_json::Value) -> MatchFeed {
        serde_json::from_value(json!({ "matches": [{
            "matchId": 10, "started": "2026-10-31T02:00:00Z", "finished": finished,
            "gameMode": "random_map", "teams": [{"players": [{"profileId": 42, "name": "Player"}]}]
        }]}))
        .unwrap()
    }

    #[test]
    fn duplicate_events_do_not_recapture_statistics() {
        let feed = feed(json!(null));
        let time = "2026-10-31T02:10:00Z".parse().unwrap();
        assert!(matches!(
            decide(&feed, 42, None, time),
            MatchAction::Start(_)
        ));
        assert!(matches!(
            decide(&feed, 42, Some("aoe2-10"), time),
            MatchAction::Keep
        ));
    }

    #[test]
    fn only_positive_confirmation_finishes_a_match() {
        let time = "2026-10-31T02:10:00Z".parse().unwrap();
        assert!(matches!(
            decide(&MatchFeed { matches: vec![] }, 42, Some("aoe2-10"), time),
            MatchAction::Keep
        ));
        assert!(matches!(
            decide(
                &feed(json!("2026-10-31T02:08:00Z")),
                42,
                Some("aoe2-10"),
                time
            ),
            MatchAction::Finish
        ));
        assert!(matches!(
            decide(&feed(json!("2026-10-31T02:08:00Z")), 42, None, time),
            MatchAction::Keep
        ));
    }

    #[test]
    fn resumes_only_the_same_unfinished_live_match_for_a_participant() {
        let feed = feed(json!(null));
        let remote = &feed.matches[0];
        let mut snapshot: crate::model::MatchSnapshot = serde_json::from_value(json!({
            "id":"aoe2-10","gameId":"aoe2-de","mode":"ranked","map":"Arena","source":"live",
            "players":[{"id":"42","name":"Player","civilization":"Franks","uniqueUnits":[],"symbol":"","rating":1234}]
        })).unwrap();
        assert!(can_resume(&snapshot, remote, 42));
        assert!(!can_resume(&snapshot, remote, 43));
        snapshot.source = MatchSource::Demo;
        assert!(!can_resume(&snapshot, remote, 42));
        snapshot.source = MatchSource::Live;
        snapshot.finished_at = Some("2026-10-31T03:00:00Z".into());
        assert!(!can_resume(&snapshot, remote, 42));
    }
}
