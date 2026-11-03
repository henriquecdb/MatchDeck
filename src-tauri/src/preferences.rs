use serde::{Deserialize, Serialize};

#[derive(Clone, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct AppPreferences {
    pub language: InterfaceLanguage,
    pub game_language: GameLanguage,
    pub launch_minimized: bool,
    pub close_action: CloseAction,
    pub onboarding_complete: bool,
    pub auto_update: bool,
}

#[derive(Clone, Copy, Default, Serialize, Deserialize, PartialEq)]
pub enum InterfaceLanguage {
    #[serde(rename = "en")]
    English,
    #[default]
    #[serde(rename = "pt-BR", other)]
    Portuguese,
}

#[derive(Clone, Copy, Default, Serialize, Deserialize, PartialEq)]
pub enum GameLanguage {
    #[serde(rename = "pt-BR")]
    Portuguese,
    #[default]
    #[serde(rename = "en", other)]
    English,
}

#[derive(Clone, Default, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum CloseAction {
    #[default]
    Ask,
    Minimize,
    Exit,
}

pub fn minimize_on_start(preferences: &AppPreferences, tray_available: bool) -> bool {
    tray_available && preferences.launch_minimized
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn language_defaults_migrate_old_settings_without_coupling_the_choices() {
        let old: AppPreferences = serde_json::from_str(r#"{"autoUpdate":true}"#).unwrap();
        assert!(old.language == InterfaceLanguage::Portuguese);
        assert!(old.game_language == GameLanguage::English);
        assert!(old.auto_update);
        let selected: AppPreferences =
            serde_json::from_str(r#"{"language":"en","gameLanguage":"pt-BR"}"#).unwrap();
        assert!(selected.language == InterfaceLanguage::English);
        assert!(selected.game_language == GameLanguage::Portuguese);
        let saved = serde_json::to_value(selected).unwrap();
        assert_eq!(saved["language"], "en");
        assert_eq!(saved["gameLanguage"], "pt-BR");
        let unknown: AppPreferences =
            serde_json::from_str(r#"{"language":"fr","gameLanguage":"fr"}"#).unwrap();
        assert!(unknown.language == InterfaceLanguage::Portuguese);
        assert!(unknown.game_language == GameLanguage::English);
    }

    #[test]
    fn never_hides_the_only_entry_point_without_a_tray() {
        let preferences = AppPreferences {
            launch_minimized: true,
            ..Default::default()
        };
        assert!(!minimize_on_start(&preferences, false));
        assert!(minimize_on_start(&preferences, true));
        assert!(!minimize_on_start(&AppPreferences::default(), true));
    }
}
