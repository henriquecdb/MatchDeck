use super::{
    client::{ClientGame, ClientPlayer, Session},
    provider::{participant_race, PlayerData, Sc2Provider},
    response::{outcome, race, RemoteMatch},
};
use crate::{
    commands::SharedState,
    detection::model::DetectionConfig,
    model::{MatchMode, MatchSnapshot, MatchSource, Player},
    overlay, storage,
};
use tauri::{Emitter, Manager};

pub(super) fn base_player(id: String, name: String, race: &str, team: usize) -> Player {
    Player {
        stats_cache: None,
        identity_hint: None,
        id,
        name,
        civilization: race.into(),
        civilization_id: Some(race.into()),
        unique_units: vec![],
        symbol: String::new(),
        team_id: Some(team as i32 + 1),
        color: None,
        color_hex: None,
        rating: None,
        mmr: None,
        rank: None,
        rank_level: None,
        wins: None,
        losses: None,
        draws: None,
        rating_change: None,
        won: None,
        draw: None,
    }
}
fn local_player(player: &ClientPlayer, data: Option<&PlayerData>, team: usize) -> Player {
    let race = race(&player.race).unwrap_or("UNKNOWN");
    let mut mapped = base_player(
        data.map_or_else(
            || format!("sc2-local-{}", player.id),
            |data| data.character.id.to_string(),
        ),
        player.name.clone(),
        race,
        team,
    );
    if let Some(data) = data {
        if let Some(stats) = data
            .teams
            .iter()
            .find(|stats| stats.race(data.character.id) == Some(race))
        {
            mapped.stats_cache = Some(crate::model::StatsCache {
                fetched_at: data.fetched_at.to_rfc3339(),
                stale: data.stale,
            });
            mapped.rating = stats.rating;
            mapped.mmr = stats.rating;
            mapped.wins = stats.wins;
            mapped.losses = stats.losses;
            mapped.draws = stats.ties;
            mapped.rank = stats.region_rank;
            mapped.rank_level = stats.league_type.map(|league| {
                match league {
                    0 => "Bronze",
                    1 => "Silver",
                    2 => "Gold",
                    3 => "Platinum",
                    4 => "Diamond",
                    5 => "Master",
                    6 => "Grandmaster",
                    _ => "—",
                }
                .into()
            });
        }
    }
    mapped
}

fn snapshot(players: Vec<Player>, profile_id: u64, id: String, map: String) -> MatchSnapshot {
    MatchSnapshot { duration_seconds: None, id, game_id: "sc2".into(), mode: MatchMode::Unknown, map, source: MatchSource::Live, players,
        queue: Some("1v1 · fila não informada".into()), queue_id: Some("sc2_1v1".into()), warnings: vec!["SC2: MMR e estatísticas são ranqueados por raça; a fila da partida atual não é informada pelo cliente.".into()],
        synced_at: Some(chrono::Utc::now().to_rfc3339()), replay_of: None, finished_at: None, self_player_id: Some(profile_id.to_string()) }
}

pub async fn latest_snapshot(
    provider: &Sc2Provider,
    profile_id: u64,
) -> Result<MatchSnapshot, String> {
    let games = provider.matches(profile_id).await?;
    let game = games
        .into_iter()
        .find(|game| {
            game.participants.len() == 2
                && game
                    .participants
                    .iter()
                    .all(|p| p.participant.decision != "OBSERVER")
        })
        .ok_or("Nenhuma partida SC2 1v1 completa foi publicada para este perfil")?;
    Ok(historical_snapshot(game, profile_id))
}
fn historical_snapshot(game: RemoteMatch, profile_id: u64) -> MatchSnapshot {
    let players = game
        .participants
        .iter()
        .enumerate()
        .map(|(index, participant)| {
            let character = participant
                .team
                .as_ref()
                .and_then(|team| {
                    team.members.iter().find(|member| {
                        member.character.id == participant.participant.player_character_id
                    })
                })
                .map(|member| &member.character);
            let race = participant_race(participant).unwrap_or_else(|| "UNKNOWN".into());
            let mut player = base_player(
                participant.participant.player_character_id.to_string(),
                character.map_or_else(
                    || "Jogador".into(),
                    |character| character.display_name().into(),
                ),
                &race,
                index,
            );
            player.won = outcome(&participant.participant.decision);
            player.draw = Some(participant.participant.decision == "TIE");
            player.rating_change = participant.participant.rating_change;
            player
        })
        .collect();
    let mut snapshot = snapshot(
        players,
        profile_id,
        format!("sc2-pulse-{}", game.game.id),
        game.map.name,
    );
    snapshot.queue = Some("1v1 · histórico SC2 Pulse".into());
    snapshot.synced_at = Some(chrono::Utc::now().to_rfc3339());
    snapshot.finished_at = Some(game.game.date.to_rfc3339());
    snapshot.warnings = vec!["SC2: a fonte não informou o MMR inicial desta partida. Estatísticas atuais não substituem dados históricos.".into()];
    snapshot
}

