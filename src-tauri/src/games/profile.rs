use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileOverview {
    pub profile_id: u64,
    pub name: String,
    pub leaderboards: Vec<ProfileLeaderboard>,
    pub recent_matches: Vec<RecentMatch>,
    pub fetched_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileLeaderboard {
    pub leaderboard_id: String,
    pub rating: Option<u32>,
    pub wins: Option<u32>,
    pub losses: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub draws: Option<u32>,
    pub season: Option<u32>,
    pub rating_history: Vec<RatingPoint>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RatingPoint {
    pub recorded_at: String,
    pub rating: u32,
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
    #[serde(skip_serializing_if = "Option::is_none")]
    pub draw: Option<bool>,
    pub rating_change: Option<i32>,
}
