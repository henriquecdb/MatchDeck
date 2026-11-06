use serde::Deserialize;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClientGame {
    pub is_replay: bool,
    pub display_time: f64,
    pub players: Vec<ClientPlayer>,
}
#[derive(Deserialize)]
pub struct ClientPlayer {
    pub id: u32,
    pub name: String,
    pub race: String,
    #[serde(rename = "type")]
    pub kind: String,
    pub result: String,
}
impl ClientGame {
    pub fn supported(&self) -> bool {
        !self.is_replay
            && self.display_time.is_finite()
            && self.display_time >= 0.0
            && self.players.len() == 2
            && self
                .players
                .iter()
                .all(|player| player.kind.eq_ignore_ascii_case("user"))
            && self.players[0].id != self.players[1].id
    }
    pub fn active(&self) -> bool {
        self.supported()
            && self
                .players
                .iter()
                .all(|player| player.result.eq_ignore_ascii_case("undecided"))
    }
    pub fn terminal(&self, empty_checks: u32) -> bool {
        self.is_replay
            || (!self.players.is_empty() && !self.supported())
            || (self.supported()
                && self.players.iter().any(|player| {
                    super::response::outcome(&player.result).is_some()
                        || player.result.eq_ignore_ascii_case("tie")
                        || player.result.eq_ignore_ascii_case("draw")
                }))
            || empty_checks >= 2
    }
    pub fn player_index(&self, name: &str) -> Option<usize> {
        let mut matches = self
            .players
            .iter()
            .enumerate()
            .filter(|(_, player)| player.name == name);
        let index = matches.next()?.0;
        matches.next().is_none().then_some(index)
    }
    pub fn fingerprint(&self) -> Vec<(u32, String)> {
        let mut players: Vec<_> = self
            .players
            .iter()
            .map(|player| (player.id, player.name.clone()))
            .collect();
        players.sort();
        players
    }
}
#[derive(Default)]
pub struct Session {
    pub fingerprint: Vec<(u32, String)>,
    pub elapsed: f64,
    pub profile_id: u64,
    pub empty_checks: u32,
}
impl Session {
    pub fn changed(&self, game: &ClientGame, profile_id: u64) -> bool {
        self.profile_id != profile_id
            || self.fingerprint != game.fingerprint()
            || game.display_time < self.elapsed
    }
    pub fn observe(&mut self, game: &ClientGame, profile_id: u64) {
        self.profile_id = profile_id;
        self.fingerprint = game.fingerprint();
        self.elapsed = game.display_time;
        self.empty_checks = if game.players.is_empty() {
            self.empty_checks.saturating_add(1)
        } else {
            0
        };
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    fn game(time: f64) -> ClientGame {
        serde_json::from_value(json!({"isReplay":false,"displayTime":time,"players":[
            {"id":1,"name":"Nova","race":"Terr","type":"user","result":"Undecided"},
            {"id":2,"name":"Orion","race":"Zerg","type":"user","result":"Undecided"}
        ]}))
        .unwrap()
    }
    #[test]
    fn only_accepts_two_human_players_and_never_replays_or_ai() {
        let mut g = game(10.0);
        assert!(g.active());
        assert_eq!(g.player_index("Nova"), Some(0));
        assert_eq!(g.player_index("Missing"), None);
        g.is_replay = true;
        assert!(!g.supported());
        g.is_replay = false;
        g.players[1].kind = "computer".into();
        assert!(!g.supported());
        g.players[1].kind = "user".into();
        g.players[1].result = "Victory".into();
        assert!(!g.active());
        assert!(g.supported());
        assert!(g.terminal(0));
        g.players.remove(1);
        assert!(!g.supported());
        assert!(serde_json::from_value::<ClientGame>(json!({"error":"unavailable"})).is_err());
    }
    #[test]
    fn keeps_the_same_session_and_detects_consecutive_games_with_the_same_names() {
        let mut session = Session::default();
        let mut g = game(100.0);
        assert!(session.changed(&g, 42));
        session.observe(&g, 42);
        g.display_time = 101.0;
        assert!(!session.changed(&g, 42));
        g.players[0].race = "Terran".into();
        assert!(!session.changed(&g, 42));
        g.players.reverse();
        assert!(!session.changed(&g, 42));
        g.display_time = 0.0;
        assert!(session.changed(&g, 42));
        session.observe(&g, 42);
        assert!(session.changed(&g, 43));
        g.players.clear();
        session.observe(&g, 42);
        assert_eq!(session.empty_checks, 1);
        session.observe(&g, 42);
        assert_eq!(session.empty_checks, 2);
    }
}
