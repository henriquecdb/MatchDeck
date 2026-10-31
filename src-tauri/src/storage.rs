use crate::detection::model::DetectionConfig;
use crate::model::{MatchSnapshot, OverlaySettings};
use std::fs;
use tauri::Manager;

pub fn load_last_match(app: &tauri::AppHandle) -> Option<MatchSnapshot> {
    app.path()
        .app_config_dir()
        .ok()
        .and_then(|directory| fs::read(directory.join("last-match.json")).ok())
        .and_then(|data| serde_json::from_slice::<MatchSnapshot>(&data).ok())
        .filter(|snapshot| !snapshot.players.is_empty() && snapshot.players.len() <= 8)
}

pub fn save_last_match(app: &tauri::AppHandle, snapshot: &MatchSnapshot) -> Result<(), String> {
    let directory = app
        .path()
        .app_config_dir()
        .map_err(|error| error.to_string())?;
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    let data = serde_json::to_vec_pretty(snapshot).map_err(|error| error.to_string())?;
    fs::write(directory.join("last-match.json"), data).map_err(|error| error.to_string())
}

pub fn load_detection(app: &tauri::AppHandle) -> DetectionConfig {
    app.path()
        .app_config_dir()
        .ok()
        .and_then(|directory| fs::read(directory.join("detection.json")).ok())
        .and_then(|data| serde_json::from_slice(&data).ok())
        .unwrap_or_default()
}

pub fn save_detection(app: &tauri::AppHandle, config: &DetectionConfig) -> Result<(), String> {
    let directory = app
        .path()
        .app_config_dir()
        .map_err(|error| error.to_string())?;
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    let data = serde_json::to_vec_pretty(config).map_err(|error| error.to_string())?;
    fs::write(directory.join("detection.json"), data).map_err(|error| error.to_string())
}

pub fn load(app: &tauri::AppHandle) -> OverlaySettings {
    app.path()
        .app_config_dir()
        .ok()
        .and_then(|directory| fs::read(directory.join("settings.json")).ok())
        .and_then(|data| serde_json::from_slice::<OverlaySettings>(&data).ok())
        .unwrap_or_default()
        .normalize()
}

pub fn save(app: &tauri::AppHandle, settings: &OverlaySettings) -> Result<(), String> {
    let directory = app
        .path()
        .app_config_dir()
        .map_err(|error| error.to_string())?;
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    let data = serde_json::to_vec_pretty(settings).map_err(|error| error.to_string())?;
    fs::write(directory.join("settings.json"), data).map_err(|error| error.to_string())
}
