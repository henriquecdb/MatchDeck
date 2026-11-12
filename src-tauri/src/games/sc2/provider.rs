use super::{client::ClientGame, response::*};
use crate::{
    detection::model::Profile,
    games::profile::{ProfileLeaderboard, ProfileOverview, RatingPoint, RecentMatch},
};
use chrono::{DateTime, Utc};
use reqwest::{Client, StatusCode};
use serde::{de::DeserializeOwned, Deserialize};
use std::{
    collections::HashMap,
    sync::Arc,
    time::{Duration, Instant},
};
use tokio::sync::Mutex;

const API: &str = "https://sc2pulse.nephest.com/sc2/api";
const MAX_RESPONSE: usize = 2 * 1024 * 1024;

pub use super::cache::PlayerData;
use super::cache::{CharacterIdentity, PlayerCache};
#[derive(Clone)]
pub struct Sc2Provider {
    remote: Client,
    local: Client,
    cache: Arc<PlayerCache>,
    cooldown: Arc<Mutex<Option<Instant>>>,
    pub(super) replays: Arc<std::sync::Mutex<super::replay::monitor::Index>>,
}

impl Sc2Provider {
    pub fn new() -> Result<Self, String> {
        let user_agent = concat!(
            "MatchDeck/",
            env!("CARGO_PKG_VERSION"),
            " (https://github.com/henriquecdb/MatchDeck)"
        );
        let remote = Client::builder()
            .timeout(Duration::from_secs(5))
            .redirect(reqwest::redirect::Policy::none())
            .user_agent(user_agent)
            .build()
            .map_err(|e| e.to_string())?;
        let local = Client::builder()
            .timeout(Duration::from_secs(1))
            .no_proxy()
            .redirect(reqwest::redirect::Policy::none())
            .user_agent(user_agent)
            .build()
            .map_err(|e| e.to_string())?;
        Ok(Self {
            remote,
            local,
            cache: Arc::new(PlayerCache::default()),
            cooldown: Arc::new(Mutex::new(None)),
            replays: Arc::new(std::sync::Mutex::new(Default::default())),
        })
    }

    pub fn with_cache_directory(mut self, directory: std::path::PathBuf) -> Self {
        self.cache = Arc::new(PlayerCache::open(directory));
        self
    }

    pub async fn identity(&self, id: u64) -> Result<CharacterIdentity, String> {
        if let Some(identity) = self.cache.identity(id) {
            return Ok(identity);
        }
        let data = self.player_data(id, false).await?;
        let identity = CharacterIdentity::from_character(&data.character)
            .ok_or("Identificador local SC2 inválido")?;
        self.cache.remember_character(&data.character);
        Ok(identity)
    }

    async fn get<T: DeserializeOwned>(
        &self,
        path: &str,
        params: &[(&str, String)],
    ) -> Result<T, String> {
        if self
            .cooldown
            .lock()
            .await
            .is_some_and(|until| until > Instant::now())
        {
            return Err("SC2 Pulse ocupado; tente novamente em instantes.".into());
        }
        let response = self
            .remote
            .get(format!("{API}{path}"))
            .query(params)
            .send()
            .await
            .map_err(|_| "Não foi possível conectar ao SC2 Pulse")?;
        if response.status() == StatusCode::TOO_MANY_REQUESTS {
            let delay = retry_delay(
                response
                    .headers()
                    .get(reqwest::header::RETRY_AFTER)
                    .and_then(|value| value.to_str().ok()),
            );
            let now = Instant::now();
            let until = now
                .checked_add(delay)
                .unwrap_or(now + Duration::from_secs(24 * 60 * 60));
            let mut cooldown = self.cooldown.lock().await;
            *cooldown = Some(cooldown.map_or(until, |current| current.max(until)));
        }
        let response = response.error_for_status().map_err(|error| {
            format!(
                "SC2 Pulse: erro HTTP {}",
                error.status().map(|s| s.as_u16()).unwrap_or(0)
            )
        })?;
        bounded_json(response, MAX_RESPONSE).await
    }

    pub async fn local_game(&self) -> Result<Option<ClientGame>, String> {
        let response = match self.local.get("http://127.0.0.1:6119/game").send().await {
            Ok(response) => response,
            Err(error) if error.is_connect() => return Ok(None),
            Err(_) => return Err("Não foi possível consultar o cliente SC2".into()),
        };
        if response.status() != StatusCode::OK {
            return Err("API local do SC2 indisponível".into());
        }
        bounded_json(response, 64 * 1024).await.map(Some)
    }