pub async fn cycle(
    app: &tauri::AppHandle,
    provider: &Sc2Provider,
    config: &DetectionConfig,
    session: &mut Session,
) -> Result<(), String> {
    let profile = config
        .profile
        .as_ref()
        .ok_or("Vincule um perfil SC2 Pulse")?;
    let Some(game) = provider.local_game().await? else {
        return publish(
            app,
            config,
            None,
            false,
            "Abra o StarCraft II para detectar uma partida 1v1.",
        );
    };
    let current = app
        .state::<SharedState>()
        .lock()
        .map_err(|e| e.to_string())?
        .current_match
        .clone()
        .filter(|game| game.game_id == "sc2" && matches!(game.source, MatchSource::Live));
    let same_players =
        session.profile_id == profile.profile_id && session.fingerprint == game.fingerprint();
    let changed = session.changed(&game, profile.profile_id);
    session.observe(&game, profile.profile_id);
    if !game.active() {
        let confirmed_end = game.terminal(session.empty_checks);
        let finished = if confirmed_end {
            current.map(|mut snapshot| {
                snapshot.finished_at = Some(chrono::Utc::now().to_rfc3339());
                if game.supported() && same_players {
                    for player in &mut snapshot.players {
                        if let Some(remote) = game
                            .players
                            .iter()
                            .find(|remote| remote.name == player.name)
                        {
                            player.won = outcome(&remote.result);
                            player.draw = Some(
                                remote.result.eq_ignore_ascii_case("tie")
                                    || remote.result.eq_ignore_ascii_case("draw"),
                            );
                        }
                    }
                }
                snapshot
            })
        } else {
            None
        };
        return publish(
            app,
            config,
            finished,
            confirmed_end,
            "SC2 · aguardando 1v1 entre jogadores humanos.",
        );
    }
    if current.is_none() && !changed {
        let confirmed =
            app.state::<SharedState>()
                .lock()
                .map_err(|e| e.to_string())?
                .last_synced
                .as_ref()
                .is_some_and(|last| {
                    last.belongs_to(config)
                        && last.finished_at.is_some()
                        && last
                            .warnings
                            .iter()
                            .any(|warning| warning == super::replay::CONFIRMED)
                        && game.players.iter().all(|player| {
                            last.players.iter().any(|saved| saved.name == player.name)
                        })
                });
        if confirmed {
            return publish(app, config, None, false, super::replay::CONFIRMED);
        }
    }
    if current.is_some() && !changed {
        return publish(
            app,
            config,
            None,
            false,
            "Partida em andamento · dados do início",
        );
    }
    let Some(own_index) = game.player_index(&profile.name) else {
        return publish(
            app,
            config,
            None,
            current.is_some(),
            if profile.name.starts_with("SC2 #") {
                "Informe seu nome no jogo na aba Partida e reative a detecção."
            } else if game
                .players
                .iter()
                .any(|player| player.name == profile.name)
            {
                "Dois jogadores têm o nome configurado; não foi possível identificar você."
            } else {
                "Nome configurado não encontrado na partida. Confira Nome no jogo e reative a detecção."
            },
        );
    };
    if current.is_some() {
        publish(app, config, None, true, "Nova partida SC2 encontrada.")?;
    }
    let id = format!("sc2-local-{}", chrono::Utc::now().timestamp_millis());
    let mut incoming = live_snapshot(&game, own_index, profile.profile_id, id.clone(), None, None);
    incoming.warnings.truncate(1);
    publish(
        app,
        config,
        Some(incoming),
        false,
        "Partida em andamento · dados locais",
    )?;
    let app = app.clone();
    let provider = provider.clone();
    let config = config.clone();
    tauri::async_runtime::spawn(async move {
        if let Err(error) = enrich(&app, &provider, &config, game, own_index, id).await {
            eprintln!("Não foi possível completar as estatísticas SC2: {error}");
        }
    });
    Ok(())
}

