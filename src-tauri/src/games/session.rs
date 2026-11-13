use crate::{
    commands::SharedState,
    detection::model::DetectionConfig,
    model::{AppState, MatchSnapshot, MatchSource},
    storage,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{Emitter, Manager, State};

#[derive(Default)]
pub struct SessionStore(pub Mutex<()>);
#[derive(Clone, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionMatch {
    pub game_id: String,
    pub profile_id: u64,
    pub id: String,
    pub started_at: DateTime<Utc>,
    pub finished_at: Option<DateTime<Utc>>,
    pub observed_at: DateTime<Utc>,
    pub map: String,
    pub queue_id: Option<String>,
    pub civilization: String,
    pub opponents: Vec<String>,
    pub won: Option<bool>,
    pub draw: bool,
    pub rating_change: Option<i32>,
    pub duration_seconds: Option<u64>,
}
#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GameSession {
    pub game_id: String,
    pub profile_id: u64,
    pub started_at: DateTime<Utc>,
    pub ended_at: Option<DateTime<Utc>>,
    pub matches: Vec<SessionMatch>,
}
impl GameSession {
    fn ingest(&mut self, records: &[SessionMatch], now: DateTime<Utc>) -> bool {
        let mut changed = false;
        for source in records {
            let mut incoming = source.clone();
            if let Some(saved) = self.matches.iter().find(|m| m.id == source.id) {
                incoming.observed_at = saved.observed_at;
                incoming.finished_at = incoming.finished_at.or(saved.finished_at);
                incoming.duration_seconds = incoming.duration_seconds.or(saved.duration_seconds);
                incoming.rating_change = incoming.rating_change.or(saved.rating_change);
                incoming.queue_id = incoming.queue_id.or_else(|| saved.queue_id.clone());
                if incoming.civilization.is_empty() {
                    incoming.civilization = saved.civilization.clone();
                }
                if incoming.opponents.is_empty() {
                    incoming.opponents = saved.opponents.clone();
                }
                if incoming.map == "Mapa indisponível" {
                    incoming.map = saved.map.clone();
                }
            }
            let record = &incoming;
            if record.game_id != self.game_id
                || record.profile_id != self.profile_id
                || record.started_at < self.started_at
                || record.started_at > now
                || (record.won.is_none() && !record.draw)
                || record.finished_at.is_some_and(|end| {
                    end < record.started_at || end > now + chrono::Duration::minutes(2)
                })
                || self
                    .ended_at
                    .is_some_and(|end| record.finished_at.is_none_or(|finished| finished > end))
            {
                continue;
            }
            if let Some(saved) = self.matches.iter_mut().find(|m| m.id == record.id) {
                if saved != record {
                    *saved = record.clone();
                    changed = true;
                }
            } else {
                self.matches.push(record.clone());
                changed = true;
            }
        }
        self.matches
            .sort_by_key(|m| std::cmp::Reverse(m.started_at));
        changed
    }
}
fn filename(id: u64) -> String {
    format!("session-{id}.json")
}
fn load(app: &tauri::AppHandle, game_id: &str, id: u64) -> Result<Option<GameSession>, String> {
    let path = app
        .path()
        .app_config_dir()
        .map_err(|e| e.to_string())?
        .join("games")
        .join(game_id)
        .join(filename(id));
    match std::fs::read(path) {
        Ok(bytes) => {
            let session: GameSession = serde_json::from_slice(&bytes)
                .map_err(|_| "Arquivo de sessão inválido. O original foi preservado.")?;
            if session.game_id != game_id || session.profile_id != id {
                return Err("O perfil da sessão não corresponde ao selecionado.".into());
            }
            Ok(Some(session))
        }
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(error) => Err(error.to_string()),
    }
}
#[derive(Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SessionAction {
    Read,
    Start,
    Finish,
}
#[tauri::command]
pub fn game_session(
    app: tauri::AppHandle,
    state: State<'_, SharedState>,
    game_id: String,
    profile_id: u64,
    action: SessionAction,
) -> Result<Option<GameSession>, String> {
    let state = state.lock().map_err(|e| e.to_string())?;
    if !matches!(game_id.as_str(), "aoe2-de" | "aoe4")
        || state.detection.config.game_id != game_id
        || state
            .detection
            .config
            .profile
            .as_ref()
            .map(|p| p.profile_id)
            != Some(profile_id)
    {
        return Err("O perfil foi alterado; tente novamente".into());
    }
    if !matches!(action, SessionAction::Read) && state.current_match.is_some() {
        return Err("Encerre a partida ou demonstração antes de alterar a sessão.".into());
    }
    let store = app.state::<SessionStore>();
    let _guard = store.0.lock().map_err(|e| e.to_string())?;
    let current = load(&app, &game_id, profile_id)?;
    let next = match action {
        SessionAction::Read => return Ok(current),
        SessionAction::Start => {
            if current.as_ref().is_some_and(|s| s.ended_at.is_none()) {
                return Ok(current);
            }
            GameSession {
                game_id: game_id.clone(),
                profile_id,
                started_at: Utc::now(),
                ended_at: None,
                matches: vec![],
            }
        }
        SessionAction::Finish => {
            let Some(mut session) = current else {
                return Ok(None);
            };
            if session.ended_at.is_some() {
                return Ok(Some(session));
            }
            session.ended_at = Some(Utc::now());
            session
        }
    };
    storage::write_game(&app, &filename(profile_id), &next, &game_id)?;
    app.emit("game-session-changed", &next)
        .map_err(|e| e.to_string())?;
    Ok(Some(next))
}
pub fn record(
    app: &tauri::AppHandle,
    config: &DetectionConfig,
    records: &[SessionMatch],
) -> Result<(), String> {
    let shared = app.state::<SharedState>();
    let state = shared.lock().map_err(|e| e.to_string())?;
    if state.detection.config != *config {
        return Ok(());
    }
    let Some(profile) = config.profile.as_ref() else {
        return Ok(());
    };
    let store = app.state::<SessionStore>();
    let _guard = store.0.lock().map_err(|e| e.to_string())?;
    if let Some(mut session) = load(app, &config.game_id, profile.profile_id)? {
        if session.ingest(records, Utc::now()) {
            storage::write_game(
                app,
                &filename(profile.profile_id),
                &session,
                &config.game_id,
            )?;
            app.emit("game-session-changed", &session)
                .map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}
pub fn active_for(app: &tauri::AppHandle, snapshot: &MatchSnapshot) -> bool {
    snapshot
        .self_player_id
        .as_ref()
        .and_then(|id| id.parse().ok())
        .and_then(|id| load(app, &snapshot.game_id, id).ok().flatten())
        .is_some_and(|session| session.ended_at.is_none())
}
pub fn post_game(state: &mut AppState, result: &MatchSnapshot) {
    let observed = state
        .current_match
        .as_ref()
        .is_some_and(|m| m.id == result.id && matches!(m.source, MatchSource::Live))
        || state.observed_age_match_id.as_ref() == Some(&result.id);
    if observed
        && result.finished_at.is_some()
        && state.detection.config.enabled
        && result.belongs_to(&state.detection.config)
        && matches!(result.source, MatchSource::Live)
        && state
            .current_match
            .as_ref()
            .is_none_or(|m| m.id == result.id)
        && state.hidden_match_id.as_ref() != Some(&result.id)
        && state.settings.post_game_seconds > 0
        && result
            .players
            .iter()
            .find(|p| Some(&p.id) == result.self_player_id.as_ref())
            .is_some_and(|p| p.won.is_some() || p.draw == Some(true))
    {
        state.post_game = Some(crate::model::PostGame {
            game: result.clone(),
            opponent_id: None,
            expires_at: Utc::now()
                + chrono::Duration::seconds(state.settings.post_game_seconds as i64),
        });
    }
}
pub fn aoe2(remote: &super::aoe2::response::RemoteMatch, id: u64) -> Option<SessionMatch> {
    if !remote.supported()
        || !remote.is_finished()
        || remote
            .teams
            .iter()
            .flat_map(|team| &team.players)
            .filter(|p| p.human_profile_id() == Some(id))
            .count()
            != 1
    {
        return None;
    }
    let (team_index, player) = remote.teams.iter().enumerate().find_map(|(i, team)| {
        team.players
            .iter()
            .find(|p| p.human_profile_id() == Some(id))
            .map(|p| (i, p))
    })?;
    let won = player.won?;
    let finished_at = remote
        .finished
        .as_str()
        .or_else(|| remote.abandoned.as_ref().and_then(|v| v.as_str()))
        .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
        .map(|t| t.with_timezone(&Utc));
    Some(SessionMatch {
        game_id: "aoe2-de".into(),
        profile_id: id,
        id: format!("aoe2-{}", remote.match_id),
        started_at: remote.started,
        finished_at,
        observed_at: Utc::now(),
        map: remote
            .map_name
            .clone()
            .unwrap_or_else(|| "Mapa indisponível".into()),
        queue_id: remote.leaderboard.clone(),
        civilization: player
            .civ
            .clone()
            .or(player.civ_name.clone())
            .unwrap_or_default(),
        opponents: remote
            .teams
            .iter()
            .enumerate()
            .filter(|(i, _)| *i != team_index)
            .flat_map(|(_, team)| team.players.iter().map(|p| p.name.clone()))
            .collect(),
        won: Some(won),
        draw: false,
        rating_change: player.rating_diff,
        duration_seconds: finished_at
            .and_then(|end| (end - remote.started).to_std().ok())
            .map(|d| d.as_secs()),
    })
}
pub fn aoe4(remote: &super::aoe4::provider::RemoteGame, id: u64) -> Option<SessionMatch> {
    if !remote.supported()
        || !remote.finished()
        || remote.state == "discarded"
        || remote
            .teams
            .iter()
            .flatten()
            .filter(|p| p.profile_id == id)
            .count()
            != 1
    {
        return None;
    }
    let player = remote.teams.iter().flatten().find(|p| p.profile_id == id)?;
    let won = super::aoe4::provider::result(player.result.as_deref());
    let draw = matches!(player.result.as_deref(), Some("draw" | "tie"));
    if won.is_none() && !draw {
        return None;
    }
    let duration_seconds = remote.duration.filter(|d| *d <= 86400);
    let finished_at = duration_seconds
        .map(|duration| remote.started_at + chrono::Duration::seconds(duration as i64));
    Some(SessionMatch {
        game_id: "aoe4".into(),
        profile_id: id,
        id: remote.id(),
        started_at: remote.started_at,
        finished_at,
        observed_at: Utc::now(),
        map: remote.map.clone(),
        queue_id: super::aoe4::profile::queue(&remote.kind).map(str::to_owned),
        civilization: player.civilization.clone().unwrap_or_default(),
        opponents: remote
            .teams
            .iter()
            .flatten()
            .filter(|p| p.profile_id != id)
            .map(|p| p.name.clone())
            .collect(),
        won,
        draw,
        rating_change: player.rating_diff,
        duration_seconds,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Duration;
    use serde_json::json;
    fn record_at(start: DateTime<Utc>, id: &str) -> SessionMatch {
        SessionMatch {
            game_id: "aoe2-de".into(),
            profile_id: 42,
            id: id.into(),
            started_at: start,
            finished_at: Some(start + Duration::minutes(10)),
            observed_at: start + Duration::minutes(11),
            map: "Arena".into(),
            queue_id: Some("rm_1v1".into()),
            civilization: "franks".into(),
            opponents: vec!["Orion".into()],
            won: Some(true),
            draw: false,
            rating_change: None,
            duration_seconds: Some(600),
        }
    }
    #[test]
    fn session_is_scoped_to_game_profile_and_time_and_enriches_without_duplicate_results() {
        let start = Utc::now() - Duration::hours(3);
        let now = start + Duration::hours(2);
        let mut session = GameSession {
            game_id: "aoe2-de".into(),
            profile_id: 42,
            started_at: start,
            ended_at: None,
            matches: vec![],
        };
        let valid = record_at(start + Duration::minutes(1), "valid");
        let old = record_at(start - Duration::minutes(1), "old");
        let mut foreign = valid.clone();
        foreign.id = "foreign".into();
        foreign.profile_id = 99;
        let mut other_game = valid.clone();
        other_game.id = "aoe4-1".into();
        other_game.game_id = "aoe4".into();
        let mut pending = valid.clone();
        pending.id = "pending".into();
        pending.won = None;
        assert!(session.ingest(&[valid.clone(), old, foreign, other_game, pending], now));
        assert_eq!(session.matches.len(), 1);
        assert!(!session.ingest(std::slice::from_ref(&valid), now));
        let mut updated = valid.clone();
        updated.rating_change = Some(15);
        updated.observed_at += Duration::minutes(1);
        assert!(session.ingest(&[updated], now));
        assert_eq!(session.matches.len(), 1);
        assert_eq!(session.matches[0].rating_change, Some(15));
        assert!(!session.ingest(&[valid], now));
        let mut restored: GameSession =
            serde_json::from_slice(&serde_json::to_vec(&session).unwrap()).unwrap();
        restored.ended_at = Some(start + Duration::hours(1));
        let delayed = record_at(start + Duration::minutes(20), "delayed");
        let later = record_at(start + Duration::minutes(55), "later");
        let mut unknown_end = record_at(start + Duration::minutes(30), "unknown-end");
        unknown_end.finished_at = None;
        assert!(restored.ingest(&[delayed, later, unknown_end], now));
        assert_eq!(restored.matches.len(), 2);
    }
    #[test]
    fn source_adapters_keep_teammates_out_and_use_duration_not_server_update_time() {
        let mut age2: super::super::aoe2::response::RemoteMatch = serde_json::from_value(json!({"matchId":10,"started":"2026-11-12T12:00:00Z","finished":"2026-11-12T12:30:00Z","gameMode":"random_map","teams":[{"players":[{"profileId":42,"name":"Me","won":true},{"profileId":43,"name":"Ally","won":true}]},{"players":[{"profileId":44,"name":"Enemy","won":false}]}]})).unwrap();
        let result = aoe2(&age2, 42).unwrap();
        assert_eq!(result.opponents, vec!["Enemy"]);
        assert_eq!(result.duration_seconds, Some(1800));
        age2.finished = json!(false);
        assert!(aoe2(&age2, 42).is_none());
        let mut age4: super::super::aoe4::provider::RemoteGame = serde_json::from_value(json!({"game_id":10,"started_at":"2026-11-12T12:00:00Z","updated_at":"2026-11-12T17:00:00Z","duration":1800,"ongoing":false,"state":"processed","kind":"rm_1v1","map":"Arabia","teams":[[{"profile_id":42,"name":"Me","result":"win"}],[{"profile_id":43,"name":"Other","result":"loss"}]]})).unwrap();
        let result = aoe4(&age4, 42).unwrap();
        assert_eq!(
            result.finished_at.unwrap().to_rfc3339(),
            "2026-11-12T12:30:00+00:00"
        );
        age4.teams[0][0].result = None;
        assert!(aoe4(&age4, 42).is_none());
        age4.teams[0][0].result = Some("win".into());
        age4.state = "discarded".into();
        assert!(aoe4(&age4, 42).is_none());
    }
    #[test]
    fn post_game_does_not_popup_for_historical_hidden_or_unconfirmed_results() {
        let result: MatchSnapshot = serde_json::from_value(json!({"id":"aoe2-1","gameId":"aoe2-de","mode":"ranked","map":"Arena","source":"live","selfPlayerId":"42","finishedAt":"2026-11-12T12:30:00Z","players":[{"id":"42","name":"Me","civilization":"Franks","uniqueUnits":[],"symbol":"","won":true}]})).unwrap();
        let mut state = AppState::default();
        state.detection.config = DetectionConfig {
            game_id: "aoe2-de".into(),
            enabled: true,
            profile: Some(crate::detection::model::Profile {
                profile_id: 42,
                name: "Me".into(),
            }),
        };
        post_game(&mut state, &result);
        assert!(state.post_game.is_none());
        state.observed_age_match_id = Some(result.id.clone());
        let mut pending = result.clone();
        pending.players[0].won = None;
        post_game(&mut state, &pending);
        assert!(state.post_game.is_none());
        state.hidden_match_id = Some(result.id.clone());
        post_game(&mut state, &result);
        assert!(state.post_game.is_none());
        state.hidden_match_id = None;
        post_game(&mut state, &result);
        assert!(state.post_game.is_some());
        state.post_game = None;
        let mut next = result.clone();
        next.id = "aoe2-2".into();
        next.finished_at = None;
        state.current_match = Some(next);
        post_game(&mut state, &result);
        assert!(state.post_game.is_none());
        state.current_match = None;
        state.detection.config.profile.as_mut().unwrap().profile_id = 99;
        post_game(&mut state, &result);
        assert!(state.post_game.is_none());
    }
}
