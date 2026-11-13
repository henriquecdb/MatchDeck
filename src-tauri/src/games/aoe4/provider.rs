use crate::{
    detection::model::Profile,
    model::{MatchMode, MatchSnapshot, MatchSource, Player},
};
use chrono::{DateTime, Utc};
use reqwest::{Client, StatusCode};
use serde::{de::DeserializeOwned, Deserialize};
use std::{collections::HashMap, time::Duration};

const API: &str = "https://aoe4world.com/api/v0";

#[derive(Clone)]
pub struct Aoe4Provider {
    client: Client,
}

#[derive(Deserialize)]
pub struct RemoteProfile {
    pub profile_id: u64,
    pub steam_id: Option<String>,
    pub name: String,
    #[serde(default)]
    pub modes: HashMap<String, super::profile::ProfileMode>,
}

impl RemoteProfile {
    fn resolve(self, requested_id: u64) -> Result<Profile, String> {
        let requested = requested_id.to_string();
        let matches_steam =
            requested.len() == 17 && self.steam_id.as_deref() == Some(requested.as_str());
        if self.profile_id == 0 || (self.profile_id != requested_id && !matches_steam) {
            return Err("A fonte retornou um perfil diferente do solicitado".into());
        }
        Ok(Profile {
            profile_id: self.profile_id,
            name: self.name,
        })
    }
}

#[derive(Clone, Deserialize)]
pub struct RemoteGame {
    pub game_id: u64,
    pub started_at: DateTime<Utc>,
    pub updated_at: Option<String>,
    pub duration: Option<u64>,
    pub ongoing: bool,
    pub state: String,
    pub kind: String,
    pub map: String,
    #[serde(deserialize_with = "deserialize_teams")]
    pub teams: Vec<Vec<RemotePlayer>>,
}

#[derive(Clone, Deserialize)]
pub struct RemotePlayer {
    pub profile_id: u64,
    pub name: String,
    pub civilization: Option<String>,
    pub rating: Option<u32>,
    pub mmr: Option<u32>,
    pub rating_diff: Option<i32>,
    pub result: Option<String>,
    #[serde(default)]
    pub modes: HashMap<String, ModeStats>,
}

#[derive(Clone, Deserialize)]
pub struct ModeStats {
    pub rank: Option<u32>,
    pub rank_level: Option<String>,
    pub rating: Option<u32>,
    pub wins_count: Option<u32>,
    pub losses_count: Option<u32>,
}

impl RemoteGame {
    pub fn id(&self) -> String {
        format!("aoe4-{}", self.game_id)
    }
    pub fn includes(&self, profile_id: u64) -> bool {
        self.teams
            .iter()
            .flatten()
            .any(|p| p.profile_id == profile_id)
    }
    pub fn supported(&self) -> bool {
        matches!(self.kind.as_str(), "rm_1v1" | "qm_1v1")
            && self.teams.len() == 2
            && self.teams.iter().all(|team| team.len() == 1)
    }
    pub fn finished(&self) -> bool {
        !self.ongoing && matches!(self.state.as_str(), "finished" | "processed" | "discarded")
    }
    pub fn fresh(&self, now: DateTime<Utc>) -> bool {
        (-120..=43200).contains(&now.signed_duration_since(self.started_at).num_seconds())
    }

