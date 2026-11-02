use chrono::{DateTime, Utc};
use serde::Deserialize;

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MatchFeed {
    pub matches: Vec<RemoteMatch>,
}

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteMatch {
    pub match_id: u64,
    pub started: DateTime<Utc>,
    pub finished: serde_json::Value,
    pub abandoned: Option<serde_json::Value>,
    pub leaderboard: Option<String>,
    pub leaderboard_name: Option<String>,
    pub game_mode: Option<String>,
    pub map_name: Option<String>,
    pub teams: Vec<RemoteTeam>,
}

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteTeam {
    pub players: Vec<RemotePlayer>,
    pub team_id: Option<i32>,
}

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemotePlayer {
    pub profile_id: Option<i64>,
    pub name: String,
    pub civ: Option<String>,
    pub civ_name: Option<String>,
    pub rating: Option<u32>,
    pub color: Option<u8>,
    pub color_hex: Option<String>,
    pub rating_diff: Option<i32>,
}

impl RemoteMatch {
    pub fn includes(&self, profile_id: u64) -> bool {
        self.teams
            .iter()
            .flat_map(|team| &team.players)
            .any(|player| player.human_profile_id() == Some(profile_id))
    }

    pub fn is_finished(&self) -> bool {
        !self.finished.is_null()
            || self
                .abandoned
                .as_ref()
                .is_some_and(|value| !value.is_null() && value != false)
    }

    pub fn supported(&self) -> bool {
        matches!(
            self.game_mode.as_deref(),
            Some(
                "random_map"
                    | "death_match"
                    | "empire_wars"
                    | "regicide"
                    | "king_of_the_hill"
                    | "sudden_death"
                    | "battle_royale"
            )
        )
    }
}

impl RemotePlayer {
    pub fn human_profile_id(&self) -> Option<u64> {
        self.profile_id.filter(|id| *id > 0).map(|id| id as u64)
    }
}

pub fn ongoing(feed: &MatchFeed, profile_id: u64, now: DateTime<Utc>) -> Option<&RemoteMatch> {
    feed.matches
        .iter()
        .filter(|candidate| {
            let age = now.signed_duration_since(candidate.started).num_seconds();
            candidate.includes(profile_id) && candidate.supported() && (-120..=43200).contains(&age)
        })
        .max_by_key(|candidate| candidate.started)
        .filter(|candidate| !candidate.is_finished())
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteProfile {
    pub profile_id: u64,
    pub name: String,
    #[serde(default)]
    pub leaderboards: Vec<Leaderboard>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Leaderboard {
    pub leaderboard_id: String,
    pub rating: Option<u32>,
    pub wins: Option<u32>,
    pub losses: Option<u32>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    pub fn fixture(finished: serde_json::Value) -> RemoteMatch {
        serde_json::from_value(json!({
            "matchId": 10, "started": "2026-10-31T02:00:00Z", "finished": finished,
            "leaderboard": "rm_1v1", "gameMode": "random_map", "mapName": "Arabia",
            "teams": [{"players": [{"profileId": 42, "name": "Player", "civ": "franks", "civName": "Franks", "rating": 1200}]}]
        })).unwrap()
    }

    #[test]
    fn history_is_not_an_ongoing_match() {
        let feed = MatchFeed {
            matches: vec![fixture(json!("2026-10-31T02:10:00Z"))],
        };
        assert!(ongoing(&feed, 42, "2026-10-31T02:20:00Z".parse().unwrap()).is_none());
    }

    #[test]
    fn selects_only_fresh_supported_matches_for_the_target_profile() {
        let feed = MatchFeed {
            matches: vec![fixture(json!(null))],
        };
        let now = "2026-10-31T02:20:00Z".parse().unwrap();
        assert_eq!(ongoing(&feed, 42, now).unwrap().match_id, 10);
        assert!(ongoing(&feed, 999, now).is_none());
        assert!(ongoing(&feed, 42, "2026-11-01T02:20:00Z".parse().unwrap()).is_none());
        let mut campaign = fixture(json!(null));
        campaign.game_mode = Some("campaign".into());
        assert!(ongoing(
            &MatchFeed {
                matches: vec![campaign]
            },
            42,
            now
        )
        .is_none());
    }

    #[test]
    fn malformed_feed_is_an_error_instead_of_an_empty_match_list() {
        assert!(serde_json::from_value::<MatchFeed>(json!({"error":"unavailable"})).is_err());
        let mut value =
            serde_json::to_value(json!({"matchId": 10, "started": "invalid", "teams": []}))
                .unwrap();
        value["finished"] = json!(null);
        assert!(serde_json::from_value::<RemoteMatch>(value).is_err());
    }

    #[test]
    fn historical_ai_with_negative_id_does_not_break_the_feed() {
        let mut current = fixture(json!(null));
        current.teams[0].players.push(
            serde_json::from_value(json!({
                "profileId": -1, "name": "AI", "civ": "vikings", "rating": null
            }))
            .unwrap(),
        );
        let feed = MatchFeed {
            matches: vec![current],
        };
        let time = "2026-10-31T02:20:00Z".parse().unwrap();
        assert!(ongoing(&feed, 42, time).is_some());
        assert_eq!(feed.matches[0].teams[0].players[1].human_profile_id(), None);
        assert_eq!(
            feed.matches[0].teams[0].players[0].human_profile_id(),
            Some(42)
        );
    }
}
