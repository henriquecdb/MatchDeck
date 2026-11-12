use super::replay::ReplayRecord;
use crate::{commands::SharedState, storage};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{Emitter, Manager, State};

#[derive(Default)]
pub struct SessionLock(pub Mutex<()>);

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionMatch {
    id: String,
    finished_at: DateTime<Utc>,
    map: String,
    race: String,
    opponent: String,
    opponent_race: String,
    #[serde(default)]
    opponent_id: Option<String>,
    #[serde(default)]
    duration_seconds: Option<u64>,
    won: Option<bool>,
    draw: bool,
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Session {
    profile_id: u64,
    started_at: DateTime<Utc>,
    ended_at: Option<DateTime<Utc>>,
    matches: Vec<SessionMatch>,
    #[serde(default)]
    mmr: Vec<SessionMmr>,
    #[serde(default)]
    mmr_status: Option<String>,
}

impl Session {
    fn ingest(&mut self, handle: &str, records: &[ReplayRecord]) -> bool {
        let mut changed = false;
        for record in records {
            if record.started_at < self.started_at
                || self.ended_at.is_some_and(|end| record.finished_at > end)
                || record.players.len() != 2
                || !record.includes(handle)
            {
                continue;
            }
            let Some(player) = record.players.iter().find(|p| p.handle == handle) else {
                continue;
            };
            let Some(opponent) = record.players.iter().find(|p| p.handle != handle) else {
                continue;
            };
            if player.won.is_none() && !player.draw {
                continue;
            }
            if let Some(saved) = self.matches.iter_mut().find(|m| m.id == record.id) {
                if saved.opponent_id.is_none() || saved.duration_seconds.is_none() {
                    saved.opponent_id = Some(opponent.handle.clone());
                    saved.duration_seconds = Some(
                        (record.finished_at - record.started_at)
                            .num_seconds()
                            .max(0) as u64,
                    );
                    changed = true;
                }
                continue;
            }
            self.matches.push(SessionMatch {
                id: record.id.clone(),
                finished_at: record.finished_at,
                map: record.map.clone(),
                race: player.race.clone(),
                opponent: opponent.name.clone(),
                opponent_race: opponent.race.clone(),
                opponent_id: Some(opponent.handle.clone()),
                duration_seconds: Some(
                    (record.finished_at - record.started_at)
                        .num_seconds()
                        .max(0) as u64,
                ),
                won: player.won,
                draw: player.draw,
            });
            changed = true;
        }
        self.matches.sort_by(|a, b| {
            b.finished_at
                .cmp(&a.finished_at)
                .then_with(|| a.id.cmp(&b.id))
        });
        changed
    }
}

fn filename(profile_id: u64) -> String {
    format!("session-{profile_id}.json")
}

pub fn active_for(app: &tauri::AppHandle, snapshot: &crate::model::MatchSnapshot) -> bool {
    if snapshot.game_id != "sc2" {
        return false;
    }
    let Some(profile_id) = snapshot
        .self_player_id
        .as_ref()
        .and_then(|id| id.parse::<u64>().ok())
    else {
        return false;
    };
    storage::read_game::<Session>(app, &filename(profile_id), "sc2")
        .is_some_and(|session| session.profile_id == profile_id && session.ended_at.is_none())
}

pub fn record(
    app: &tauri::AppHandle,
    profile_id: u64,
    handle: &str,
    records: &[ReplayRecord],
) -> Result<(), String> {
    let lock = app.state::<SessionLock>();
    let _guard = lock.0.lock().map_err(|e| e.to_string())?;
    let name = filename(profile_id);
    let Some(mut session) = storage::read_game::<Session>(app, &name, "sc2") else {
        return Ok(());
    };
    if session.profile_id == profile_id && session.ingest(handle, records) {
        storage::write_game(app, &name, &session, "sc2")?;
        app.emit("sc2-session-changed", &session)
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[derive(Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SessionAction {
    Read,
    Start,
    Finish,
    Refresh,
}

#[tauri::command]
pub fn sc2_session(
    app: tauri::AppHandle,
    state: State<'_, SharedState>,
    profile_id: u64,
    action: SessionAction,
) -> Result<Option<Session>, String> {
    let state = state.lock().map_err(|e| e.to_string())?;
    if state.detection.config.game_id != "sc2"
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
    let lock = app.state::<SessionLock>();
    let _guard = lock.0.lock().map_err(|e| e.to_string())?;
    let name = filename(profile_id);
    let current = storage::read_game::<Session>(&app, &name, "sc2")
        .filter(|session| session.profile_id == profile_id);
    let next = match action {
        SessionAction::Read => return Ok(current),
        SessionAction::Refresh => {
            let Some(mut session) = current else {
                return Err("Inicie uma sessão antes de consultar o MMR.".into());
            };
            if session.ended_at.is_some() {
                return Err("A sessão já foi encerrada.".into());
            }
            session.mmr_status = Some("loading".into());
            session
        }
        SessionAction::Start => {
            if current.as_ref().is_some_and(|s| s.ended_at.is_none()) {
                return Ok(current);
            }
            Session {
                profile_id,
                started_at: Utc::now(),
                ended_at: None,
                matches: vec![],
                mmr: vec![],
                mmr_status: Some("loading".into()),
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
    storage::write_game(&app, &name, &next, "sc2")?;
    if matches!(action, SessionAction::Start | SessionAction::Refresh) {
        sample_mmr(
            app.clone(),
            profile_id,
            next.started_at,
            matches!(action, SessionAction::Start),
        );
    }
    app.emit("sc2-session-changed", &next)
        .map_err(|e| e.to_string())?;
    Ok(Some(next))
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalHistory {
    profile_id: u64,
    matches: Vec<SessionMatch>,
}

pub fn record_history(
    app: &tauri::AppHandle,
    profile_id: u64,
    handle: &str,
    records: &[ReplayRecord],
) -> Result<(), String> {
    let lock = app.state::<SessionLock>();
    let _guard = lock.0.lock().map_err(|e| e.to_string())?;
    let name = format!("history-{profile_id}.json");
    let saved = storage::read_game::<LocalHistory>(app, &name, "sc2")
        .filter(|h| h.profile_id == profile_id);
    let mut accumulator = Session {
        profile_id,
        started_at: DateTime::<Utc>::MIN_UTC,
        ended_at: None,
        matches: saved.map(|h| h.matches).unwrap_or_default(),
        mmr: vec![],
        mmr_status: None,
    };
    if accumulator.ingest(handle, records) {
        let history = LocalHistory {
            profile_id,
            matches: accumulator.matches,
        };
        storage::write_game(app, &name, &history, "sc2")?;
        app.emit("sc2-history-changed", history)
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn sc2_history(
    app: tauri::AppHandle,
    state: State<'_, SharedState>,
    profile_id: u64,
) -> Result<LocalHistory, String> {
    let state = state.lock().map_err(|e| e.to_string())?;
    if state.detection.config.game_id != "sc2"
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
    let lock = app.state::<SessionLock>();
    let _guard = lock.0.lock().map_err(|e| e.to_string())?;
    Ok(
        storage::read_game::<LocalHistory>(&app, &format!("history-{profile_id}.json"), "sc2")
            .filter(|h| h.profile_id == profile_id)
            .unwrap_or(LocalHistory {
                profile_id,
                matches: vec![],
            }),
    )
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionMmr {
    race: String,
    season: u32,
    initial: Option<u32>,
    latest: u32,
    queried_at: DateTime<Utc>,
}

impl Session {
    fn observe_mmr(&mut self, data: &super::cache::PlayerData, baseline: bool) -> bool {
        if data.stale || self.ended_at.is_some() || data.fetched_at < self.started_at {
            return false;
        }
        let mut changed = false;
        for team in super::provider::latest_teams(data.teams.clone(), &data.character) {
            let (Some(rating), Some(race)) = (team.rating, team.race(self.profile_id)) else {
                continue;
            };
            if let Some(row) = self
                .mmr
                .iter_mut()
                .find(|m| m.race == race && m.season == team.season)
            {
                if data.fetched_at > row.queried_at {
                    row.latest = rating;
                    row.queried_at = data.fetched_at;
                    changed = true;
                }
            } else {
                self.mmr.push(SessionMmr {
                    race: race.into(),
                    season: team.season,
                    initial: (baseline && self.matches.is_empty()).then_some(rating),
                    latest: rating,
                    queried_at: data.fetched_at,
                });
                changed = true;
            }
        }
        changed
    }
}

pub fn sample_mmr(
    app: tauri::AppHandle,
    profile_id: u64,
    started_at: DateTime<Utc>,
    baseline: bool,
) {
    tauri::async_runtime::spawn(async move {
        {
            let lock = app.state::<SessionLock>();
            if let Ok(_guard) = lock.0.lock() {
                if let Some(mut session) =
                    storage::read_game::<Session>(&app, &filename(profile_id), "sc2")
                        .filter(|s| s.started_at == started_at && s.ended_at.is_none())
                {
                    session.mmr_status = Some("loading".into());
                    if storage::write_game(&app, &filename(profile_id), &session, "sc2").is_ok() {
                        let _ = app.emit("sc2-session-changed", session);
                    }
                } else {
                    return;
                }
            };
        }
        let provider = app
            .state::<crate::detection::service::DetectionController>()
            .sc2
            .clone();
        let result = provider.player_data(profile_id, true).await;
        let can_baseline = app.state::<SharedState>().lock().is_ok_and(|state| {
            state.current_match.is_none()
                && state.detection.config.game_id == "sc2"
                && state
                    .detection
                    .config
                    .profile
                    .as_ref()
                    .map(|p| p.profile_id)
                    == Some(profile_id)
        });
        let lock = app.state::<SessionLock>();
        let Ok(_guard) = lock.0.lock() else { return };
        let name = filename(profile_id);
        let Some(mut session) = storage::read_game::<Session>(&app, &name, "sc2") else {
            return;
        };
        if session.profile_id != profile_id
            || session.started_at != started_at
            || session.ended_at.is_some()
        {
            return;
        }
        session.mmr_status = Some(
            match result {
                Err(_) => "error",
                Ok(data) if data.stale => "stale",
                Ok(data) => {
                    session.observe_mmr(&data, baseline && can_baseline);
                    if session.mmr.is_empty() {
                        "unavailable"
                    } else {
                        "ready"
                    }
                }
            }
            .into(),
        );
        if storage::write_game(&app, &name, &session, "sc2").is_ok() {
            let _ = app.emit("sc2-session-changed", session);
        }
    });
}

pub fn sample_after_game(app: &tauri::AppHandle, profile_id: u64) {
    if let Some(session) = storage::read_game::<Session>(app, &filename(profile_id), "sc2")
        .filter(|s| s.ended_at.is_none())
    {
        let app = app.clone();
        tauri::async_runtime::spawn(async move {
            tokio::time::sleep(std::time::Duration::from_secs(5)).await;
            sample_mmr(app, profile_id, session.started_at, false);
        });
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::games::sc2::replay::ReplayPlayer;
    use chrono::Duration;

    #[test]
    #[ignore = "requires a local replay and saved session"]
    fn local_replay_is_recovered_into_its_saved_session() {
        let replay = std::env::var("MATCHDECK_TEST_REPLAY").unwrap();
        let saved = std::env::var("MATCHDECK_TEST_SESSION").unwrap();
        let handle = std::env::var("MATCHDECK_TEST_HANDLE").unwrap();
        let mut session: Session = serde_json::from_slice(&std::fs::read(saved).unwrap()).unwrap();
        let record = crate::games::sc2::replay::parse(std::path::Path::new(&replay)).unwrap();
        let expected = record
            .players
            .iter()
            .find(|p| p.handle == handle)
            .unwrap()
            .won;
        session.ingest(&handle, std::slice::from_ref(&record));
        assert_eq!(
            session.matches.iter().filter(|m| m.id == record.id).count(),
            1
        );
        assert!(session
            .matches
            .iter()
            .any(|m| m.id == record.id && m.won == expected));
        assert!(!session.ingest(&handle, &[record]));
        println!(
            "Recovered {} confirmed session matches",
            session.matches.len()
        );
    }

    fn replay(id: &str, start: DateTime<Utc>, won: Option<bool>) -> ReplayRecord {
        ReplayRecord {
            id: id.into(),
            map: "Arena".into(),
            started_at: start,
            finished_at: start + Duration::minutes(5),
            queue: "sc2_matchmade_1v1".into(),
            players: vec![
                ReplayPlayer {
                    handle: "1-S2-1-42".into(),
                    name: "Nova".into(),
                    race: "TERRAN".into(),
                    won,
                    draw: won.is_none(),
                },
                ReplayPlayer {
                    handle: "1-S2-2-99".into(),
                    name: "Orion".into(),
                    race: "ZERG".into(),
                    won: won.map(|won| !won),
                    draw: won.is_none(),
                },
            ],
        }
    }

    #[test]
    fn counts_only_owned_replays_inside_the_session_and_survives_restarts() {
        let start = DateTime::parse_from_rfc3339("2026-11-10T23:50:00Z")
            .unwrap()
            .with_timezone(&Utc);
        let mut session = Session {
            profile_id: 123,
            started_at: start,
            ended_at: None,
            matches: vec![],
            mmr: vec![],
            mmr_status: None,
        };
        let win = replay("win", start + Duration::minutes(1), Some(true));
        let loss = replay("loss", start + Duration::minutes(15), Some(false));
        let old = replay("old", start - Duration::minutes(1), Some(false));
        let mut foreign = replay("other-profile", start, Some(true));
        foreign.players[0].handle = "1-S2-2-42".into();
        assert!(session.ingest("1-S2-1-42", &[old, foreign, loss.clone(), win.clone()]));
        assert_eq!(session.matches.len(), 2);
        assert_eq!(session.matches[0].id, "loss");
        assert_eq!(session.matches[1].won, Some(true));
        assert_eq!(session.matches[0].opponent, "Orion");
        assert!(!session.ingest("1-S2-1-42", &[win, loss]));
        let mut restored: Session =
            serde_json::from_slice(&serde_json::to_vec(&session).unwrap()).unwrap();
        restored.ended_at = Some(start + Duration::minutes(30));
        let delayed = replay("delayed-draw", start + Duration::minutes(22), None);
        let later = replay("after-end", start + Duration::minutes(29), Some(true));
        assert!(restored.ingest("1-S2-1-42", &[delayed.clone(), later]));
        assert_eq!(restored.matches.len(), 3);
        assert_eq!(restored.matches[0].id, "delayed-draw");
        assert!(restored.matches[0].draw);
        assert!(!restored.ingest("1-S2-1-42", &[delayed]));
    }

    #[test]
    fn migrates_old_session_and_enriches_duplicates_without_counting_again() {
        let start = Utc::now() - Duration::hours(1);
        let mut session: Session = serde_json::from_value(
            serde_json::json!({ "profileId":42,"startedAt":start,"endedAt":null,"matches":[] }),
        )
        .unwrap();
        assert!(session.mmr.is_empty());
        let record = replay("one", start + Duration::minutes(1), Some(true));
        assert!(session.ingest("1-S2-1-42", std::slice::from_ref(&record)));
        session.matches[0].opponent_id = None;
        session.matches[0].duration_seconds = None;
        assert!(session.ingest("1-S2-1-42", std::slice::from_ref(&record)));
        assert_eq!(session.matches.len(), 1);
        assert_eq!(session.matches[0].opponent_id.as_deref(), Some("1-S2-2-99"));
        assert_eq!(session.matches[0].duration_seconds, Some(300));
        assert!(!session.ingest("1-S2-1-42", &[record]));
    }

    fn mmr_data(time: DateTime<Utc>, season: u32, rating: u32) -> super::super::cache::PlayerData {
        let character = serde_json::json!({"id":42,"name":"Nova#123","region":"US","realm":1,"battlenetId":900});
        super::super::cache::PlayerData {
            character: serde_json::from_value(character.clone()).unwrap(),
            teams: serde_json::from_value(serde_json::json!([{"rating":rating,"season":season,"region":"US","queueType":201,"legacyUid":"test","members":[{"character":character,"raceGames":{"TERRAN":16}}]}])).unwrap(),
            fetched_at: time, stale: false,
        }
    }

    #[test]
    fn mmr_samples_preserve_baseline_and_reject_stale_or_older_queries() {
        let start = Utc::now() - Duration::hours(1);
        let mut session = Session {
            profile_id: 42,
            started_at: start,
            ended_at: None,
            matches: vec![],
            mmr: vec![],
            mmr_status: None,
        };
        let mut data = mmr_data(start + Duration::seconds(1), 68, 4200);
        assert!(session.observe_mmr(&data, true));
        data.teams[0].rating = Some(4220);
        data.fetched_at += Duration::minutes(10);
        assert!(session.observe_mmr(&data, false));
        assert_eq!(session.mmr[0].initial, Some(4200));
        assert_eq!(session.mmr[0].latest, 4220);
        let mut old = data.clone();
        old.fetched_at -= Duration::seconds(1);
        assert!(!session.observe_mmr(&old, false));
        old.fetched_at += Duration::minutes(1);
        old.stale = true;
        assert!(!session.observe_mmr(&old, false));
        data.teams[0].season = 69;
        assert!(session.observe_mmr(&data, false));
        assert_eq!(session.mmr[1].initial, None);
        session.ended_at = Some(Utc::now());
        data.fetched_at += Duration::minutes(1);
        assert!(!session.observe_mmr(&data, false));
    }

    #[test]
    fn late_first_sample_never_invents_an_initial_mmr() {
        let start = Utc::now() - Duration::hours(1);
        let mut session = Session {
            profile_id: 42,
            started_at: start,
            ended_at: None,
            matches: vec![],
            mmr: vec![],
            mmr_status: None,
        };
        let data = mmr_data(start + Duration::minutes(10), 68, 4200);
        assert!(session.observe_mmr(&data, false));
        assert_eq!(session.mmr[0].initial, None);
        session.mmr.clear();
        session.ingest("1-S2-1-42", &[replay("played", start, Some(true))]);
        assert!(session.observe_mmr(&data, true));
        assert_eq!(session.mmr[0].initial, None);
    }
}
