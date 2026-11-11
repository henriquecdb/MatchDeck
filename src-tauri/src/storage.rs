use crate::detection::model::DetectionConfig;
use crate::model::{MatchSnapshot, OverlaySettings};
use std::fs;
use std::io::Write;
use std::sync::{
    atomic::{AtomicU64, Ordering},
    Arc,
};
use tauri::Manager;

#[derive(Default)]
pub struct PositionSaveRevision(Arc<AtomicU64>);

pub fn schedule_position_save(app: &tauri::AppHandle) {
    let revision = app.state::<PositionSaveRevision>().0.clone();
    let expected = revision.fetch_add(1, Ordering::Relaxed) + 1;
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(std::time::Duration::from_millis(400)).await;
        if revision.load(Ordering::Relaxed) != expected {
            return;
        }
        if let Ok(state) = app.state::<crate::commands::SharedState>().lock() {
            if let Err(error) = save(&app, &state.settings, &state.detection.config.game_id) {
                eprintln!("{error}");
            }
        };
    });
}

fn read_game_at<T: serde::de::DeserializeOwned>(
    directory: &std::path::Path,
    name: &str,
    game_id: &str,
) -> Option<T> {
    [
        directory.join("games").join(game_id).join(name),
        if game_id == "aoe2-de" {
            directory.join(name)
        } else {
            directory.join("games").join(game_id).join(name)
        },
    ]
    .into_iter()
    .find_map(|path| {
        fs::read(path)
            .ok()
            .and_then(|data| serde_json::from_slice(&data).ok())
    })
}

pub(crate) fn read_game<T: serde::de::DeserializeOwned>(
    app: &tauri::AppHandle,
    name: &str,
    game_id: &str,
) -> Option<T> {
    read_game_at(&app.path().app_config_dir().ok()?, name, game_id)
}

fn write_atomic<T: serde::Serialize>(
    directory: &std::path::Path,
    name: &str,
    value: &T,
) -> Result<(), String> {
    fs::create_dir_all(directory).map_err(|error| error.to_string())?;
    let temporary = directory.join(format!(".{name}.tmp"));
    let mut file = fs::File::create(&temporary).map_err(|error| error.to_string())?;
    file.write_all(&serde_json::to_vec_pretty(value).map_err(|error| error.to_string())?)
        .map_err(|error| error.to_string())?;
    file.sync_all().map_err(|error| error.to_string())?;
    drop(file);
    fs::rename(&temporary, directory.join(name)).map_err(|error| error.to_string())
}

pub(crate) fn write_game<T: serde::Serialize>(
    app: &tauri::AppHandle,
    name: &str,
    value: &T,
    game_id: &str,
) -> Result<(), String> {
    let directory = app
        .path()
        .app_config_dir()
        .map_err(|error| error.to_string())?
        .join("games")
        .join(game_id);
    write_atomic(&directory, name, value)
}

pub fn load_preferences(app: &tauri::AppHandle) -> crate::preferences::AppPreferences {
    let Ok(directory) = app.path().app_config_dir() else {
        return Default::default();
    };
    match fs::read(directory.join("preferences.json")) {
        Ok(data) => serde_json::from_slice(&data).unwrap_or_default(),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            crate::preferences::AppPreferences {
                auto_update: load(app, "aoe2-de").auto_update,
                ..Default::default()
            }
        }
        Err(_) => Default::default(),
    }
}

pub fn save_preferences(
    app: &tauri::AppHandle,
    preferences: &crate::preferences::AppPreferences,
) -> Result<(), String> {
    let directory = app
        .path()
        .app_config_dir()
        .map_err(|error| error.to_string())?;
    write_atomic(&directory, "preferences.json", preferences)
}

pub fn load_last_match(app: &tauri::AppHandle, game_id: &str) -> Option<MatchSnapshot> {
    read_game::<MatchSnapshot>(app, "last-match.json", game_id).filter(|snapshot| {
        snapshot.game_id == game_id
            && !snapshot.players.is_empty()
            && snapshot.players.len() <= 8
            && snapshot.belongs_to(&load_detection(app, game_id))
    })
}

pub fn save_last_match(app: &tauri::AppHandle, snapshot: &MatchSnapshot) -> Result<(), String> {
    write_game(app, "last-match.json", snapshot, &snapshot.game_id)
}

pub fn load_detection(app: &tauri::AppHandle, game_id: &str) -> DetectionConfig {
    let mut config: DetectionConfig = read_game(app, "detection.json", game_id).unwrap_or_default();
    config.game_id = game_id.into();
    config
}

pub fn save_detection(app: &tauri::AppHandle, config: &DetectionConfig) -> Result<(), String> {
    write_game(app, "detection.json", config, &config.game_id)
}

pub fn load(app: &tauri::AppHandle, game_id: &str) -> OverlaySettings {
    read_game::<OverlaySettings>(app, "settings.json", game_id)
        .unwrap_or_default()
        .normalize()
}

pub fn save(
    app: &tauri::AppHandle,
    settings: &OverlaySettings,
    game_id: &str,
) -> Result<(), String> {
    write_game(app, "settings.json", settings, game_id)
}

pub fn selected_game(app: &tauri::AppHandle) -> String {
    app.path()
        .app_config_dir()
        .ok()
        .and_then(|dir| fs::read(dir.join("active-game.json")).ok())
        .and_then(|data| serde_json::from_slice::<String>(&data).ok())
        .filter(|id| crate::games::supports(id))
        .unwrap_or_else(|| "aoe2-de".into())
}

pub fn save_selected_game(app: &tauri::AppHandle, game_id: &str) -> Result<(), String> {
    write_atomic(
        &app.path()
            .app_config_dir()
            .map_err(|error| error.to_string())?,
        "active-game.json",
        &game_id,
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn reads_legacy_preferences_until_game_preferences_are_saved_atomically() {
        let directory = std::env::temp_dir().join(format!(
            "matchdeck-storage-{}-{}",
            std::process::id(),
            chrono::Utc::now().timestamp_nanos_opt().unwrap()
        ));
        fs::create_dir_all(&directory).unwrap();
        let legacy = OverlaySettings {
            opacity: 0.6,
            x: -900,
            ..Default::default()
        };
        write_atomic(&directory, "settings.json", &legacy).unwrap();
        assert!(read_game_at::<OverlaySettings>(&directory, "settings.json", "aoe4").is_none());
        assert_eq!(
            read_game_at::<OverlaySettings>(&directory, "settings.json", "aoe2-de")
                .unwrap()
                .x,
            -900
        );
        let game = directory.join("games/aoe2-de");
        write_atomic(
            &game,
            "settings.json",
            &OverlaySettings { x: 140, ..legacy },
        )
        .unwrap();
        assert_eq!(
            read_game_at::<OverlaySettings>(&directory, "settings.json", "aoe2-de")
                .unwrap()
                .x,
            140
        );
        write_atomic(
            &game,
            "settings.json",
            &OverlaySettings {
                x: 200,
                ..Default::default()
            },
        )
        .unwrap();
        assert_eq!(
            read_game_at::<OverlaySettings>(&directory, "settings.json", "aoe2-de")
                .unwrap()
                .x,
            200
        );
        assert!(!game.join(".settings.json.tmp").exists());
        fs::remove_file(game.join("settings.json")).unwrap();
        fs::remove_file(directory.join("settings.json")).unwrap();
        fs::remove_dir(game).unwrap();
        fs::remove_dir(directory.join("games")).unwrap();
        fs::remove_dir(directory).unwrap();
    }
}
