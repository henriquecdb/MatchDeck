use super::response::{Leaderboard, MatchFeed, RemoteProfile};
use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileOverview {
    pub profile_id: u64,
    pub name: String,
    pub leaderboards: Vec<Leaderboard>,
    pub recent_matches: Vec<RecentMatch>,
    pub fetched_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecentMatch {
    pub id: String,
    pub started_at: String,
    pub queue_id: Option<String>,
    pub map: String,
    pub civilization_id: Option<String>,
    pub civilization: Option<String>,
    pub won: Option<bool>,
    pub rating_change: Option<i32>,
}

pub fn overview(profile: RemoteProfile, feed: MatchFeed) -> ProfileOverview {
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
                rating_change: player.rating_diff,
            }
        })
        .collect();
    ProfileOverview {
        profile_id: profile.profile_id,
        name: profile.name,
        leaderboards: profile.leaderboards,
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
}
