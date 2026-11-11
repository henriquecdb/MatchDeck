mod archive;
mod details;
pub(super) mod monitor;
mod options;
pub use monitor::{history, latest, watch};

use crate::{
    games::profile::RecentMatch,
    model::{MatchMode, MatchSnapshot, MatchSource, Player},
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{io::Read, path::Path};
const INVALID: &str = "Replay SC2 sem um resultado 1v1 compatível";
pub const CONFIRMED: &str = "Resultado confirmado por replay local.";
#[derive(Clone, Deserialize, Serialize)]
pub struct ReplayPlayer {
    pub handle: String,
    pub name: String,
    pub race: String,
    pub won: Option<bool>,
    pub draw: bool,
}
#[derive(Clone, Deserialize, Serialize)]
pub struct ReplayRecord {
    pub id: String,
    pub map: String,
    pub finished_at: DateTime<Utc>,
    pub started_at: DateTime<Utc>,
    pub queue: String,
    pub players: Vec<ReplayPlayer>,
}
fn number(value: &Value, key: &str) -> Result<i64, String> {
    value[key].as_i64().ok_or_else(|| INVALID.into())
}
fn clean_name(value: &str) -> String {
    value
        .rsplit("<sp/>")
        .next()
        .unwrap_or(value)
        .trim()
        .to_string()
}

fn replay_duration(metadata: &Value, details: &Value) -> Result<chrono::Duration, String> {
    let seconds = metadata["Duration"]
        .as_i64()
        .filter(|n| (0..=86400).contains(n))
        .ok_or(INVALID)?;
    // Replay metadata uses the 16-loop clock. Faster runs at 22.4 loops per real second.
    Ok(if details["12"].as_i64() == Some(4) {
        chrono::Duration::milliseconds(seconds * 5000 / 7)
    } else {
        chrono::Duration::seconds(seconds)
    })
}
impl ReplayRecord {
    pub fn includes(&self, handle: &str) -> bool {
        self.players.iter().filter(|p| p.handle == handle).count() == 1
    }
    pub fn snapshot(&self, profile_id: u64, handle: &str) -> MatchSnapshot {
        let players: Vec<Player> = self
            .players
            .iter()
            .enumerate()
            .map(|(i, p)| {
                let mut player = super::service::base_player(
                    if p.handle == handle {
                        profile_id.to_string()
                    } else {
                        format!("sc2-toon-{}", p.handle)
                    },
                    p.name.clone(),
                    &p.race,
                    i,
                );
                player.won = p.won;
                player.draw = Some(p.draw);
                player
            })
            .collect();
        MatchSnapshot {
            id: self.id.clone(),
            game_id: "sc2".into(),
            mode: MatchMode::Unknown,
            map: self.map.clone(),
            source: MatchSource::Live,
            players,
            queue: Some(
                match self.queue.as_str() {
                    "sc2_matchmade_1v1" => "1v1 · matchmaking",
                    "sc2_custom_1v1" => "1v1 · personalizada",
                    _ => "1v1 · replay local",
                }
                .into(),
            ),
            queue_id: Some(self.queue.clone()),
            warnings: vec![CONFIRMED.into()],
            synced_at: Some(Utc::now().to_rfc3339()),
            replay_of: None,
            finished_at: Some(self.finished_at.to_rfc3339()),
            self_player_id: Some(profile_id.to_string()),
        }
    }
    pub fn recent(&self, handle: &str) -> Option<RecentMatch> {
        let p = self.players.iter().find(|p| p.handle == handle)?;
        Some(RecentMatch {
            id: self.id.clone(),
            started_at: self.started_at.to_rfc3339(),
            queue_id: Some(self.queue.clone()),
            map: self.map.clone(),
            civilization_id: Some(p.race.clone()),
            civilization: Some(p.race.clone()),
            won: p.won,
            draw: Some(p.draw),
            rating_change: None,
        })
    }
}
pub fn parse(path: &Path) -> Result<ReplayRecord, String> {
    let metadata = std::fs::symlink_metadata(path).map_err(|_| INVALID)?;
    if !metadata.is_file() || metadata.file_type().is_symlink() || metadata.len() > 16 * 1024 * 1024
    {
        return Err(INVALID.into());
    }
    let mut bytes = Vec::new();
    std::fs::File::open(path)
        .map_err(|_| INVALID)?
        .take(16 * 1024 * 1024 + 1)
        .read_to_end(&mut bytes)
        .map_err(|_| INVALID)?;
    let archive = archive::Archive::new(&bytes)?;
    let metadata: Value =
        serde_json::from_slice(&archive.read("replay.gamemetadata.json")?).map_err(|_| INVALID)?;
    let details = details::decode(&archive.read("replay.details")?)?;
    let players = details["0"].as_array().ok_or(INVALID)?;
    if players.len() != 2 || number(&players[0], "5")? == number(&players[1], "5")? {
        return Err(INVALID.into());
    }
    let meta_players = metadata["Players"].as_array().ok_or(INVALID)?;
    let mut mapped = Vec::new();
    for p in players {
        if number(p, "4")? != 2 || number(p, "7")? != 0 {
            return Err(INVALID.into());
        }
        let toon = &p["1"];
        let region = number(toon, "0")?;
        let realm = number(toon, "2")?;
        let id = number(toon, "4")?;
        if ![1, 2, 3, 5].contains(&region) || !(1..=2).contains(&realm) || id <= 0 {
            return Err(INVALID.into());
        }
        let slot = number(p, "9")? + 1;
        let meta = meta_players
            .iter()
            .find(|v| v["PlayerID"].as_i64() == Some(slot))
            .ok_or(INVALID)?;
        let name = clean_name(p["0"].as_str().ok_or(INVALID)?);
        if name.is_empty() || name.chars().count() > 128 {
            return Err(INVALID.into());
        }
        let race = super::response::race(p["2"].as_str().ok_or(INVALID)?)
            .ok_or(INVALID)?
            .into();
        let result = meta["Result"].as_str().ok_or(INVALID)?;
        let won = super::response::outcome(result);
        let draw = result.eq_ignore_ascii_case("tie") || result.eq_ignore_ascii_case("draw");
        if won.is_none() && !draw {
            return Err(INVALID.into());
        }
        mapped.push(ReplayPlayer {
            handle: format!("{region}-S2-{realm}-{id}"),
            name,
            race,
            won,
            draw,
        });
    }
    if mapped[0].handle == mapped[1].handle || (!mapped[0].draw && mapped[0].won == mapped[1].won) {
        return Err(INVALID.into());
    }
    let end = number(&details, "5")? / 10_000_000 - 11_644_473_600;
    let finished_at = DateTime::from_timestamp(end, 0).ok_or(INVALID)?;
    if finished_at > Utc::now() + chrono::Duration::minutes(10) {
        return Err(INVALID.into());
    }
    let started_at = finished_at - replay_duration(&metadata, &details)?;
    let map = metadata["Title"]
        .as_str()
        .filter(|s| !s.is_empty() && s.len() <= 256)
        .ok_or(INVALID)?
        .to_string();
    let queue = archive
        .read("replay.initData")
        .ok()
        .and_then(|data| options::queue(&data, metadata["BaseBuild"].as_str().unwrap_or("")).ok())
        .unwrap_or("sc2_replay_1v1")
        .into();
    let id = format!("sc2-replay-{end}-{}-{}", mapped[0].handle, mapped[1].handle);
    Ok(ReplayRecord {
        id,
        map,
        finished_at,
        started_at,
        queue,
        players: mapped,
    })
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn snapshot_and_history_are_bound_to_the_exact_character_without_inventing_mmr() {
        let now = Utc::now();
        let record = ReplayRecord {
            id: "test".into(),
            map: "Arena".into(),
            finished_at: now,
            started_at: now,
            queue: "sc2_matchmade_1v1".into(),
            players: vec![
                ReplayPlayer {
                    handle: "1-S2-2-42".into(),
                    name: "Nova".into(),
                    race: "TERRAN".into(),
                    won: Some(false),
                    draw: false,
                },
                ReplayPlayer {
                    handle: "1-S2-1-99".into(),
                    name: "Orion".into(),
                    race: "ZERG".into(),
                    won: Some(true),
                    draw: false,
                },
            ],
        };
        assert!(record.includes("1-S2-2-42"));
        assert!(!record.includes("1-S2-1-42"));
        let snapshot = record.snapshot(123, "1-S2-2-42");
        assert_eq!(snapshot.self_player_id.as_deref(), Some("123"));
        assert_eq!(snapshot.players[0].won, Some(false));
        assert!(snapshot
            .players
            .iter()
            .all(|p| p.mmr.is_none() && p.rating_change.is_none()));
        assert!(record.recent("1-S2-1-42").is_none());
        assert_eq!(record.recent("1-S2-2-42").unwrap().won, Some(false));
    }
    #[test]
    fn strips_clan_markup_without_treating_it_as_identity() {
        assert_eq!(clean_name("&lt;Clan&gt;<sp/>Nova"), "Nova");
    }
    #[test]
    fn faster_replay_duration_uses_wall_clock_time_for_session_boundaries() {
        let metadata = serde_json::json!({"Duration": 997});
        let duration = replay_duration(&metadata, &serde_json::json!({"12": 4})).unwrap();
        assert_eq!(duration.num_milliseconds(), 712142);
        let end = DateTime::parse_from_rfc3339("2026-11-11T02:18:12Z").unwrap();
        let session_start = DateTime::parse_from_rfc3339("2026-11-11T02:04:47Z").unwrap();
        assert!(end - duration > session_start);
        assert_eq!(
            replay_duration(&metadata, &serde_json::json!({"12": 2}))
                .unwrap()
                .num_seconds(),
            997
        );
        assert!(replay_duration(&serde_json::json!({"Duration": -1}), &Value::Null).is_err());
    }

    #[test]
    #[ignore = "requires local SC2 replay"]
    fn local_replays_smoke_test() {
        let dir = std::env::var("MATCHDECK_TEST_REPLAY_DIR").unwrap();
        let start = std::time::Instant::now();
        let mut count = 0;
        for entry in std::fs::read_dir(dir).unwrap().take(32) {
            let entry = entry.unwrap();
            if entry
                .path()
                .extension()
                .is_some_and(|ext| ext == "SC2Replay")
            {
                match parse(&entry.path()) {
                    Ok(record) => {
                        assert_eq!(record.players.len(), 2);
                        println!(
                            "{} | {} | {:?} | {:?}",
                            record.map, record.queue, record.players[0].won, record.players[1].won
                        );
                        count += 1;
                    }
                    Err(e) => println!("Unsupported: {e}"),
                }
            }
        }
        assert!(count > 0);
        println!("Parsed {count} replays in {:?}", start.elapsed());
    }
}