    pub async fn local_profile(&self, roots: &[std::path::PathBuf]) -> Result<Profile, String> {
        let handle = crate::games::local_profile::sc2(roots)?;
        let url = crate::games::local_profile::sc2_profile_url(&handle)
            .ok_or("Identificador local SC2 inválido")?;
        self.resolve_profile(&url).await
    }

    pub async fn resolve_profile(&self, input: &str) -> Result<Profile, String> {
        let target = parse_profile(input)?;
        let params = match &target {
            ProfileInput::Pulse(id) => vec![("characterId", id.to_string())],
            ProfileInput::BattleNet(handle) => vec![("toonHandle", handle.clone())],
        };
        let mut result: Vec<CharacterResult> = match self.get("/characters", &params).await {
            Ok(result) => result,
            Err(error) => {
                return match target {
                    ProfileInput::Pulse(id) => self.cache.profile(id).ok_or(error),
                    ProfileInput::BattleNet(_) => Err(error),
                }
            }
        };
        if result.len() != 1 {
            return Err("Perfil SC2 não encontrado ou ambíguo".into());
        }
        let character = result.remove(0).members.character;
        let valid = match target {
            ProfileInput::Pulse(id) => character.id == id,
            ProfileInput::BattleNet(handle) => {
                handle
                    == format!(
                        "{}-S2-{}-{}",
                        region_id(&character.region).unwrap_or(0),
                        character.realm,
                        character.battlenet_id
                    )
            }
        };
        if !valid || character.id == 0 {
            return Err("A fonte retornou um perfil diferente do solicitado".into());
        }
        if CharacterIdentity::from_character(&character).is_none() {
            return Err("Identificador local SC2 inválido".into());
        }
        self.cache.remember_character(&character);
        Ok(Profile {
            profile_id: character.id,
            name: character.profile_name(),
        })
    }

    pub async fn player_data(&self, id: u64, refresh: bool) -> Result<PlayerData, String> {
        self.cache
            .load(id, refresh, self.fetch_player_data(id))
            .await
    }

    async fn fetch_player_data(&self, id: u64) -> Result<PlayerData, String> {
        let params = [("characterId", id.to_string())];
        let team_params = [
            ("characterId", id.to_string()),
            ("queue", "LOTV_1V1".into()),
            ("limit", "16".into()),
        ];
        let (mut characters, teams) = tokio::try_join!(
            self.get::<Vec<CharacterResult>>("/characters", &params),
            self.get::<Vec<Team>>("/character-teams", &team_params)
        )?;
        if characters.len() != 1 || characters[0].members.character.id != id {
            return Err("A fonte retornou um perfil diferente do solicitado".into());
        }
        let character = characters.remove(0).members.character;
        if CharacterIdentity::from_character(&character).is_none() {
            return Err("Identificador local SC2 inválido".into());
        }
        Ok(PlayerData {
            teams: latest_teams(teams, &character),
            character,
            fetched_at: Utc::now(),
            stale: false,
        })
    }

    pub async fn opponent(&self, name: &str, region: &str) -> Option<PlayerData> {
        if name.is_empty() || name.chars().count() > 64 || region_id(region).is_none() {
            return None;
        }
        #[derive(Deserialize)]
        struct Id {
            id: u64,
        }
        let ids: Vec<Id> = self
            .get(
                "/characters",
                &[
                    ("field", "id".into()),
                    ("name", name.into()),
                    ("region", region.into()),
                    ("queue", "LOTV_1V1".into()),
                    ("caseSensitive", "true".into()),
                ],
            )
            .await
            .ok()?;
        if ids.len() != 1 {
            return None;
        }
        let data = self.player_data(ids[0].id, false).await.ok()?;
        (data.character.region == region && data.character.display_name() == name).then_some(data)
    }

