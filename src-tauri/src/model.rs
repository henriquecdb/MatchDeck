use serde::{Deserialize, Serialize};

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OverlaySettings {
    pub opacity: f64,
    pub x: i32,
    pub y: i32,
    pub locked: bool,
    #[serde(default)]
    pub layout: OverlayLayout,
    #[serde(default)]
    pub auto_update: bool,
    #[serde(default = "default_scale")]
    pub scale: f64,
    #[serde(default = "enabled")]
    pub focus_only: bool,
    #[serde(default = "enabled")]
    pub show_projection: bool,
    #[serde(default)]
    pub monitor_id: Option<String>,
    #[serde(default)]
    pub anchor: Anchor,
    #[serde(default = "default_margin")]
    pub margin: u32,
    #[serde(default = "enabled")]
    pub show_rating: bool,
    #[serde(default = "enabled")]
    pub show_record: bool,
    #[serde(default = "enabled")]
    pub show_win_rate: bool,
    #[serde(default = "enabled")]
    pub highlight_self: bool,
    #[serde(default = "enabled")]
    pub show_session: bool,
    #[serde(default = "default_post_game_seconds")]
    pub post_game_seconds: u32,
}

fn default_post_game_seconds() -> u32 {
    8
}

fn default_scale() -> f64 {
    1.0
}
fn default_margin() -> u32 {
    16
}
fn enabled() -> bool {
    true
}

#[derive(Clone, Default, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "kebab-case")]
pub enum Anchor {
    #[default]
    Manual,
    TopLeft,
    TopCenter,
    TopRight,
    CenterLeft,
    Center,
    CenterRight,
    BottomLeft,
    BottomCenter,
    BottomRight,
}

#[derive(Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum OverlayLayout {
    #[default]
    Detailed,
    Compact,
    Stacked,
}

impl Default for OverlaySettings {
    fn default() -> Self {
        Self {
            opacity: 0.9,
            x: 40,
            y: 80,
            locked: false,
            layout: OverlayLayout::Detailed,
            auto_update: false,
            scale: 1.0,
            focus_only: true,
            show_projection: true,
            monitor_id: None,
            anchor: Anchor::Manual,
            margin: 16,
            show_rating: true,
            show_record: true,
            show_win_rate: true,
            highlight_self: true,
            show_session: true,
            post_game_seconds: 8,
        }
    }
}

