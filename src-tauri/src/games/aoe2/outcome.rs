use super::{provider::now, response::RemoteMatch};
use crate::model::MatchSnapshot;

pub fn record_outcome(snapshot: &MatchSnapshot, remote: &RemoteMatch) -> MatchSnapshot {
    let mut result = snapshot.clone();
    if snapshot.id != format!("aoe2-{}", remote.match_id) || !remote.is_finished() {
        return result;
    }
    result.finished_at = Some(
        remote
            .finished
            .as_str()
            .or_else(|| {
                remote
                    .abandoned
                    .as_ref()
                    .and_then(serde_json::Value::as_str)
            })
            .map(str::to_owned)
            .unwrap_or_else(|| now().to_rfc3339()),
    );
    result.synced_at = Some(now().to_rfc3339());
    for player in &mut result.players {
        let outcome = remote
            .teams
            .iter()
            .flat_map(|team| &team.players)
            .find(|remote_player| {
                remote_player
                    .human_profile_id()
                    .map(|id| id.to_string())
                    .as_deref()
                    == Some(player.id.as_str())
            });
        player.won = outcome.and_then(|remote_player| remote_player.won);
        player.rating_change = outcome.and_then(|remote_player| remote_player.rating_diff);
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn records_confirmed_changes_without_replacing_the_starting_rating() {
        let remote: RemoteMatch = serde_json::from_value(json!({
            "matchId": 10, "started": "2026-10-31T02:00:00Z", "finished": "2026-10-31T02:30:00Z",
            "teams": [{"players": [{"profileId":42,"name":"Player","ratingDiff":-41,"won":false}]}]
        }))
        .unwrap();
        let snapshot: MatchSnapshot = serde_json::from_value(json!({
            "id":"aoe2-10","gameId":"aoe2-de","mode":"quick","map":"Arena","source":"live",
            "players":[{"id":"42","name":"Player","civilization":"Persians","uniqueUnits":[],"symbol":"","rating":1164,"wins":3,"losses":0}]
        })).unwrap();
        let result = record_outcome(&snapshot, &remote);
        assert_eq!(result.players[0].rating, Some(1164));
        assert_eq!(result.players[0].rating_change, Some(-41));
        assert!(result.finished_at.is_some());
        assert_eq!(result.players[0].won, Some(false));
        assert!(snapshot.players[0].rating_change.is_none());
    }
}
