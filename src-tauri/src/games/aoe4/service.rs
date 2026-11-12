use super::provider::{Aoe4Provider, RemoteGame};
use crate::{
    commands::SharedState,
    detection::model::DetectionConfig,
    model::{MatchSnapshot, MatchSource},
    overlay, storage,
};
use tauri::{Emitter, Manager};

pub fn should_start(
    game: &RemoteGame,
    profile_id: u64,
    current: Option<&str>,
    now: chrono::DateTime<chrono::Utc>,
) -> bool {
    game.ongoing
        && game.supported()
        && game.includes(profile_id)
        && game.fresh(now)
        && current != Some(game.id().as_str())
}

pub async fn cycle(
    app: &tauri::AppHandle,
    provider: &Aoe4Provider,
    config: &DetectionConfig,
) -> Result<(), String> {
    let profile_id = config
        .profile
        .as_ref()
        .ok_or("Selecione um perfil Age 4")?
        .profile_id;
    let last = provider.last_game(profile_id, false).await?;
    let current = app
        .state::<SharedState>()
        .lock()
        .map_err(|e| e.to_string())?
        .current_match
        .clone()
        .filter(|game| game.game_id == "aoe4" && matches!(game.source, MatchSource::Live));
    let mut incoming = None;
    if let Some(game) = last.as_ref().filter(|game| {
        should_start(
            game,
            profile_id,
            current.as_ref().map(|game| game.id.as_str()),
            chrono::Utc::now(),
        )
    }) {
        let cached = app
            .state::<SharedState>()
            .lock()
            .map_err(|e| e.to_string())?
            .last_synced
            .clone()
            .filter(|cached| {
                cached.id == game.id()
                    && cached.game_id == "aoe4"
                    && cached.finished_at.is_none()
                    && cached.self_player_id.as_deref() == Some(profile_id.to_string().as_str())
            });
        incoming = if cached.is_some() {
            cached
        } else {
            let stats = provider
                .last_game(profile_id, true)
                .await?
                .ok_or("Partida indisponível no AoE4 World")?;
            if stats.game_id != game.game_id
                || !stats.ongoing
                || !stats.supported()
                || !stats.includes(profile_id)
            {
                return Ok(());
            }
            Some(stats.snapshot(profile_id))
        };
    }
    let cached = app
        .state::<SharedState>()
        .lock()
        .map_err(|e| e.to_string())?
        .last_synced
        .clone();
    let previous = current.as_ref().or_else(|| {
        cached.as_ref().filter(|saved| {
            saved.belongs_to(config)
                && last.as_ref().is_some_and(|game| game.id() == saved.id)
                && saved
                    .players
                    .iter()
                    .find(|p| Some(&p.id) == saved.self_player_id.as_ref())
                    .is_some_and(|p| p.won.is_none() && p.draw != Some(true))
        })
    });
    let confirmed_remote = if let Some(previous) = previous {
        let remote = if last.as_ref().is_some_and(|game| game.id() == previous.id) {
            last.clone()
        } else {
            let id = previous
                .id
                .strip_prefix("aoe4-")
                .and_then(|id| id.parse().ok())
                .ok_or("ID de partida inválido")?;
            provider.game(profile_id, id).await?
        };
        remote.filter(|game| {
            game.id() == previous.id
                && game.includes(profile_id)
                && game.supported()
                && game.finished()
        })
    } else {
        None
    };
    let finished = confirmed_remote
        .as_ref()
        .zip(previous)
        .map(|(game, previous)| game.record_outcome(previous));
    let records: Vec<_> = last
        .iter()
        .chain(confirmed_remote.iter())
        .filter_map(|game| crate::games::session::aoe4(game, profile_id))
        .collect();
    if let Err(error) = crate::games::session::record(app, config, &records) {
        eprintln!("Sessão Age 4: {error}");
    }
    let changed = incoming.is_some() || finished.is_some();
    let published = {
        let shared = app.state::<SharedState>();
        let mut state = shared.lock().map_err(|e| e.to_string())?;
        if state.detection.config != *config {
            return Ok(());
        }
        if let Some(mut game) = finished {
            save_snapshot(app, &mut game);
            if confirmed_remote
                .as_ref()
                .is_some_and(|remote| crate::games::session::aoe4(remote, profile_id).is_some())
            {
                crate::games::session::post_game(&mut state, &game);
            }
            state.last_synced = Some(game);
            state.current_match = None;
        }
        if let Some(mut game) = incoming {
            save_snapshot(app, &mut game);
            state.observed_age_match_id = Some(game.id.clone());
            state.last_synced = Some(game.clone());
            state.current_match = Some(game);
            state.post_game = None;
            state.hidden_match_id = None;
        }
        state.detection.failures = 0;
        state.detection.last_checked = Some(chrono::Utc::now().to_rfc3339());
        state.detection.phase = if state.current_match.is_some() {
            "in-match"
        } else {
            "waiting"
        }
        .into();
        state.detection.message = if state.current_match.is_some() {
            "Partida em andamento · dados do início"
        } else {
            "Age 4 · aguardando 1v1 publicado pela fonte"
        }
        .into();
        state.clone()
    };
    if changed {
        overlay::synchronize(app, &published, true)
    } else {
        app.emit("state-changed", published)
            .map_err(|e| e.to_string())
    }
}

fn save_snapshot(app: &tauri::AppHandle, snapshot: &mut MatchSnapshot) {
    if storage::save_last_match(app, snapshot).is_err() {
        snapshot
            .warnings
            .push("Não foi possível salvar a partida para demonstração".into());
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn captures_only_new_fresh_duels_and_does_not_treat_missing_data_as_a_finish() {
        let game: RemoteGame = serde_json::from_value(serde_json::json!({
            "game_id":1,"started_at":"2026-11-03T10:00:00Z","ongoing":true,"state":"new","kind":"qm_1v1","map":"Arabia",
            "teams":[[{"profile_id":42,"name":"One"}],[{"profile_id":43,"name":"Two"}]]
        })).unwrap();
        let now = "2026-11-03T10:10:00Z".parse().unwrap();
        assert!(should_start(&game, 42, None, now));
        assert!(!should_start(&game, 42, Some("aoe4-1"), now));
        assert!(!should_start(&game, 99, None, now));
        assert!(!should_start(
            &game,
            42,
            None,
            "2026-11-04T10:00:00Z".parse().unwrap()
        ));
        assert!(!game.finished());
    }
}