impl OverlaySettings {
    pub fn normalize(mut self) -> Self {
        self.opacity = if self.opacity.is_finite() {
            self.opacity.clamp(0.2, 1.0)
        } else {
            0.9
        };
        self.x = self.x.clamp(-32000, 32000);
        self.y = self.y.clamp(-32000, 32000);
        self.scale = if self.scale.is_finite() {
            self.scale.clamp(0.5, 1.5)
        } else {
            1.0
        };
        self.margin = self.margin.min(200);
        self.post_game_seconds = self.post_game_seconds.min(30);
        self
    }
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum MatchMode {
    Ranked,
    Quick,
    Skirmish,
    Custom,
    Unknown,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum MatchSource {
    Demo,
    Live,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StatsCache {
    pub fetched_at: String,
    pub stale: bool,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Player {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub stats_cache: Option<StatsCache>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub identity_hint: Option<String>,
    #[serde(default)]
    pub rank: Option<u32>,
    #[serde(default)]
    pub rank_level: Option<String>,
    #[serde(default)]
    pub mmr: Option<u32>,
    pub id: String,
    pub name: String,
    pub civilization: String,
    pub unique_units: Vec<String>,
    pub symbol: String,
    #[serde(default)]
    pub civilization_id: Option<String>,
    #[serde(default)]
    pub color: Option<u8>,
    #[serde(default)]
    pub color_hex: Option<String>,
    pub rating: Option<u32>,
    pub wins: Option<u32>,
    pub losses: Option<u32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub draws: Option<u32>,
    #[serde(default)]
    pub rating_change: Option<i32>,
    #[serde(default)]
    pub team_id: Option<i32>,
    #[serde(default)]
    pub won: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub draw: Option<bool>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MatchSnapshot {
    #[serde(default)]
    pub duration_seconds: Option<u64>,
    pub id: String,
    pub game_id: String,
    pub mode: MatchMode,
    pub map: String,
    pub source: MatchSource,
    pub players: Vec<Player>,
    #[serde(default)]
    pub queue: Option<String>,
    #[serde(default)]
    pub queue_id: Option<String>,
    #[serde(default)]
    pub warnings: Vec<String>,
    #[serde(default)]
    pub synced_at: Option<String>,
    #[serde(default)]
    pub replay_of: Option<String>,
    #[serde(default)]
    pub finished_at: Option<String>,
    #[serde(default)]
    pub self_player_id: Option<String>,
}

impl MatchSnapshot {
    pub fn belongs_to(&self, config: &crate::detection::model::DetectionConfig) -> bool {
        let Some(profile) = &config.profile else {
            return false;
        };
        let id = profile.profile_id.to_string();
        self.game_id == config.game_id
            && self
                .self_player_id
                .as_ref()
                .is_none_or(|owner| owner == &id)
            && self.players.iter().any(|player| player.id == id)
    }

    pub fn as_demo(&self) -> Self {
        let mut replay = self.clone();
        replay.id = format!("demo-{}", self.id);
        replay.source = MatchSource::Demo;
        replay.replay_of = Some(self.id.clone());
        replay
    }
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PostGame {
    pub game: MatchSnapshot,
    pub expires_at: chrono::DateTime<chrono::Utc>,
    pub opponent_id: Option<String>,
}

#[derive(Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppState {
    #[serde(rename = "match")]
    pub current_match: Option<MatchSnapshot>,
    pub post_game: Option<PostGame>,
    #[serde(skip)]
    pub observed_sc2_match_id: Option<String>,
    #[serde(skip)]
    pub observed_age_match_id: Option<String>,
    pub settings: OverlaySettings,
    pub detection: crate::detection::model::DetectionStatus,
    pub shortcut_available: bool,
    pub last_synced: Option<MatchSnapshot>,
    pub visibility_shortcut_available: bool,
    pub hidden_match_id: Option<String>,
    pub preferences: crate::preferences::AppPreferences,
    pub autostart: bool,
    pub tray_available: bool,
    pub close_requested: bool,
    pub startup_ms: Option<u64>,
    pub app_error: Option<String>,
    pub events: Vec<crate::diagnostics::DiagnosticEvent>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn old_settings_gain_safe_defaults_and_new_values_are_normalized() {
        let settings: OverlaySettings =
            serde_json::from_value(json!({"opacity":0.8,"x":-500,"y":80,"locked":true})).unwrap();
        assert_eq!(settings.scale, 1.0);
        assert!(settings.focus_only && settings.show_projection);
        assert!(settings.show_session);
        assert_eq!(settings.post_game_seconds, 8);
        assert!(settings.monitor_id.is_none());
        assert!(settings.anchor == Anchor::Manual);
        let settings = OverlaySettings {
            scale: 9.0,
            margin: 999,
            ..settings
        }
        .normalize();
        assert_eq!(settings.scale, 1.5);
        assert_eq!(settings.margin, 200);
        assert_eq!(
            OverlaySettings {
                post_game_seconds: 100,
                ..Default::default()
            }
            .normalize()
            .post_game_seconds,
            30
        );
    }

    #[test]
    fn cached_snapshot_round_trips_and_replays_without_changing_live_data() {
        let value = json!({
            "id": "aoe2-10", "gameId": "aoe2-de", "mode": "quick", "map": "Arena", "source": "live",
            "syncedAt": "2026-10-31T02:00:00Z",
            "players": [{"id": "42", "name": "Player", "civilization": "Persians", "civilizationId": "persians",
                "uniqueUnits": ["War Elephant"], "symbol": "", "color": 2, "colorHex": "#FF0000",
                "rating": 1200, "wins": 30, "losses": 20}]
        });
        let original: MatchSnapshot = serde_json::from_value(value).unwrap();
        for game_id in ["aoe2-de", "aoe4", "sc2"] {
            let mut snapshot = original.clone();
            snapshot.game_id = game_id.into();
            let config = crate::detection::model::DetectionConfig {
                game_id: game_id.into(),
                enabled: false,
                profile: Some(crate::detection::model::Profile {
                    profile_id: 42,
                    name: "Player".into(),
                }),
            };
            assert!(snapshot.belongs_to(&config));
            snapshot.self_player_id = Some("99".into());
            assert!(!snapshot.belongs_to(&config));
            snapshot.self_player_id = Some("42".into());
            assert!(snapshot.belongs_to(&config));
            snapshot.players[0].id = "99".into();
            assert!(!snapshot.belongs_to(&config));
            snapshot.game_id = "other".into();
            assert!(!snapshot.belongs_to(&config));
        }
        let restored: MatchSnapshot =
            serde_json::from_slice(&serde_json::to_vec(&original).unwrap()).unwrap();
        let mut replay = restored.as_demo();
        assert!(matches!(replay.source, MatchSource::Demo));
        assert_eq!(replay.replay_of.as_deref(), Some("aoe2-10"));
        assert_eq!(replay.players[0].color_hex.as_deref(), Some("#FF0000"));
        assert_eq!(replay.synced_at, original.synced_at);
        assert!(matches!(replay.mode, MatchMode::Quick));
        replay.players[0].rating = Some(9999);
        assert_eq!(original.players[0].rating, Some(1200));
        assert!(matches!(original.source, MatchSource::Live));
    }
}
