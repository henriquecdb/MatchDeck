use crate::model::{MatchSnapshot, OverlayLayout};
use std::collections::BTreeMap;

pub fn overlay_size(snapshot: &MatchSnapshot, layout: &OverlayLayout) -> (f64, f64) {
    let duel = snapshot.players.len() == 2
        && !snapshot
            .queue_id
            .as_ref()
            .is_some_and(|queue| queue.ends_with("_team"))
        && !snapshot.players[0]
            .team_id
            .is_some_and(|id| id > 0 && snapshot.players[1].team_id == Some(id));
    let layout = if matches!(layout, OverlayLayout::Detailed) && !duel {
        &OverlayLayout::Stacked
    } else {
        layout
    };
    if matches!(layout, OverlayLayout::Detailed) {
        return (480.0, 136.0 + snapshot.players.len() as f64 * 150.0);
    }
    let counts = if snapshot
        .players
        .iter()
        .all(|player| player.team_id.is_some_and(|id| id > 0))
    {
        let mut teams = BTreeMap::<i32, usize>::new();
        for player in &snapshot.players {
            *teams.entry(player.team_id.unwrap()).or_default() += 1;
        }
        teams.into_values().collect::<Vec<_>>()
    } else if snapshot.players.len() == 2
        && snapshot
            .queue_id
            .as_ref()
            .is_some_and(|queue| queue.ends_with("_1v1"))
    {
        vec![1, 1]
    } else {
        vec![snapshot.players.len()]
    };
    let pairs = counts.chunks(2).collect::<Vec<_>>();
    let heading = if duel { 0 } else { 18 };
    if matches!(layout, OverlayLayout::Stacked) {
        return (
            360.0,
            (60 + counts
                .iter()
                .map(|count| heading + count * 30)
                .sum::<usize>()
                + counts.len().saturating_sub(1) * 4) as f64,
        );
    }
    let height: usize = pairs
        .iter()
        .map(|pair| heading + pair.iter().max().unwrap_or(&0) * 30)
        .sum();
    (
        720.0,
        (60 + height + pairs.len().saturating_sub(1) * 8) as f64,
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn snapshot(team_ids: &[Option<i32>], queue: &str) -> MatchSnapshot {
        serde_json::from_value(json!({
            "id":"test", "gameId":"aoe2-de", "mode":"ranked", "map":"Arena", "source":"demo", "queueId":queue,
            "players":team_ids.iter().enumerate().map(|(index, team)| json!({
                "id":index.to_string(),"name":"Player","civilization":"Franks","uniqueUnits":[],"symbol":"", "teamId":team
            })).collect::<Vec<_>>()
        })).unwrap()
    }

    #[test]
    fn compact_window_tracks_team_rows_instead_of_full_cards() {
        let duel = snapshot(&[None, None], "rm_1v1");
        assert_eq!(overlay_size(&duel, &OverlayLayout::Compact), (720.0, 90.0));
        assert_eq!(overlay_size(&duel, &OverlayLayout::Stacked), (360.0, 124.0));
        assert_eq!(
            overlay_size(&duel, &OverlayLayout::Detailed),
            (480.0, 436.0)
        );
        let teams = snapshot(
            &[
                Some(1),
                Some(2),
                Some(1),
                Some(2),
                Some(1),
                Some(2),
                Some(1),
                Some(2),
            ],
            "rm_team",
        );
        assert_eq!(
            overlay_size(&teams, &OverlayLayout::Compact),
            (720.0, 198.0)
        );
        assert_eq!(
            overlay_size(&teams, &OverlayLayout::Stacked),
            (360.0, 340.0)
        );
        let unknown = snapshot(&[None, None, None, None], "rm_team");
        assert_eq!(
            overlay_size(&unknown, &OverlayLayout::Compact),
            (720.0, 198.0)
        );
        let ffa = snapshot(&[Some(1), Some(2), Some(3), Some(4)], "unranked");
        assert_eq!(overlay_size(&ffa, &OverlayLayout::Compact), (720.0, 164.0));
    }

    #[test]
    fn detailed_preference_only_gets_a_detailed_window_for_duels() {
        for size in [2, 3, 4] {
            let ids = (0..size * 2)
                .map(|index| Some(if index < size { 1 } else { 2 }))
                .collect::<Vec<_>>();
            let teams = snapshot(&ids, "rm_team");
            assert_eq!(
                overlay_size(&teams, &OverlayLayout::Detailed),
                (360.0, (100 + size * 60) as f64)
            );
        }
        let partial_team = snapshot(&[Some(1), Some(2)], "rm_team");
        assert_eq!(
            overlay_size(&partial_team, &OverlayLayout::Detailed),
            (360.0, 160.0)
        );
        let teammates = snapshot(&[Some(1), Some(1)], "rm_team");
        assert_eq!(
            overlay_size(&teammates, &OverlayLayout::Detailed),
            (360.0, 138.0)
        );
        let duel = snapshot(&[Some(1), Some(2)], "rm_1v1");
        assert_eq!(
            overlay_size(&duel, &OverlayLayout::Detailed),
            (480.0, 436.0)
        );
    }
}