    pub async fn matches(&self, id: u64) -> Result<Vec<RemoteMatch>, String> {
        let feed: MatchFeed = self
            .get(
                "/character-matches",
                &[
                    ("characterId", id.to_string()),
                    ("type", "_1V1".into()),
                    ("limit", "5".into()),
                ],
            )
            .await?;
        let mut matches: Vec<_> = feed
            .result
            .into_iter()
            .filter(|game| {
                game.game.kind == "_1V1"
                    && game.participants.iter().any(|p| {
                        p.participant.player_character_id == id
                            && p.participant.decision != "OBSERVER"
                    })
            })
            .collect();
        matches.sort_by_key(|game| std::cmp::Reverse(game.game.date));
        let mut seen = std::collections::HashSet::new();
        matches.retain(|game| seen.insert(game.game.id));
        matches.truncate(5);
        Ok(matches)
    }

    async fn history(&self, team: &Team) -> Result<Vec<RatingPoint>, String> {
        let from = (Utc::now() - chrono::Duration::days(90)).to_rfc3339();
        let data: Vec<History> = self
            .get(
                "/team-histories",
                &[
                    ("teamLegacyUid", team.legacy_uid.clone()),
                    ("history", "TIMESTAMP,RATING,SEASON".into()),
                    ("from", from),
                ],
            )
            .await?;
        let Some(history) = data
            .into_iter()
            .find(|history| history.static_data.legacy_uid == team.legacy_uid)
        else {
            return Ok(vec![]);
        };
        Ok(history_points(history.history, team.season))
    }

    pub async fn profile_overview(&self, id: u64) -> Result<ProfileOverview, String> {
        let (data, matches) = tokio::join!(self.player_data(id, true), self.matches(id));
        let data = data?;
        let mut warnings = Vec::new();
        let matches = matches.unwrap_or_else(|_| {
            warnings.push("Histórico indisponível.".into());
            vec![]
        });
        let mut boards = Vec::new();
        let histories =
            futures_util::future::join_all(data.teams.iter().map(|team| self.history(team))).await;
        for (team, history) in data.teams.iter().zip(histories) {
            let Some(race) = team.race(id) else { continue };
            let history = history.unwrap_or_else(|_| {
                if !warnings
                    .iter()
                    .any(|warning| warning == "Gráfico indisponível.")
                {
                    warnings.push("Gráfico indisponível.".into());
                }
                vec![]
            });
            boards.push(ProfileLeaderboard {
                leaderboard_id: queue(race),
                rating: team.rating,
                wins: team.wins,
                losses: team.losses,
                draws: team.ties,
                season: Some(team.season),
                rating_history: history,
            });
        }
        let recent_matches = matches
            .into_iter()
            .map(|game| {
                let player = game
                    .participants
                    .iter()
                    .find(|p| p.participant.player_character_id == id)
                    .unwrap();
                let race = participant_race(player);
                RecentMatch {
                    id: format!("sc2-pulse-{}", game.game.id),
                    started_at: game.game.date.to_rfc3339(),
                    queue_id: race.as_ref().map(|race| queue(race)),
                    map: game.map.name,
                    civilization_id: race.clone(),
                    civilization: race,
                    won: outcome(&player.participant.decision),
                    draw: Some(player.participant.decision == "TIE"),
                    rating_change: player.participant.rating_change,
                }
            })
            .collect();
        Ok(ProfileOverview {
            stats_cache: Some(crate::model::StatsCache {
                fetched_at: data.fetched_at.to_rfc3339(),
                stale: data.stale,
            }),
            warnings,
            profile_id: id,
            name: data.character.profile_name(),
            leaderboards: boards,
            recent_matches,
            fetched_at: Utc::now().to_rfc3339(),
        })
    }
}

fn retry_delay(value: Option<&str>) -> Duration {
    let seconds = value
        .and_then(|value| {
            value.parse::<u64>().ok().or_else(|| {
                DateTime::parse_from_rfc2822(value)
                    .ok()
                    .map(|date| date.signed_duration_since(Utc::now()).num_seconds().max(1) as u64)
            })
        })
        .unwrap_or(30);
    Duration::from_secs(seconds.max(1))
}

async fn bounded_json<T: DeserializeOwned>(
    mut response: reqwest::Response,
    limit: usize,
) -> Result<T, String> {
    let mut bytes = Vec::new();
    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|_| "Resposta SC2 interrompida")?
    {
        if bytes.len() + chunk.len() > limit {
            return Err("Resposta SC2 excedeu o limite permitido".into());
        }
        bytes.extend_from_slice(&chunk);
    }
    serde_json::from_slice(&bytes).map_err(|_| "A fonte SC2 retornou dados incompatíveis".into())
}

