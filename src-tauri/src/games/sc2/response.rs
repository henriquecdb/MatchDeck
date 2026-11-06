use chrono::{DateTime, Utc};
use serde::Deserialize;
use std::collections::HashMap;

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Character {
    pub id: u64,
    pub name: String,
    pub region: String,
    pub realm: u32,
    pub battlenet_id: u64,
}

impl Character {
    pub fn has_public_name(&self) -> bool {
        !self.name.starts_with("f#") && !self.display_name().trim().is_empty()
    }
    pub fn profile_name(&self) -> String {
        if self.has_public_name() {
            self.display_name().into()
        } else {
            format!("SC2 #{}", self.id)
        }
    }
    pub fn display_name(&self) -> &str {
        self.name
            .rsplit_once('#')
            .map_or(self.name.as_str(), |(name, _)| name)
    }
}

#[derive(Deserialize)]
pub struct CharacterResult {
    pub members: Member,
}

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Member {
    pub character: Character,
    #[serde(default)]
    pub race_games: HashMap<String, u32>,
}

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Team {
    pub rating: Option<u32>,
    pub wins: Option<u32>,
    pub losses: Option<u32>,
    pub ties: Option<u32>,
    pub season: u32,
    pub region: String,
    pub queue_type: u32,
    pub league_type: Option<u32>,
    pub region_rank: Option<u32>,
    pub legacy_uid: String,
    pub members: Vec<Member>,
}

impl Team {
    pub fn race(&self, id: u64) -> Option<&str> {
        let member = self
            .members
            .iter()
            .find(|member| member.character.id == id)?;
        let races: Vec<_> = member
            .race_games
            .iter()
            .filter(|(_, games)| **games > 0)
            .collect();
        (races.len() == 1).then(|| races[0].0.as_str())
    }
    pub fn includes(&self, id: u64) -> bool {
        self.queue_type == 201 && self.members.len() == 1 && self.members[0].character.id == id
    }
}

#[derive(Deserialize)]
pub struct MatchFeed {
    pub result: Vec<RemoteMatch>,
}

#[derive(Deserialize)]
pub struct RemoteMatch {
    #[serde(rename = "match")]
    pub game: MatchInfo,
    pub map: Map,
    pub participants: Vec<Participant>,
}
#[derive(Deserialize)]
pub struct MatchInfo {
    pub id: u64,
    pub date: DateTime<Utc>,
    #[serde(rename = "type")]
    pub kind: String,
}
#[derive(Deserialize)]
pub struct Map {
    pub name: String,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Participant {
    pub participant: ResultInfo,
    pub team: Option<Team>,
    pub team_state: Option<StateInfo>,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResultInfo {
    pub player_character_id: u64,
    pub decision: String,
    pub rating_change: Option<i32>,
}
#[derive(Deserialize)]
pub struct StateInfo {
    pub race: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct History {
    pub static_data: HistoryKey,
    pub history: HistoryData,
}
#[derive(Deserialize)]
pub struct HistoryKey {
    #[serde(rename = "LEGACY_UID")]
    pub legacy_uid: String,
}
#[derive(Deserialize)]
pub struct HistoryData {
    #[serde(rename = "TIMESTAMP")]
    pub timestamp: Vec<i64>,
    #[serde(rename = "RATING")]
    pub rating: Vec<Option<u32>>,
    #[serde(rename = "SEASON")]
    pub season: Vec<Option<u32>>,
}

pub fn race(value: &str) -> Option<&'static str> {
    match value.to_ascii_lowercase().as_str() {
        "terr" | "terran" => Some("TERRAN"),
        "prot" | "protoss" => Some("PROTOSS"),
        "zerg" => Some("ZERG"),
        "rand" | "random" => Some("RANDOM"),
        _ => None,
    }
}
pub fn queue(race: &str) -> String {
    format!("sc2_1v1_{}", race.to_ascii_lowercase())
}
pub fn outcome(value: &str) -> Option<bool> {
    match value.to_ascii_lowercase().as_str() {
        "win" | "victory" => Some(true),
        "loss" | "defeat" => Some(false),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn source_placeholders_are_not_used_as_player_identity() {
        let mut character = Character {
            id: 42,
            name: "Nova#123".into(),
            region: "US".into(),
            realm: 1,
            battlenet_id: 99,
        };
        assert!(character.has_public_name());
        character.name = "f#1".into();
        assert!(!character.has_public_name());
        assert_eq!(character.profile_name(), format!("SC2 #{}", character.id));
        character.name = "".into();
        assert!(!character.has_public_name());
    }
}
