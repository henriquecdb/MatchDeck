use crate::{commands::SharedState, model::AppState};
use serde::Serialize;
use tauri::{Manager, State};

#[derive(Clone, Serialize)]
pub struct DiagnosticEvent {
    timestamp: String,
    category: String,
    message: String,
}

pub fn record(state: &mut AppState, category: &str, message: &str) {
    if state.events.len() >= 60 {
        state.events.remove(0);
    }
    state.events.push(DiagnosticEvent {
        timestamp: chrono::Utc::now().to_rfc3339(),
        category: category.into(),
        message: message.into(),
    });
}

#[tauri::command]
pub fn diagnostics_report(state: State<'_, SharedState>) -> Result<serde_json::Value, String> {
    let state = state.lock().map_err(|error| error.to_string())?;
    Ok(report(&state))
}

fn report(state: &AppState) -> serde_json::Value {
    let failures = state.detection.failures;
    serde_json::json!({
        "version": env!("CARGO_PKG_VERSION"), "platform": std::env::consts::OS,
        "source": "AoE II Companion · HTTP por perfil; cobertura de lobbies não garantida",
        "detection": { "enabled": state.detection.config.enabled, "phase": state.detection.phase, "lastChecked": state.detection.last_checked, "failures": failures, "retrySeconds": crate::detection::model::retry_delay(failures) },
        "startupMs": state.startup_ms, "trayAvailable": state.tray_available,
        "shortcuts": {"lock": state.shortcut_available, "visibility": state.visibility_shortcut_available},
        "events": state.events,
    })
}

pub fn report_error(app: &tauri::AppHandle, message: String) {
    if let Ok(mut state) = app.state::<SharedState>().lock() {
        state.app_error = Some(message);
        record(
            &mut state,
            "application",
            "Uma operação do aplicativo falhou; consulte o painel.",
        );
        use tauri::Emitter;
        let _ = app.emit("state-changed", &*state);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn export_is_bounded_and_omits_profile_identifiers_and_raw_errors() {
        let mut state = AppState {
            app_error: Some("https://example.com/private?token=secret".into()),
            ..Default::default()
        };
        state.detection.config.profile = Some(crate::detection::model::Profile {
            profile_id: 987654321,
            name: "PrivateName".into(),
        });
        for _ in 0..70 {
            record(
                &mut state,
                "network",
                "Consulta falhou; nova tentativa agendada.",
            );
        }
        let report = report(&state);
        assert_eq!(report["events"].as_array().unwrap().len(), 60);
        let json = report.to_string();
        assert!(
            !json.contains("PrivateName")
                && !json.contains("987654321")
                && !json.contains("secret")
        );
    }
}