    pub fn snapshot(&self, profile_id: u64) -> MatchSnapshot {
        let queue = if self.kind == "rm_1v1" {
            "rm_solo"
        } else {
            "qm_1v1"
        };
        let players = self
            .teams
            .iter()
            .enumerate()
            .flat_map(|(team, players)| players.iter().map(move |player| (team, player)))
            .map(|(team, player)| {
                let stats = player.modes.get(queue);
                Player {
                    stats_cache: None,
                    identity_hint: None,
                    id: player.profile_id.to_string(),
                    name: player.name.clone(),
                    civilization: player
                        .civilization
                        .clone()
                        .unwrap_or_else(|| "Civilização indisponível".into()),
                    civilization_id: player.civilization.clone(),
                    unique_units: vec![],
                    symbol: String::new(),
                    team_id: Some(team as i32 + 1),
                    color: None,
                    color_hex: None,
                    rating: player.rating.or_else(|| stats.and_then(|s| s.rating)),
                    mmr: player.mmr,
                    rank: stats.and_then(|s| s.rank),
                    rank_level: stats.and_then(|s| s.rank_level.clone()),
                    wins: stats.and_then(|s| s.wins_count),
                    draws: None,
                    losses: stats.and_then(|s| s.losses_count),
                    rating_change: if self.finished() {
                        player.rating_diff
                    } else {
                        None
                    },
                    draw: None,
                    won: if self.finished() {
                        result(player.result.as_deref())
                    } else {
                        None
                    },
                }
            })
            .collect();
        MatchSnapshot {
            duration_seconds: self.duration.filter(|d| *d <= 86400),
            id: self.id(),
            game_id: "aoe4".into(),
            mode: if self.kind == "rm_1v1" {
                MatchMode::Ranked
            } else {
                MatchMode::Quick
            },
            map: self.map.clone(),
            source: MatchSource::Live,
            players,
            queue: Some(
                if self.kind == "rm_1v1" {
                    "RM 1v1"
                } else {
                    "QM 1v1"
                }
                .into(),
            ),
            queue_id: Some(queue.into()),
            warnings: vec![],
            synced_at: Some(Utc::now().to_rfc3339()),
            replay_of: None,
            finished_at: self.finished().then(|| {
                self.updated_at
                    .clone()
                    .unwrap_or_else(|| Utc::now().to_rfc3339())
            }),
            self_player_id: Some(profile_id.to_string()),
        }
    }

    pub fn record_outcome(&self, current: &MatchSnapshot) -> MatchSnapshot {
        let mut snapshot = current.clone();
        snapshot.duration_seconds = self.duration.filter(|d| *d <= 86400);
        snapshot.finished_at = Some(
            self.updated_at
                .clone()
                .unwrap_or_else(|| Utc::now().to_rfc3339()),
        );
        for player in &mut snapshot.players {
            if let Some(remote) = self
                .teams
                .iter()
                .flatten()
                .find(|remote| remote.profile_id.to_string() == player.id)
            {
                player.won = result(remote.result.as_deref());
                player.draw = Some(matches!(remote.result.as_deref(), Some("draw" | "tie")));
                player.rating_change = remote.rating_diff;
            }
        }
        snapshot
    }
}

fn deserialize_teams<'de, D>(deserializer: D) -> Result<Vec<Vec<RemotePlayer>>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum Entry {
        Wrapped { player: RemotePlayer },
        Direct(RemotePlayer),
    }
    let teams = Vec::<Vec<Entry>>::deserialize(deserializer)?;
    Ok(teams
        .into_iter()
        .map(|team| {
            team.into_iter()
                .map(|entry| match entry {
                    Entry::Wrapped { player } | Entry::Direct(player) => player,
                })
                .collect()
        })
        .collect())
}

pub(crate) fn result(value: Option<&str>) -> Option<bool> {
    match value {
        Some("win") => Some(true),
        Some("loss") => Some(false),
        _ => None,
    }
}

impl Aoe4Provider {
    pub fn new() -> Result<Self, String> {
        Ok(Self {
            client: Client::builder()
                .timeout(Duration::from_secs(15))
                .user_agent(concat!(
                    "MatchDeck/",
                    env!("CARGO_PKG_VERSION"),
                    " (https://github.com/henriquecdb/MatchDeck)"
                ))
                .build()
                .map_err(|error| error.to_string())?,
        })
    }

    async fn get<T: DeserializeOwned>(&self, path: &str) -> Result<Option<T>, String> {
        let response = self
            .client
            .get(format!("{API}{path}"))
            .send()
            .await
            .map_err(|_| "Não foi possível conectar ao AoE4 World")?;
        if response.status() == StatusCode::NOT_FOUND {
            return Ok(None);
        }
        response
            .error_for_status()
            .map_err(|error| {
                format!(
                    "AoE4 World: erro HTTP {}",
                    error.status().map(|s| s.as_u16()).unwrap_or(0)
                )
            })?
            .json()
            .await
            .map_err(|_| "AoE4 World retornou dados incompatíveis".into())
    }

