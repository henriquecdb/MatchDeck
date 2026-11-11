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
}

impl Session {
    fn ingest(&mut self, handle: &str, records: &[ReplayRecord]) -> bool {
        let mut changed = false;
        for record in records {
            if record.started_at < self.started_at
                || self.ended_at.is_some_and(|end| record.finished_at > end)
                || self.matches.iter().any(|m| m.id == record.id)
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
            self.matches.push(SessionMatch {
                id: record.id.clone(),
                finished_at: record.finished_at,
                map: record.map.clone(),
                race: player.race.clone(),
                opponent: opponent.name.clone(),
                opponent_race: opponent.race.clone(),
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
        SessionAction::Start => {
            if current.as_ref().is_some_and(|s| s.ended_at.is_none()) {
                return Ok(current);
            }
            Session {
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
    storage::write_game(&app, &name, &next, "sc2")?;
    app.emit("sc2-session-changed", &next)
        .map_err(|e| e.to_string())?;
    Ok(Some(next))
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
}
