use super::provider::{result, RemoteGame, RemoteProfile};
use crate::games::profile::{ProfileLeaderboard, ProfileOverview, RatingPoint, RecentMatch};
use chrono::{DateTime, Utc};
use serde::Deserialize;
use std::collections::{BTreeMap, HashSet};

#[derive(Deserialize)]
pub struct GameFeed {
    pub games: Vec<RemoteGame>,
}

#[derive(Deserialize)]
pub struct ProfileMode {
    pub rating: Option<u32>,
    pub wins_count: Option<u32>,
    pub losses_count: Option<u32>,
    pub season: Option<u32>,
    #[serde(default)]
    pub rating_history: BTreeMap<String, RemoteRating>,
}

#[derive(Deserialize)]
pub struct RemoteRating {
    pub rating: Option<u32>,
}

const MODES: &[&str] = &[
    "rm_solo",
    "rm_team",
    "qm_1v1",
    "qm_2v2",
    "qm_3v3",
    "qm_4v4",
    "rm_1v1_elo",
    "rm_2v2_elo",
    "rm_3v3_elo",
    "rm_4v4_elo",
];

pub fn queue(kind: &str) -> Option<&str> {
    match kind {
        "rm_1v1" => Some("rm_solo"),
        "rm_2v2" | "rm_3v3" | "rm_4v4" => Some("rm_team"),
        "qm_1v1" | "qm_2v2" | "qm_3v3" | "qm_4v4" => Some(kind),
        _ => None,
    }
}