    pub async fn local_profile(&self, roots: &[std::path::PathBuf]) -> Result<Profile, String> {
        let steam_id = crate::games::local_profile::aoe4(roots)?;
        self.resolve_profile(&steam_id).await
    }

    pub async fn resolve_profile(&self, input: &str) -> Result<Profile, String> {
        let id = profile_id(input)?;
        let profile: RemoteProfile = self
            .get(&format!("/players/{id}"))
            .await?
            .ok_or("Perfil não encontrado no AoE4 World")?;
        profile.resolve(id)
    }

    pub async fn profile_overview(
        &self,
        profile_id: u64,
    ) -> Result<crate::games::profile::ProfileOverview, String> {
        let profile_path = format!("/players/{profile_id}");
        let games_path = format!("/players/{profile_id}/games?limit=10&include_alts=false");
        let (profile, games) = tokio::try_join!(
            self.get::<RemoteProfile>(&profile_path),
            self.get::<super::profile::GameFeed>(&games_path)
        )?;
        let profile = profile.ok_or("Perfil não encontrado no AoE4 World")?;
        if profile.profile_id != profile_id {
            return Err("A fonte retornou um perfil diferente do solicitado".into());
        }
        Ok(super::profile::overview(
            profile,
            games.ok_or("Histórico indisponível no AoE4 World")?,
        ))
    }

    pub async fn latest_result(&self, profile_id: u64) -> Result<Option<RemoteGame>, String> {
        let feed: Option<super::profile::GameFeed> = self
            .get(&format!(
                "/players/{profile_id}/games?limit=20&include_alts=false&include_stats=true"
            ))
            .await?;
        Ok(feed
            .ok_or("Histórico indisponível no AoE4 World")?
            .games
            .into_iter()
            .filter(|game| game.includes(profile_id) && game.supported() && game.finished())
            .max_by_key(|game| game.started_at))
    }

    pub async fn last_game(
        &self,
        profile_id: u64,
        stats: bool,
    ) -> Result<Option<RemoteGame>, String> {
        self.get(&format!(
            "/players/{profile_id}/games/last?include_alts=false&include_stats={stats}"
        ))
        .await
    }

    pub async fn game(&self, profile_id: u64, game_id: u64) -> Result<Option<RemoteGame>, String> {
        self.get(&format!(
            "/players/{profile_id}/games/{game_id}?include_alts=false"
        ))
        .await
    }
}