async fn enrich(
    app: &tauri::AppHandle,
    provider: &Sc2Provider,
    config: &DetectionConfig,
    game: ClientGame,
    own_index: usize,
    id: String,
) -> Result<(), String> {
    let profile = config
        .profile
        .as_ref()
        .ok_or("Vincule um perfil SC2 Pulse")?;
    let data = provider
        .player_data(profile.profile_id, false)
        .await
        .ok()
        .filter(|data| {
            !data.character.has_public_name() || data.character.display_name() == profile.name
        });
    let opponent_index = 1 - own_index;
    let region = if let Some(data) = &data {
        Some(data.character.region.clone())
    } else {
        provider
            .identity(profile.profile_id)
            .await
            .ok()
            .map(|identity| identity.region)
    };
    let opponent = if let Some(region) = region {
        provider
            .opponent(&game.players[opponent_index].name, &region)
            .await
    } else {
        None
    };
    let Some(confirmed) = provider.local_game().await? else {
        return Ok(());
    };
    if !confirmed.active()
        || confirmed.fingerprint() != game.fingerprint()
        || confirmed.display_time < game.display_time
    {
        return Ok(());
    }
    let incoming = live_snapshot(
        &game,
        own_index,
        profile.profile_id,
        id,
        data.as_ref(),
        opponent.as_ref(),
    );
    let snapshot = {
        let shared = app.state::<SharedState>();
        let mut state = shared.lock().map_err(|error| error.to_string())?;
        if !apply_enrichment(&mut state, config, incoming) {
            return Ok(());
        }
        if let Some(current) = &state.current_match {
            if let Err(error) = storage::save_last_match(app, current) {
                eprintln!("{error}");
            }
        }
        state.clone()
    };
    overlay::synchronize(app, &snapshot, false)
}

fn apply_enrichment(
    state: &mut crate::model::AppState,
    config: &DetectionConfig,
    incoming: MatchSnapshot,
) -> bool {
    if state.detection.config != *config {
        return false;
    }
    let Some(current) = state.current_match.as_mut().filter(|current| {
        current.id == incoming.id
            && current.finished_at.is_none()
            && matches!(current.source, MatchSource::Live)
    }) else {
        return false;
    };
    current.players = incoming.players;
    current.warnings = incoming.warnings;
    state.last_synced = Some(current.clone());
    true
}

fn live_snapshot(
    game: &ClientGame,
    own_index: usize,
    profile_id: u64,
    id: String,
    data: Option<&PlayerData>,
    opponent: Option<&PlayerData>,
) -> MatchSnapshot {
    let players = game
        .players
        .iter()
        .enumerate()
        .map(|(index, player)| {
            let mut mapped = local_player(
                player,
                if index == own_index { data } else { opponent },
                index,
            );
            if index == own_index {
                mapped.id = profile_id.to_string();
            } else if opponent.is_some() {
                mapped.identity_hint = Some("name-region".into());
            }
            mapped
        })
        .collect();
    let mut incoming = snapshot(players, profile_id, id, "Mapa indisponível".into());
    if opponent.is_none() {
        incoming.warnings.push(
            "Adversário sem identificação única no SC2 Pulse; estatísticas indisponíveis.".into(),
        );
    }
    if data.is_none() {
        incoming
            .warnings
            .push("Estatísticas do SC2 Pulse indisponíveis; exibindo os dados locais.".into());
    }
    incoming
}

