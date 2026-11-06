use super::response::{MatchFeed, RemoteProfile};
pub use crate::games::profile::ProfileOverview;
use crate::games::profile::{ProfileLeaderboard, RatingPoint, RecentMatch};

fn supports_rating_history(queue: &str) -> bool {
    matches!(
        queue,
        "rm_1v1" | "ew_1v1" | "dm_1v1" | "qp_rm_1v1" | "qp_ew_1v1" | "qp_dm_1v1"
    )
}

fn rating_histories(
    profile: &mut RemoteProfile,
) -> std::collections::HashMap<String, Vec<RatingPoint>> {
    std::mem::take(&mut profile.ratings)
        .into_iter()
        .filter(|board| supports_rating_history(&board.leaderboard_id))
        .map(|board| {
            let points: std::collections::BTreeMap<_, _> = board
                .ratings
                .into_iter()
                .filter(|point| point.profile_id.is_none_or(|id| id == profile.profile_id))
                .filter_map(|point| {
                    let date = chrono::DateTime::parse_from_rfc3339(point.date.as_deref()?)
                        .ok()?
                        .with_timezone(&chrono::Utc);
                    Some((date, point.rating?))
                })
                .collect();
            let start = points.len().saturating_sub(30);
            let points = points
                .into_iter()
                .skip(start)
                .map(|(date, rating)| RatingPoint {
                    recorded_at: date.to_rfc3339(),
                    rating,
                })
                .collect();
            (board.leaderboard_id, points)
        })
        .collect()
}