pub fn latest_teams(teams: Vec<Team>, character: &Character) -> Vec<Team> {
    let mut by_race = std::collections::BTreeMap::new();
    for team in teams
        .into_iter()
        .filter(|team| team.includes(character.id) && team.region == character.region)
    {
        if let Some(race) = team.race(character.id).map(str::to_owned) {
            if !matches!(race.as_str(), "TERRAN" | "PROTOSS" | "ZERG" | "RANDOM") {
                continue;
            }
            if by_race
                .get(&race)
                .is_none_or(|saved: &Team| team.season > saved.season)
            {
                by_race.insert(race, team);
            }
        }
    }
    by_race.into_values().collect()
}

pub fn participant_race(player: &Participant) -> Option<String> {
    player
        .team_state
        .as_ref()
        .and_then(|state| state.race.as_ref())
        .and_then(|value| race(value))
        .map(str::to_owned)
        .or_else(|| {
            player
                .team
                .as_ref()?
                .race(player.participant.player_character_id)
                .map(str::to_owned)
        })
}

pub fn history_points(history: HistoryData, season: u32) -> Vec<RatingPoint> {
    let mut points = std::collections::BTreeMap::new();
    for ((time, rating), point_season) in history
        .timestamp
        .into_iter()
        .zip(history.rating)
        .zip(history.season)
    {
        if point_season != Some(season) {
            continue;
        }
        if let (Some(time), Some(rating)) = (DateTime::<Utc>::from_timestamp(time, 0), rating) {
            points.insert(time, rating);
        }
    }
    let start = points.len().saturating_sub(30);
    points
        .into_iter()
        .skip(start)
        .map(|(time, rating)| RatingPoint {
            recorded_at: time.to_rfc3339(),
            rating,
        })
        .collect()
}