fn publish(
    app: &tauri::AppHandle,
    config: &DetectionConfig,
    incoming: Option<MatchSnapshot>,
    finish: bool,
    message: &str,
) -> Result<(), String> {
    let changed = incoming.is_some() || finish;
    let published = {
        let shared = app.state::<SharedState>();
        let mut state = shared.lock().map_err(|e| e.to_string())?;
        if state.detection.config != *config {
            return Ok(());
        }
        if changed {
            crate::diagnostics::record(
                &mut state,
                "sc2",
                if finish {
                    "Fim da sessão confirmado pela API local do SC2."
                } else {
                    "Partida SC2 capturada."
                },
            );
        }
        if let Some(mut snapshot) = incoming {
            if storage::save_last_match(app, &snapshot).is_err() {
                snapshot
                    .warnings
                    .push("Não foi possível salvar a partida para demonstração".into());
            }
            if !finish {
                state.observed_sc2_match_id = Some(snapshot.id.clone());
            }
            state.last_synced = Some(snapshot.clone());
            if !finish
                && state
                    .current_match
                    .as_ref()
                    .is_none_or(|old| old.id != snapshot.id)
            {
                state.post_game = None;
            }
            state.current_match = if finish { None } else { Some(snapshot) };
            if !finish {
                state.hidden_match_id = None;
            }
        } else if finish {
            state.current_match = None;
        }
        state.detection.phase = if state.current_match.is_some() {
            "in-match"
        } else {
            "waiting"
        }
        .into();
        state.detection.message = message.into();
        state.detection.failures = 0;
        state.detection.last_checked = Some(chrono::Utc::now().to_rfc3339());
        state.clone()
    };
    if changed {
        overlay::synchronize(app, &published, true)
    } else {
        app.emit("state-changed", published)
            .map_err(|e| e.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn late_statistics_never_revive_a_game_or_change_its_visibility() {
        let game: ClientGame = serde_json::from_value(serde_json::json!({
            "isReplay": false, "displayTime": 12,
            "players": [
                {"id":1,"name":"Nova","race":"Terran","type":"user","result":"Undecided"},
                {"id":2,"name":"Orion","race":"Zerg","type":"user","result":"Undecided"}
            ]
        }))
        .unwrap();
        let initial = live_snapshot(&game, 0, 42, "first".into(), None, None);
        assert_eq!(initial.players[0].id, "42");
        assert!(initial.players.iter().all(|player| player.mmr.is_none()));
        let mut state = crate::model::AppState::default();
        state.detection.config.game_id = "sc2".into();
        let config = state.detection.config.clone();
        state.current_match = Some(initial.clone());
        state.hidden_match_id = Some(initial.id.clone());
        let start = initial.synced_at.clone();
        let mut enriched = initial.clone();
        enriched.players[0].mmr = Some(4200);
        assert!(apply_enrichment(&mut state, &config, enriched));
        assert_eq!(
            state.current_match.as_ref().unwrap().players[0].mmr,
            Some(4200)
        );
        assert_eq!(state.hidden_match_id.as_deref(), Some("first"));
        assert_eq!(state.current_match.as_ref().unwrap().synced_at, start);
        state.current_match.as_mut().unwrap().id = "next".into();
        assert!(!apply_enrichment(&mut state, &config, initial.clone()));
        state.current_match = None;
        assert!(!apply_enrichment(&mut state, &config, initial.clone()));
        state.current_match = Some(initial.clone());
        state.detection.config.game_id = "aoe4".into();
        assert!(!apply_enrichment(&mut state, &config, initial));
    }
    #[test]
    fn unknown_players_have_no_invented_identity_stats_or_rating_projection() {
        let local = ClientPlayer {
            id: 2,
            name: "Orion".into(),
            race: "Zerg".into(),
            kind: "user".into(),
            result: "Undecided".into(),
        };
        let player = local_player(&local, None, 1);
        assert_eq!(player.name, "Orion");
        assert_eq!(player.id, "sc2-local-2");
        assert_eq!(player.rating, None);
        assert_eq!(player.wins, None);
        let snapshot = snapshot(vec![player], 42, "test".into(), "Mapa indisponível".into());
        assert!(matches!(snapshot.mode, MatchMode::Unknown));
        assert_eq!(snapshot.game_id, "sc2");
        assert_eq!(snapshot.queue_id.as_deref(), Some("sc2_1v1"));
    }
}