pub fn overview(mut profile: RemoteProfile, feed: MatchFeed) -> ProfileOverview {
    let mut histories = rating_histories(&mut profile);
    let mut matches: Vec<_> = feed
        .matches
        .into_iter()
        .filter(|game| game.includes(profile.profile_id) && game.supported() && game.is_finished())
        .collect();
    matches.sort_by_key(|game| std::cmp::Reverse(game.started));
    let mut seen = std::collections::HashSet::new();
    matches.retain(|game| seen.insert(game.match_id));
    let recent_matches = matches
        .into_iter()
        .take(5)
        .map(|game| {
            let player = game
                .teams
                .iter()
                .flat_map(|team| &team.players)
                .find(|player| player.human_profile_id() == Some(profile.profile_id))
                .unwrap();
            RecentMatch {
                id: game.match_id.to_string(),
                started_at: game.started.to_rfc3339(),
                queue_id: game.leaderboard,
                map: game.map_name.unwrap_or_else(|| "Mapa indisponível".into()),
                civilization_id: player.civ.clone(),
                civilization: player.civ_name.clone(),
                won: player.won,
                draw: None,
                rating_change: player.rating_diff,
            }
        })
        .collect();
    ProfileOverview {
        profile_id: profile.profile_id,
        name: profile.name,
        leaderboards: profile
            .leaderboards
            .into_iter()
            .map(|board| ProfileLeaderboard {
                rating_history: histories.remove(&board.leaderboard_id).unwrap_or_default(),
                leaderboard_id: board.leaderboard_id,
                rating: board.rating,
                wins: board.wins,
                losses: board.losses,
                draws: None,
                season: None,
            })
            .collect(),
        recent_matches,
        fetched_at: super::provider::now().to_rfc3339(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn history_excludes_ongoing_other_profiles_and_campaigns_and_keeps_unknown_results() {
        let games: Vec<_> = (1..=10)
            .map(|id| {
                json!({
                    "matchId":id,"started":format!("2026-11-03T10:{id:02}:00Z"),
                    "finished":if id == 10 {json!(null)} else {json!("2026-11-03T11:00:00Z")},
                    "gameMode":if id == 9 {"campaign"} else {"random_map"},
                    "leaderboard":"qp_rm_1v1","mapName":"Arabia",
                    "teams":[{"players":[{"profileId":if id == 8 {99} else {42},"name":"Player",
                        "won":if id == 7 {json!(null)} else {json!(false)},"ratingDiff":null}]}]
                })
            })
            .collect();
        let profile =
            serde_json::from_value(json!({"profileId":42,"name":"Player","leaderboards":[
                {"leaderboardId":"qp_rm_1v1","rating":1100,"wins":null,"losses":0}
            ]}))
            .unwrap();
        let result = overview(
            profile,
            serde_json::from_value(json!({"matches":games})).unwrap(),
        );
        assert_eq!(
            result
                .recent_matches
                .iter()
                .map(|game| game.id.as_str())
                .collect::<Vec<_>>(),
            vec!["7", "6", "5", "4", "3"]
        );
        assert_eq!(result.recent_matches[0].won, None);
        assert_eq!(result.recent_matches[1].won, Some(false));
        assert_eq!(result.leaderboards[0].wins, None);
        assert_eq!(result.leaderboards[0].losses, Some(0));
    }

    #[test]
    fn rating_history_separates_quick_and_ranked_and_excludes_teams_and_unranked() {
        let ranked: Vec<_> = (0..40)
            .rev()
            .map(|i| {
                json!({
                    "profileId":42,"date":format!("2026-11-04T10:{i:02}:00Z"),"rating":1400+i
                })
            })
            .collect();
        let profile = serde_json::from_value(json!({"profileId":42,"name":"Player",
            "leaderboards":[
                {"leaderboardId":"rm_1v1"},{"leaderboardId":"qp_rm_1v1"},
                {"leaderboardId":"rm_team"},{"leaderboardId":"qp_rm_team"},
                {"leaderboardId":"unranked"},{"leaderboardId":"ew_1v1"}
            ],"ratings":[
                {"leaderboardId":"rm_1v1","ratings":ranked},
                {"leaderboardId":"qp_rm_1v1","ratings":[
                    {"profileId":42,"date":"2026-11-04T10:00:00Z","rating":1100},
                    {"profileId":42,"date":"2026-11-04T10:00:00Z","rating":1100},
                    {"profileId":99,"date":"2026-11-04T11:00:00Z","rating":9999},
                    {"date":"invalid","rating":9000},{"date":"2026-11-04T12:00:00Z"}
                ]},
                {"leaderboardId":"rm_team","ratings":[{"date":"2026-11-04T10:00:00Z","rating":9999}]},
                {"leaderboardId":"unranked","ratings":[{"date":"2026-11-04T10:00:00Z","rating":8888}]}
            ]
        })).unwrap();
        let result = overview(
            profile,
            serde_json::from_value(json!({"matches":[]})).unwrap(),
        );
        assert_eq!(result.leaderboards[0].rating_history.len(), 30);
        assert_eq!(
            result.leaderboards[0]
                .rating_history
                .first()
                .unwrap()
                .rating,
            1410
        );
        assert_eq!(
            result.leaderboards[0].rating_history.last().unwrap().rating,
            1439
        );
        assert_eq!(result.leaderboards[1].rating_history.len(), 1);
        assert_eq!(result.leaderboards[1].rating_history[0].rating, 1100);
        assert!(result.leaderboards[2..]
            .iter()
            .all(|board| board.rating_history.is_empty()));
        assert_eq!(result.leaderboards[1].rating, None);
    }

    #[tokio::test]
    #[ignore = "requires public AoE2 Companion APIs"]
    async fn live_rating_history_smoke_test() {
        let provider = super::super::provider::Aoe2Provider::new().unwrap();
        let overview = provider.profile_overview(196240).await.unwrap();
        assert_eq!(overview.profile_id, 196240);
        let ranked = overview
            .leaderboards
            .iter()
            .find(|board| board.leaderboard_id == "rm_1v1")
            .unwrap();
        assert!(!ranked.rating_history.is_empty());
        assert!(ranked.rating_history.len() <= 30);
        assert!(ranked
            .rating_history
            .windows(2)
            .all(|pair| pair[0].recorded_at < pair[1].recorded_at));
    }
}