pub fn overview(mut profile: RemoteProfile, feed: GameFeed) -> ProfileOverview {
    let leaderboards = MODES
        .iter()
        .filter_map(|id| {
            let mode = profile.modes.remove(*id)?;
            let mut history: Vec<_> = mode
                .rating_history
                .into_iter()
                .filter_map(|(time, point)| {
                    let date = DateTime::<Utc>::from_timestamp(time.parse().ok()?, 0)?;
                    Some((date, point.rating?))
                })
                .collect();
            history.sort_by_key(|(date, _)| *date);
            let start = history.len().saturating_sub(30);
            Some(ProfileLeaderboard {
                leaderboard_id: (*id).into(),
                rating: mode.rating,
                wins: mode.wins_count,
                losses: mode.losses_count,
                season: mode.season,
                rating_history: history
                    .into_iter()
                    .skip(start)
                    .map(|(date, rating)| RatingPoint {
                        recorded_at: date.to_rfc3339(),
                        rating,
                    })
                    .collect(),
            })
        })
        .collect();
    let mut games: Vec<_> = feed
        .games
        .into_iter()
        .filter(|game| {
            game.includes(profile.profile_id)
                && queue(&game.kind).is_some()
                && !game.ongoing
                && matches!(game.state.as_str(), "finished" | "processed")
        })
        .collect();
    games.sort_by_key(|game| std::cmp::Reverse(game.started_at));
    let mut seen = HashSet::new();
    let recent_matches = games
        .into_iter()
        .filter(|game| seen.insert(game.game_id))
        .take(5)
        .map(|game| {
            let player = game
                .teams
                .iter()
                .flatten()
                .find(|player| player.profile_id == profile.profile_id)
                .unwrap();
            RecentMatch {
                id: game.id(),
                started_at: game.started_at.to_rfc3339(),
                queue_id: queue(&game.kind).map(str::to_owned),
                map: game.map,
                civilization_id: player.civilization.clone(),
                civilization: player.civilization.clone(),
                won: result(player.result.as_deref()),
                rating_change: player.rating_diff,
            }
        })
        .collect();
    ProfileOverview {
        profile_id: profile.profile_id,
        name: profile.name,
        leaderboards,
        recent_matches,
        fetched_at: Utc::now().to_rfc3339(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn keeps_queues_seasons_and_mmr_separate_without_filling_missing_data() {
        let mut history = serde_json::Map::new();
        for day in 0..40 {
            history.insert(
                (1700000000_i64 + day * 86400).to_string(),
                json!({"rating":1200 + day}),
            );
        }
        history.insert("invalid".into(), json!({"rating":9999}));
        history.insert("1700000001".into(), json!({}));
        let profile = serde_json::from_value(json!({"profile_id":42,"name":"Player","modes":{
            "rm_solo":{"rating":1400,"wins_count":10,"losses_count":5,"season":14,"rating_history":history},
            "rm_1v1":{"rating":9999},
            "rm_1v1_elo":{"rating":1600},
            "qm_1v1":{"wins_count":0,"losses_count":null},
            "rm_solo_console":{"rating":7777}
        }})).unwrap();
        let overview = overview(profile, GameFeed { games: vec![] });
        assert_eq!(overview.leaderboards.len(), 3);
        let ranked = &overview.leaderboards[0];
        assert_eq!(ranked.rating, Some(1400));
        assert_eq!(ranked.season, Some(14));
        assert_eq!(ranked.rating_history.len(), 30);
        assert_eq!(ranked.rating_history.first().unwrap().rating, 1210);
        assert_eq!(ranked.rating_history.last().unwrap().rating, 1239);
        assert_eq!(overview.leaderboards[1].rating, None);
        assert_eq!(overview.leaderboards[1].wins, Some(0));
        assert_eq!(overview.leaderboards[1].losses, None);
        assert_eq!(overview.leaderboards[2].rating, Some(1600));
    }

    #[test]
    fn maps_wrapped_players_and_excludes_unfinished_custom_and_unrelated_games() {
        let mut games: Vec<_> = (1..=12).map(|id| json!({
            "game_id":id,"started_at":format!("2026-11-04T10:{id:02}:00Z"),
            "ongoing":id == 12,"state":if id == 11 {"discarded"} else {"processed"},
            "kind":if id == 10 {"custom"} else if id == 7 {"rm_2v2"} else {"qm_1v1"},"map":"Dry Arabia",
            "teams":[[{"player":{"profile_id":if id == 9 {99} else {42},"name":"Player","civilization":"english",
                "result":if id == 8 {json!(null)} else {json!("win")},"rating_diff":if id == 8 {json!(null)} else {json!(12)}}}],
                [{"player":{"profile_id":43,"name":"Other"}}]]
        })).collect();
        games.push(games[6].clone());
        let profile = serde_json::from_value(json!({"profile_id":42,"name":"Player"})).unwrap();
        let feed = serde_json::from_value(json!({"games":games})).unwrap();
        let overview = overview(profile, feed);
        assert_eq!(
            overview
                .recent_matches
                .iter()
                .map(|game| game.id.as_str())
                .collect::<Vec<_>>(),
            vec!["aoe4-8", "aoe4-7", "aoe4-6", "aoe4-5", "aoe4-4"]
        );
        assert_eq!(overview.recent_matches[0].won, None);
        assert_eq!(overview.recent_matches[0].rating_change, None);
        assert_eq!(
            overview.recent_matches[1].queue_id.as_deref(),
            Some("rm_team")
        );
        assert_eq!(overview.recent_matches[1].won, Some(true));
        assert_eq!(
            overview.recent_matches[1].civilization_id.as_deref(),
            Some("english")
        );
    }

    #[tokio::test]
    #[ignore = "requires public AoE4 World APIs"]
    async fn live_profile_overview_smoke_test() {
        let provider = super::super::provider::Aoe4Provider::new().unwrap();
        let overview = provider.profile_overview(4635035).await.unwrap();
        assert_eq!(overview.profile_id, 4635035);
        assert!(!overview.leaderboards.is_empty());
        assert!(!overview.recent_matches.is_empty());
        assert!(overview.recent_matches.len() <= 5);
        assert!(overview
            .leaderboards
            .iter()
            .any(|board| !board.rating_history.is_empty()));
    }
}