#[derive(Debug, PartialEq)]
pub enum ProfileInput {
    Pulse(u64),
    BattleNet(String),
}
pub fn parse_profile(input: &str) -> Result<ProfileInput, String> {
    let input = input.trim();
    let invalid = || "Informe o ID do SC2 Pulse ou um link de perfil SC2".to_string();
    if let Ok(id) = input.parse::<u64>() {
        return if id > 0 {
            Ok(ProfileInput::Pulse(id))
        } else {
            Err(invalid())
        };
    }
    let url = reqwest::Url::parse(input).map_err(|_| invalid())?;
    if url.scheme() != "https"
        || !url.username().is_empty()
        || url.password().is_some()
        || url.port().is_some()
    {
        return Err(invalid());
    }
    match url.host_str() {
        Some("sc2pulse.nephest.com" | "www.nephest.com" | "nephest.com")
            if url.path().trim_end_matches('/') == "/sc2" =>
        {
            let params: HashMap<_, _> = url.query_pairs().collect();
            if params.get("type").map(|v| v.as_ref()) != Some("character") {
                return Err(invalid());
            }
            params
                .get("id")
                .and_then(|id| id.parse().ok())
                .filter(|id| *id > 0)
                .map(ProfileInput::Pulse)
                .ok_or_else(invalid)
        }
        Some("starcraft2.blizzard.com" | "starcraft2.com") => {
            let path: Vec<_> = url.path_segments().ok_or_else(invalid)?.collect();
            let index = path
                .iter()
                .position(|segment| *segment == "profile")
                .ok_or_else(invalid)?;
            let parts = path.get(index + 1..index + 4).ok_or_else(invalid)?;
            let region: u32 = parts[0].parse().map_err(|_| invalid())?;
            let realm: u32 = parts[1].parse().map_err(|_| invalid())?;
            let id: u64 = parts[2].parse().map_err(|_| invalid())?;
            if ![1, 2, 3, 5].contains(&region) || !(1..=2).contains(&realm) || id == 0 {
                return Err(invalid());
            }
            Ok(ProfileInput::BattleNet(format!("{region}-S2-{realm}-{id}")))
        }
        _ => Err(invalid()),
    }
}
pub(super) fn region_id(region: &str) -> Option<u32> {
    match region {
        "US" => Some(1),
        "EU" => Some(2),
        "KR" => Some(3),
        "CN" => Some(5),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    fn cached_player() -> PlayerData {
        let character =
            json!({"id":42,"name":"Nova#123","region":"US","realm":1,"battlenetId":900});
        PlayerData {
            character: serde_json::from_value(character.clone()).unwrap(),
            teams: serde_json::from_value(json!([{
                "rating":4200,"wins":10,"losses":5,"ties":1,"season":68,
                "region":"US","queueType":201,"legacyUid":"test",
                "members":[{"character":character,"raceGames":{"TERRAN":16}}]
            }]))
            .unwrap(),
            fetched_at: Utc::now() - chrono::Duration::minutes(2),
            stale: false,
        }
    }

    #[tokio::test]
    async fn a_rate_limited_provider_reuses_valid_statistics_without_retrying_the_network() {
        let provider = Sc2Provider::new().unwrap();
        provider.cache.save(&cached_player());
        *provider.cooldown.lock().await = Some(Instant::now() + Duration::from_secs(120));
        let cached = provider.player_data(42, false).await.unwrap();
        assert!(cached.stale);
        assert_eq!(cached.teams[0].rating, Some(4200));
        assert!(provider.matches(42).await.is_err());
        assert!(provider.player_data(42, true).await.unwrap().stale);
        assert!(provider.player_data(99, false).await.is_err());
    }

    #[tokio::test]
    async fn persisted_identity_survives_expired_statistics_and_offline_restart() {
        let directory = std::env::temp_dir().join(format!(
            "matchdeck-pulse-{}-{}",
            std::process::id(),
            Utc::now().timestamp_nanos_opt().unwrap()
        ));
        let provider = Sc2Provider::new()
            .unwrap()
            .with_cache_directory(directory.clone());
        let mut data = cached_player();
        provider.cache.remember_character(&data.character);
        provider.cache.save(&data);
        let reopened = Sc2Provider::new()
            .unwrap()
            .with_cache_directory(directory.clone());
        *reopened.cooldown.lock().await = Some(Instant::now() + Duration::from_secs(120));
        assert_eq!(reopened.identity(42).await.unwrap().handle(), "1-S2-1-900");
        assert_eq!(reopened.resolve_profile("42").await.unwrap().name, "Nova");
        assert!(reopened.resolve_profile("99").await.is_err());
        let fallback = reopened.player_data(42, false).await.unwrap();
        assert!(fallback.stale);
        assert_eq!(fallback.fetched_at, data.fetched_at);
        let overview = reopened.profile_overview(42).await.unwrap();
        assert_eq!(overview.leaderboards[0].rating, Some(4200));
        assert!(overview.stats_cache.unwrap().stale);
        assert!(overview
            .warnings
            .iter()
            .any(|warning| warning == "Histórico indisponível."));
        data.fetched_at -= chrono::Duration::days(2);
        provider.cache.save(&data);
        let expired = Sc2Provider::new()
            .unwrap()
            .with_cache_directory(directory.clone());
        *expired.cooldown.lock().await = Some(Instant::now() + Duration::from_secs(120));
        assert_eq!(expired.identity(42).await.unwrap().handle(), "1-S2-1-900");
        assert!(expired.player_data(42, false).await.is_err());
        std::fs::remove_file(directory.join("pulse-cache.json")).unwrap();
        std::fs::remove_dir(directory).unwrap();
    }

    #[test]
    fn retry_after_accepts_numeric_and_date_formats_without_shortening_the_server_delay() {
        assert_eq!(retry_delay(Some("600")), Duration::from_secs(600));
        assert_eq!(retry_delay(Some("invalid")), Duration::from_secs(30));
        let date = (Utc::now() + chrono::Duration::minutes(10)).to_rfc2822();
        assert!(retry_delay(Some(&date)) > Duration::from_secs(590));
    }

    #[test]
    fn parses_pulse_and_official_profile_links_without_fetching_user_urls() {
        assert_eq!(parse_profile("42").unwrap(), ProfileInput::Pulse(42));
        assert_eq!(
            parse_profile(
                "https://sc2pulse.nephest.com/sc2/?type=character&id=42&m=1#player-stats-mmr"
            )
            .unwrap(),
            ProfileInput::Pulse(42)
        );
        assert_eq!(
            parse_profile("https://starcraft2.blizzard.com/en-us/profile/1/1/42").unwrap(),
            ProfileInput::BattleNet("1-S2-1-42".into())
        );
        for input in [
            "0",
            "Kadmus#11958",
            "http://sc2pulse.nephest.com/sc2/?type=character&id=42",
            "https://example.com/sc2/?type=character&id=42",
            "https://user:secret@sc2pulse.nephest.com/sc2/?type=character&id=42",
            "https://sc2pulse.nephest.com/sc2/?type=account&id=42",
            "https://starcraft2.blizzard.com/en-us/profile/9/1/42",
        ] {
            assert!(parse_profile(input).is_err(), "{input}");
        }
    }
    #[test]
    fn separates_races_and_seasons_and_filters_unknown_or_unrelated_teams() {
        let character: Character = serde_json::from_value(
            json!({"id":42,"name":"Nova#123","region":"US","realm":1,"battlenetId":900}),
        )
        .unwrap();
        let team = |race: &str, season, region: &str, id, queue_type| {
            serde_json::from_value(json!({
            "rating":1500,"wins":10,"losses":5,"ties":1,"season":season,"region":region,"queueType":queue_type,
            "leagueType":2,"regionRank":12,"legacyUid":"201-0-1-1.900.1","members":[{"character":{"id":id,"name":"Nova#123","region":region,"realm":1,"battlenetId":900},"raceGames":{race:16}}]
        })).unwrap()
        };
        let teams = latest_teams(
            vec![
                team("TERRAN", 67, "US", 42, 201),
                team("TERRAN", 68, "US", 42, 201),
                team("ZERG", 68, "US", 42, 201),
                team("PROTOSS", 68, "EU", 42, 201),
                team("RANDOM", 68, "US", 99, 201),
                team("PROTOSS", 68, "US", 42, 202),
            ],
            &character,
        );
        assert_eq!(teams.len(), 2);
        assert!(teams.iter().all(|team| team.season == 68));
        assert_eq!(teams[0].race(42), Some("TERRAN"));
        assert_eq!(teams[1].race(42), Some("ZERG"));
        assert_eq!(character.display_name(), "Nova");
    }
    #[test]
    fn history_is_bounded_and_does_not_combine_seasons() {
        let data = HistoryData {
            timestamp: (0..40).rev().map(|i| 1700000000 + i).collect(),
            rating: (0..40).rev().map(|i| Some(1000 + i)).collect(),
            season: (0..40)
                .rev()
                .map(|i| Some(if i == 39 { 67 } else { 68 }))
                .collect(),
        };
        let points = history_points(data, 68);
        assert_eq!(points.len(), 30);
        assert_eq!(points.first().unwrap().rating, 1009);
        assert_eq!(points.last().unwrap().rating, 1038);
        assert!(points
            .windows(2)
            .all(|pair| pair[0].recorded_at < pair[1].recorded_at));
    }
    #[tokio::test]
    #[ignore = "requires public SC2 Pulse API"]
    async fn live_api_smoke_test() {
        let id: u64 = std::env::var("MATCHDECK_TEST_SC2_PROFILE")
            .unwrap_or_else(|_| "235030".into())
            .parse()
            .unwrap();
        let provider = Sc2Provider::new().unwrap();
        let profile = provider
            .resolve_profile(&format!(
                "https://sc2pulse.nephest.com/sc2/?type=character&id={id}&m=1#player-stats-mmr"
            ))
            .await
            .unwrap();
        assert_eq!(profile.profile_id, id);
        let overview = provider.profile_overview(id).await.unwrap();
        assert_eq!(overview.profile_id, id);
        assert!(!overview.leaderboards.is_empty());
        assert!(overview.leaderboards.len() <= 4);
        assert!(overview
            .leaderboards
            .iter()
            .all(|board| board.rating_history.len() <= 30));
        assert!(overview.recent_matches.len() <= 5);
        println!(
            "SC2 Pulse validated: {} race modes, {} recent matches, {} rating records",
            overview.leaderboards.len(),
            overview.recent_matches.len(),
            overview
                .leaderboards
                .iter()
                .map(|board| board.rating_history.len())
                .sum::<usize>()
        );
        if !overview.recent_matches.is_empty() {
            let snapshot = super::super::service::latest_snapshot(&provider, id)
                .await
                .unwrap();
            assert_eq!(snapshot.players.len(), 2);
            assert!(snapshot.finished_at.is_some());
            assert!(snapshot
                .players
                .iter()
                .all(|player| player.rating.is_none()));
        }
    }
}