pub fn profile_id(input: &str) -> Result<u64, String> {
    let value = input.trim();
    let id = if value.bytes().all(|b| b.is_ascii_digit()) {
        value.to_string()
    } else {
        let url = reqwest::Url::parse(value)
            .map_err(|_| "Informe o ID ou link do perfil no AoE4 World")?;
        if url.scheme() != "https"
            || url.host_str() != Some("aoe4world.com")
            || !url.username().is_empty()
            || url.password().is_some()
        {
            return Err("Use um link https://aoe4world.com/players/ID".into());
        }
        let mut path = url.path_segments().ok_or("Link de perfil inválido")?;
        if path.next() != Some("players") {
            return Err("Link de perfil inválido".into());
        }
        path.next()
            .unwrap_or_default()
            .split('-')
            .next()
            .unwrap_or_default()
            .to_string()
    };
    id.parse::<u64>()
        .ok()
        .filter(|id| *id > 0)
        .ok_or_else(|| "ID de perfil inválido".into())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn profile_links_and_steam_aliases_resolve_to_the_canonical_profile() {
        let steam = "76561198000000042";
        for input in [
            "42".to_string(),
            "https://aoe4world.com/players/42-player".to_string(),
            steam.to_string(),
            format!("https://aoe4world.com/players/{steam}"),
        ] {
            let remote: RemoteProfile = serde_json::from_value(json!({
                "profile_id":42,"steam_id":steam,"name":"Player"
            }))
            .unwrap();
            let resolved = remote.resolve(profile_id(&input).unwrap()).unwrap();
            assert_eq!(resolved.profile_id, 42);
            assert_eq!(resolved.name, "Player");
        }
    }

    #[test]
    fn aliases_do_not_allow_unrelated_or_invalid_profile_responses() {
        for (requested, response) in [
            (
                99,
                json!({"profile_id":42,"steam_id":"76561198000000042","name":"Player"}),
            ),
            (
                76561198000000043,
                json!({"profile_id":42,"steam_id":"76561198000000042","name":"Player"}),
            ),
            (76561198000000042, json!({"profile_id":42,"name":"Player"})),
            (
                76561198000000042,
                json!({"profile_id":0,"steam_id":"76561198000000042","name":"Player"}),
            ),
            (43, json!({"profile_id":42,"steam_id":"43","name":"Player"})),
        ] {
            let remote: RemoteProfile = serde_json::from_value(response).unwrap();
            assert!(remote.resolve(requested).is_err());
        }
        let remote: RemoteProfile =
            serde_json::from_value(json!({"profile_id":42,"name":"Player"})).unwrap();
        assert_eq!(remote.resolve(42).unwrap().profile_id, 42);
    }

    #[tokio::test]
    #[ignore = "requires public AoE4 World APIs"]
    async fn live_api_smoke_test() {
        let provider = Aoe4Provider::new().unwrap();
        let input =
            std::env::var("MATCHDECK_TEST_AOE4_PROFILE").unwrap_or_else(|_| "4635035".into());
        let profile = provider.resolve_profile(&input).await.unwrap();
        assert!(profile.profile_id > 0);
        if input.len() < 17 {
            assert_eq!(profile.profile_id.to_string(), input);
        }
        if let Some(game) = provider.latest_result(profile.profile_id).await.unwrap() {
            assert!(game.finished());
            assert!(game.includes(profile.profile_id));
            assert!(game.snapshot(profile.profile_id).finished_at.is_some());
        }
        for stats in [false, true] {
            if let Some(game) = provider.last_game(profile.profile_id, stats).await.unwrap() {
                assert!(game.includes(profile.profile_id));
                assert!(!game.teams.is_empty());
                let snapshot = game.snapshot(profile.profile_id);
                assert_eq!(snapshot.game_id, "aoe4");
                assert!(!snapshot.players.is_empty());
            }
        }
    }
    pub fn fixture(ongoing: bool) -> RemoteGame {
        serde_json::from_value(json!({
        "game_id":1,"started_at":"2026-11-03T10:00:00Z","updated_at":"2026-11-03T10:30:00Z","ongoing":ongoing,
        "state":if ongoing {"new"} else {"finished"},"kind":"rm_1v1","map":"Dry Arabia",
        "teams":[[{"profile_id":42,"name":"Player","civilization":"english","rating":1400,"mmr":1550,"rating_diff":20,"result":"win",
        "modes":{"rm_solo":{"rating":1400,"rank":300,"rank_level":"diamond_1","wins_count":3,"losses_count":1},"qm_1v1":{"wins_count":99}}}],
        [{"profile_id":43,"name":"Opponent","civilization":"french","rating":1450,"result":"loss"}]]
    })).unwrap()
    }
    #[test]
    fn maps_only_matching_queue_and_preserves_snapshot_on_finish() {
        let remote = fixture(true);
        assert!(remote.supported() && remote.includes(42));
        let snapshot = remote.snapshot(42);
        assert_eq!(snapshot.players[0].wins, Some(3));
        assert_eq!(snapshot.players[1].wins, None);
        assert_eq!(snapshot.players[0].mmr, Some(1550));
        assert_eq!(snapshot.players[0].rating_change, None);
        let mut ended = fixture(false);
        ended.teams[0][0].rating = Some(1420);
        let result = ended.record_outcome(&snapshot);
        assert_eq!(result.players[0].rating, Some(1400));
        assert_eq!(result.players[0].rating_change, Some(20));
        assert_eq!(result.players[0].won, Some(true));
    }
    #[test]
    fn rejects_teams_custom_games_and_untrusted_profile_urls() {
        let mut game = fixture(true);
        game.kind = "rm_2v2".into();
        assert!(!game.supported());
        game.kind = "custom".into();
        assert!(!game.supported());
        assert_eq!(
            profile_id("https://aoe4world.com/players/42-player").unwrap(),
            42
        );
        assert!(profile_id("https://example.com/players/42").is_err());
        assert!(profile_id("0").is_err());
        assert!(serde_json::from_value::<RemoteGame>(json!({"error":"unavailable"})).is_err());
    }
}
