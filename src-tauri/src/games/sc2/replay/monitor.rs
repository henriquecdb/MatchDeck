use super::{ReplayRecord, CONFIRMED};
use crate::{
    commands::SharedState,
    games::sc2::provider::Sc2Provider,
    model::{MatchSnapshot, MatchSource},
};
use notify::{RecursiveMode, Watcher};
use std::{
    collections::HashMap,
    path::PathBuf,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    },
    time::{Duration, Instant, SystemTime},
};
use tauri::Manager;
#[derive(Default)]
pub struct Index {
    pub identity: Option<(u64, String)>,
    files: HashMap<PathBuf, (u64, SystemTime, Option<ReplayRecord>)>,
    pub scans: u64,
    pub parsed: u64,
    pub last_ms: u128,
}
fn replay_directories(roots: &[PathBuf], handle: &str) -> Vec<PathBuf> {
    let mut result = Vec::new();
    for root in roots {
        let accounts = root.join("StarCraft II/Accounts");
        for account in crate::games::local_profile::directories(&accounts).unwrap_or_default() {
            if !account.bytes().all(|b| b.is_ascii_digit()) {
                continue;
            }
            let character = accounts.join(account).join(handle);
            if std::fs::symlink_metadata(&character)
                .is_ok_and(|m| m.is_dir() && !m.file_type().is_symlink())
            {
                let path = character.join("Replays/Multiplayer");
                if std::fs::symlink_metadata(&path)
                    .is_ok_and(|m| m.is_dir() && !m.file_type().is_symlink())
                    && character
                        .canonicalize()
                        .ok()
                        .zip(path.canonicalize().ok())
                        .is_some_and(|(parent, child)| child.starts_with(parent))
                {
                    result.push(path);
                }
            }
        }
    }
    result
}
fn scan(index: &mut Index, roots: &[PathBuf], handle: &str) -> Vec<ReplayRecord> {
    let start = Instant::now();
    index.scans += 1;
    let mut candidates = Vec::new();
    for directory in replay_directories(roots, handle) {
        if let Ok(entries) = std::fs::read_dir(directory) {
            for entry in entries.take(4096).flatten() {
                let path = entry.path();
                if !path
                    .extension()
                    .is_some_and(|s| s.eq_ignore_ascii_case("SC2Replay"))
                {
                    continue;
                }
                if let Ok(m) = std::fs::symlink_metadata(&path) {
                    if m.is_file() && !m.file_type().is_symlink() && m.len() <= 16 * 1024 * 1024 {
                        if let Ok(time) = m.modified() {
                            candidates.push((path, m.len(), time));
                        }
                    }
                }
            }
        }
    }
    candidates.sort_by_key(|(_, _, time)| std::cmp::Reverse(*time));
    candidates.truncate(32);
    let mut records = Vec::new();
    index
        .files
        .retain(|path, _| candidates.iter().any(|(p, _, _)| p == path));
    for (path, len, time) in candidates {
        if time
            .elapsed()
            .is_ok_and(|elapsed| elapsed < Duration::from_secs(2))
        {
            continue;
        }
        let cached = index
            .files
            .get(&path)
            .filter(|(old_len, old_time, _)| *old_len == len && *old_time == time);
        let record = if let Some((_, _, record)) = cached {
            record.clone()
        } else {
            index.parsed += 1;
            let record = super::parse(&path).ok().filter(|r| r.includes(handle));
            let unchanged = std::fs::metadata(&path)
                .is_ok_and(|m| m.len() == len && m.modified().ok() == Some(time));
            if unchanged {
                index.files.insert(path, (len, time, record.clone()));
                record
            } else {
                None
            }
        };
        if let Some(record) = record {
            records.push(record);
        }
    }
    records.sort_by_key(|r| std::cmp::Reverse(r.finished_at));
    records.dedup_by(|a, b| a.id == b.id);
    index.last_ms = start.elapsed().as_millis();
    records
}
async fn records(
    app: &tauri::AppHandle,
    provider: &Sc2Provider,
    id: u64,
) -> Result<(String, Vec<ReplayRecord>), String> {
    let identity = provider
        .replays
        .lock()
        .map_err(|e| e.to_string())?
        .identity
        .clone()
        .filter(|(saved, _)| *saved == id);
    let handle = if let Some((_, handle)) = identity {
        handle
    } else {
        let handle = provider.identity(id).await?.handle();
        let mut index = provider.replays.lock().map_err(|e| e.to_string())?;
        *index = Index {
            identity: Some((id, handle.clone())),
            ..Default::default()
        };
        handle
    };
    let roots = crate::games::local_profile::document_roots(
        app.path().document_dir().map_err(|e| e.to_string())?,
    );
    let shared = provider.replays.clone();
    let target = handle.clone();
    let records = tauri::async_runtime::spawn_blocking(move || {
        let mut index = shared.lock().map_err(|e| e.to_string())?;
        if index
            .identity
            .as_ref()
            .is_none_or(|(profile, _)| *profile != id)
        {
            return Ok(Vec::new());
        }
        Ok::<_, String>(scan(&mut index, &roots, &target))
    })
    .await
    .map_err(|e| e.to_string())??;
    if let Err(error) = super::super::session::record(app, id, &handle, &records) {
        eprintln!("Não foi possível atualizar a sessão SC2: {error}");
    }
    if let Err(error) = super::super::session::record_history(app, id, &handle, &records) {
        eprintln!("Não foi possível atualizar o histórico SC2: {error}");
    }
    Ok((handle, records))
}
pub async fn latest(
    app: &tauri::AppHandle,
    provider: &Sc2Provider,
    id: u64,
) -> Result<Option<MatchSnapshot>, String> {
    let (handle, records) = records(app, provider, id).await?;
    Ok(records.first().map(|record| record.snapshot(id, &handle)))
}
pub async fn history(
    app: &tauri::AppHandle,
    provider: &Sc2Provider,
    id: u64,
) -> Result<Vec<crate::games::profile::RecentMatch>, String> {
    let (handle, records) = records(app, provider, id).await?;
    Ok(records
        .iter()
        .take(5)
        .filter_map(|record| record.recent(&handle))
        .collect())
}
fn same_players(a: &MatchSnapshot, b: &MatchSnapshot) -> bool {
    a.self_player_id == b.self_player_id
        && a.players.len() == b.players.len()
        && a.players
            .iter()
            .all(|p| b.players.iter().any(|other| other.name == p.name))
}
fn observed_fresh_result(
    state: &crate::model::AppState,
    incoming: &MatchSnapshot,
    matching_current: bool,
) -> bool {
    let observed = matching_current
        || state.last_synced.as_ref().is_some_and(|old| {
            state.observed_sc2_match_id.as_ref() == Some(&old.id) && same_players(old, incoming)
        });
    observed
        && incoming
            .finished_at
            .as_ref()
            .and_then(|end| chrono::DateTime::parse_from_rfc3339(end).ok())
            .is_some_and(|end| {
                let age = chrono::Utc::now().signed_duration_since(end);
                age >= chrono::Duration::zero() && age <= chrono::Duration::seconds(30)
            })
}
fn apply(app: &tauri::AppHandle, incoming: MatchSnapshot) -> Result<(), String> {
    let (snapshot, refresh_mmr) = {
        let shared = app.state::<SharedState>();
        let mut state = shared.lock().map_err(|e| e.to_string())?;
        if !incoming.belongs_to(&state.detection.config) {
            return Ok(());
        }
        if state
            .current_match
            .as_ref()
            .is_some_and(|m| matches!(m.source, MatchSource::Demo))
        {
            return Ok(());
        }
        let matching_current = state.current_match.as_ref().is_some_and(|m| {
            same_players(m, &incoming)
                && m.synced_at
                    .as_ref()
                    .zip(incoming.finished_at.as_ref())
                    .is_some_and(|(start, end)| start <= end)
        });
        if state.current_match.is_some() && !matching_current {
            return Ok(());
        }
        if state.last_synced.as_ref().is_some_and(|old| {
            old.id == incoming.id
                || (old
                    .finished_at
                    .as_ref()
                    .zip(incoming.finished_at.as_ref())
                    .is_some_and(|(a, b)| a > b)
                    && old.warnings.iter().any(|w| w == CONFIRMED))
        }) {
            return Ok(());
        }
        let observed_fresh = observed_fresh_result(&state, &incoming, matching_current);
        let opponent_id = incoming
            .players
            .iter()
            .find(|p| Some(&p.id) != incoming.self_player_id.as_ref())
            .map(|p| p.id.trim_start_matches("sc2-toon-").to_owned());
        let hidden = state
            .current_match
            .as_ref()
            .or(state.last_synced.as_ref())
            .is_some_and(|old| state.hidden_match_id.as_ref() == Some(&old.id));
        let mut result = incoming;
        if matching_current {
            if let Some(mut captured) = state.current_match.take() {
                for p in &mut captured.players {
                    if let Some(confirmed) =
                        result.players.iter().find(|other| other.name == p.name)
                    {
                        p.won = confirmed.won;
                        p.draw = confirmed.draw;
                    }
                }
                captured.id = result.id;
                captured.map = result.map;
                captured.queue = result.queue;
                captured.queue_id = result.queue_id;
                captured.finished_at = result.finished_at;
                captured.duration_seconds = result.duration_seconds;
                captured.warnings = vec![CONFIRMED.into()];
                result = captured;
            }
        }
        crate::storage::save_last_match(app, &result)?;
        if observed_fresh
            && !hidden
            && state.detection.config.enabled
            && state.settings.post_game_seconds > 0
        {
            state.post_game = Some(crate::model::PostGame {
                game: result.clone(),
                opponent_id,
                expires_at: chrono::Utc::now()
                    + chrono::Duration::seconds(state.settings.post_game_seconds as i64),
            });
        }
        state.last_synced = Some(result);
        if matching_current {
            state.detection.phase = "waiting".into();
            state.detection.message = "Resultado confirmado por replay local.".into();
        }
        crate::diagnostics::record(
            &mut state,
            "sc2-replay",
            "Resultado atualizado por replay local.",
        );
        (state.clone(), observed_fresh)
    };
    if let Some(id) = snapshot
        .last_synced
        .as_ref()
        .filter(|_| refresh_mmr)
        .and_then(|m| m.self_player_id.as_ref())
        .and_then(|id| id.parse().ok())
    {
        super::super::session::sample_after_game(app, id);
    }
    crate::overlay::synchronize(app, &snapshot, true)?;
    Ok(())
}
pub async fn watch(app: tauri::AppHandle, provider: Sc2Provider) {
    let dirty = Arc::new(AtomicBool::new(true));
    let flag = dirty.clone();
    let mut watcher = notify::recommended_watcher(move |event: notify::Result<notify::Event>| {
        if event.as_ref().map_or(true, |event| {
            event.paths.iter().any(|p| {
                p.extension()
                    .is_some_and(|e| e.eq_ignore_ascii_case("SC2Replay"))
            })
        }) {
            flag.store(true, Ordering::Relaxed);
        }
    })
    .ok();
    if let Ok(root) = app.path().document_dir() {
        for root in crate::games::local_profile::document_roots(root) {
            if let Some(watcher) = watcher.as_mut() {
                let _ = watcher.watch(
                    &root.join("StarCraft II/Accounts"),
                    RecursiveMode::Recursive,
                );
            }
        }
    }
    let mut selected = None;
    let mut retry = Instant::now();
    let mut settle = 0;
    loop {
        tokio::time::sleep(Duration::from_secs(2)).await;
        let config = app
            .state::<SharedState>()
            .lock()
            .ok()
            .map(|state| state.detection.config.clone());
        let Some(config) = config else { continue };
        if config.game_id != "sc2" {
            selected = None;
            continue;
        }
        let Some(profile) = config.profile else {
            continue;
        };
        let changed = selected != Some(profile.profile_id);
        selected = Some(profile.profile_id);
        if dirty.swap(false, Ordering::Relaxed)
            || changed
            || retry.elapsed() >= Duration::from_secs(60)
        {
            settle = 3;
            retry = Instant::now();
        }
        if settle == 0 {
            continue;
        }
        settle -= 1;
        match latest(&app, &provider, profile.profile_id).await {
            Ok(Some(result)) => {
                let _ = apply(&app, result);
            }
            Ok(None) => {}
            Err(_) => {
                if changed {
                    if let Ok(mut state) = app.state::<SharedState>().lock() {
                        crate::diagnostics::record(
                            &mut state,
                            "sc2-replay",
                            "Leitura local indisponível; nova tentativa em até um minuto.",
                        );
                    }
                }
            }
        }
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn receives_a_notification_for_a_new_replay_without_polling_file_contents() {
        let directory = std::env::temp_dir().join(format!(
            "matchdeck-replay-watch-{}-{}",
            std::process::id(),
            chrono::Utc::now().timestamp_nanos_opt().unwrap()
        ));
        std::fs::create_dir(&directory).unwrap();
        let (send, receive) = std::sync::mpsc::channel();
        let mut watcher =
            notify::recommended_watcher(move |event: notify::Result<notify::Event>| {
                if event.is_ok_and(|event| {
                    event
                        .paths
                        .iter()
                        .any(|p| p.extension().is_some_and(|ext| ext == "SC2Replay"))
                }) {
                    let _ = send.send(());
                }
            })
            .unwrap();
        watcher
            .watch(&directory, RecursiveMode::NonRecursive)
            .unwrap();
        let file = directory.join("test.SC2Replay");
        std::fs::write(&file, b"test").unwrap();
        let received = receive.recv_timeout(Duration::from_secs(5)).is_ok();
        drop(watcher);
        std::fs::remove_file(file).unwrap();
        std::fs::remove_dir(directory).unwrap();
        assert!(received);
    }
    #[test]
    #[ignore = "requires local SC2 replay directory"]
    fn cache_does_not_reparse_unchanged_files() {
        let root = PathBuf::from(std::env::var("MATCHDECK_TEST_DOCUMENTS").unwrap());
        let mut index = Index::default();
        let first = scan(&mut index, std::slice::from_ref(&root), "1-S2-2-449277");
        assert!(!first.is_empty());
        let parsed = index.parsed;
        let second = scan(&mut index, &[root], "1-S2-2-449277");
        assert_eq!(first.len(), second.len());
        assert_eq!(index.parsed, parsed);
        println!(
            "{} replays, {} parsed total, warm scan {} ms",
            first.len(),
            parsed,
            index.last_ms
        );
    }

    #[test]
    fn only_a_recent_result_observed_in_this_run_can_trigger_post_game() {
        let mut state = crate::model::AppState::default();
        let incoming: MatchSnapshot = serde_json::from_value(serde_json::json!({"id":"replay","gameId":"sc2","mode":"unknown","map":"Arena","source":"live","players":[],"selfPlayerId":"42","finishedAt":chrono::Utc::now().to_rfc3339()})).unwrap();
        let mut local = incoming.clone();
        local.id = "sc2-local-one".into();
        state.last_synced = Some(local);
        assert!(!observed_fresh_result(&state, &incoming, false));
        state.observed_sc2_match_id = Some("sc2-local-one".into());
        assert!(observed_fresh_result(&state, &incoming, false));
        let mut old = incoming.clone();
        old.finished_at = Some((chrono::Utc::now() - chrono::Duration::minutes(1)).to_rfc3339());
        assert!(!observed_fresh_result(&state, &old, true));
        let mut other_profile = incoming;
        other_profile.self_player_id = Some("99".into());
        assert!(!observed_fresh_result(&state, &other_profile, false));
    }
}
