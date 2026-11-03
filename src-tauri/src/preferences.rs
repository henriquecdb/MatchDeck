use serde::{Deserialize, Serialize};

#[derive(Clone, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct AppPreferences {
    pub launch_minimized: bool,
    pub close_action: CloseAction,
    pub onboarding_complete: bool,
    pub auto_update: bool,
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
