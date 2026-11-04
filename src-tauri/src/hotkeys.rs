use crate::{commands::SharedState, overlay, storage};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::Manager;
use tauri_plugin_global_shortcut::{
    Code, GlobalShortcutExt, Shortcut, ShortcutEvent, ShortcutState,
};

#[derive(Clone, Serialize, Deserialize, PartialEq)]
#[serde(default, rename_all = "camelCase")]
pub struct Hotkeys {
    pub lock_overlay: Option<String>,
    pub toggle_overlay: Option<String>,
}

impl Default for Hotkeys {
    fn default() -> Self {
        Self {
            lock_overlay: Some("Ctrl+Shift+O".into()),
            toggle_overlay: Some("Ctrl+Shift+H".into()),
        }
    }
}

impl Hotkeys {
    pub fn bindings(&self) -> Result<Vec<Shortcut>, String> {
        let mut result = Vec::new();
        for value in [&self.lock_overlay, &self.toggle_overlay]
            .into_iter()
            .flatten()
        {
            let shortcut: Shortcut = value.parse().map_err(|_| "Atalho inválido.".to_string())?;
            let function_key = matches!(
                shortcut.key,
                Code::F1
                    | Code::F2
                    | Code::F3
                    | Code::F4
                    | Code::F5
                    | Code::F6
                    | Code::F7
                    | Code::F8
                    | Code::F9
                    | Code::F10
                    | Code::F11
                    | Code::F12
                    | Code::F13
                    | Code::F14
                    | Code::F15
                    | Code::F16
                    | Code::F17
                    | Code::F18
                    | Code::F19
                    | Code::F20
                    | Code::F21
                    | Code::F22
                    | Code::F23
                    | Code::F24
            );
            if shortcut.mods.is_empty() && !function_key {
                return Err(
                    "Use uma tecla válida com um modificador, ou uma tecla de função.".into(),
                );
            }
            if result
                .iter()
                .any(|item: &Shortcut| item.id() == shortcut.id())
            {
                return Err("Cada ação deve usar um atalho diferente.".into());
            }
            result.push(shortcut);
        }
        Ok(result)
    }
}

pub struct ConfigurationLock(pub Mutex<()>);

pub trait ShortcutBackend {
    fn register(&mut self, shortcut: Shortcut) -> Result<(), String>;
    fn unregister(&mut self, shortcut: Shortcut) -> Result<(), String>;
}

struct NativeBackend<'a>(&'a tauri::AppHandle);
impl ShortcutBackend for NativeBackend<'_> {
    fn register(&mut self, shortcut: Shortcut) -> Result<(), String> {
        self.0
            .global_shortcut()
            .register(shortcut)
            .map_err(|error| format!("Não foi possível registrar {shortcut}: {error}"))
    }
    fn unregister(&mut self, shortcut: Shortcut) -> Result<(), String> {
        self.0
            .global_shortcut()
            .unregister(shortcut)
            .map_err(|error| error.to_string())
    }
}

pub fn replace_bindings(
    backend: &mut impl ShortcutBackend,
    current: &[Shortcut],
    next: &[Shortcut],
    save: impl FnOnce() -> Result<(), String>,
) -> Result<(), String> {
    let mut added = Vec::new();
    let mut removed = Vec::new();
    let result = (|| {
        for shortcut in next.iter().filter(|item| !current.contains(item)) {
            backend.register(*shortcut)?;
            added.push(*shortcut);
        }
        for shortcut in current.iter().filter(|item| !next.contains(item)) {
            backend.unregister(*shortcut)?;
            removed.push(*shortcut);
        }
        save()
    })();
    if let Err(error) = result {
        let mut failures = Vec::new();
        for shortcut in added.into_iter().rev() {
            if let Err(error) = backend.unregister(shortcut) {
                failures.push(error);
            }
        }
        for shortcut in removed {
            if let Err(error) = backend.register(shortcut) {
                failures.push(error);
            }
        }
        return Err(if failures.is_empty() {
            error
        } else {
            format!(
                "{error}. Falha ao restaurar atalhos: {}",
                failures.join("; ")
            )
        });
    }
    Ok(())
}

pub fn configure(
    app: &tauri::AppHandle,
    previous: &Hotkeys,
    preferences: &crate::preferences::AppPreferences,
) -> Result<(), String> {
    let next = preferences.hotkeys.bindings()?;
    if previous == &preferences.hotkeys {
        return storage::save_preferences(app, preferences);
    }
    let current = previous
        .bindings()?
        .into_iter()
        .filter(|shortcut| app.global_shortcut().is_registered(*shortcut))
        .collect::<Vec<_>>();
    replace_bindings(&mut NativeBackend(app), &current, &next, || {
        storage::save_preferences(app, preferences)
    })
}

pub fn update_availability(app: &tauri::AppHandle, state: &mut crate::model::AppState) {
    let available = |binding: &Option<String>| {
        binding
            .as_ref()
            .and_then(|value| value.parse::<Shortcut>().ok())
            .is_some_and(|shortcut| app.global_shortcut().is_registered(shortcut))
    };
    state.shortcut_available = available(&state.preferences.hotkeys.lock_overlay);
    state.visibility_shortcut_available = available(&state.preferences.hotkeys.toggle_overlay);
}

pub fn initialize(app: &tauri::AppHandle) -> Result<(), String> {
    let preferences = app
        .state::<SharedState>()
        .lock()
        .map_err(|error| error.to_string())?
        .preferences
        .clone();
    for shortcut in preferences.hotkeys.bindings()? {
        if let Err(error) = NativeBackend(app).register(shortcut) {
            eprintln!("{error}");
        }
    }
    let shared = app.state::<SharedState>();
    let mut state = shared.lock().map_err(|error| error.to_string())?;
    update_availability(app, &mut state);
    Ok(())
}

pub fn handle(app: &tauri::AppHandle, shortcut: &Shortcut, event: ShortcutEvent) {
    if event.state() != ShortcutState::Pressed {
        return;
    }
    let shared = app.state::<SharedState>();
    let mut state = match shared.lock() {
        Ok(state) => state,
        Err(_) => return,
    };
    let matches = |binding: &Option<String>| {
        binding
            .as_ref()
            .and_then(|value| value.parse::<Shortcut>().ok())
            .is_some_and(|value| value.id() == shortcut.id())
    };
    if matches(&state.preferences.hotkeys.lock_overlay) {
        let mut settings = state.settings.clone();
        settings.locked = !settings.locked;
        if let Err(error) = storage::save(app, &settings, &state.detection.config.game_id) {
            eprintln!("{error}");
            return;
        }
        state.settings = settings;
    } else if matches(&state.preferences.hotkeys.toggle_overlay) {
        let Some(current) = &state.current_match else {
            return;
        };
        state.hidden_match_id = if state.hidden_match_id.as_ref() == Some(&current.id) {
            None
        } else {
            Some(current.id.clone())
        };
    } else {
        return;
    }
    if let Err(error) = overlay::synchronize(app, &state, false) {
        eprintln!("{error}");
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashSet;

    #[derive(Default)]
    struct FakeBackend {
        active: HashSet<Shortcut>,
        fail_register: Option<Shortcut>,
        fail_unregister: Option<Shortcut>,
        operations: usize,
    }
    impl ShortcutBackend for FakeBackend {
        fn register(&mut self, shortcut: Shortcut) -> Result<(), String> {
            self.operations += 1;
            if self.fail_register == Some(shortcut) {
                return Err("in use".into());
            }
            self.active.insert(shortcut);
            Ok(())
        }
        fn unregister(&mut self, shortcut: Shortcut) -> Result<(), String> {
            self.operations += 1;
            if self.fail_unregister == Some(shortcut) {
                return Err("unregister failed".into());
            }
            self.active.remove(&shortcut);
            Ok(())
        }
    }
    fn binding(value: &str) -> Shortcut {
        value.parse().unwrap()
    }

    #[test]
    fn defaults_migrate_and_aliases_cannot_assign_the_same_key_twice() {
        let defaults: Hotkeys = serde_json::from_str("{}").unwrap();
        assert_eq!(defaults.bindings().unwrap().len(), 2);
        let duplicate = Hotkeys {
            lock_overlay: Some("Ctrl+Shift+H".into()),
            toggle_overlay: Some("Shift+Control+H".into()),
        };
        assert!(duplicate.bindings().is_err());
        assert!(Hotkeys {
            lock_overlay: Some("H".into()),
            toggle_overlay: None
        }
        .bindings()
        .is_err());
        assert!(Hotkeys {
            lock_overlay: Some("F8".into()),
            toggle_overlay: None
        }
        .bindings()
        .is_ok());
        let disabled: Hotkeys =
            serde_json::from_str(r#"{"lockOverlay":null,"toggleOverlay":null}"#).unwrap();
        assert!(disabled.bindings().unwrap().is_empty());
    }

    #[test]
    fn swapping_actions_reuses_registered_keys_and_disabling_releases_them() {
        let keys = Hotkeys::default().bindings().unwrap();
        let mut backend = FakeBackend {
            active: keys.iter().copied().collect(),
            ..Default::default()
        };
        replace_bindings(&mut backend, &keys, &[keys[1], keys[0]], || Ok(())).unwrap();
        assert_eq!(backend.operations, 0);
        replace_bindings(&mut backend, &keys, &[], || Ok(())).unwrap();
        assert!(backend.active.is_empty());
    }

    #[test]
    fn registration_failure_rolls_back_partial_additions_and_does_not_save() {
        let old = Hotkeys::default().bindings().unwrap();
        let next = [binding("Ctrl+Alt+K"), binding("Ctrl+Alt+J")];
        let original: HashSet<_> = old.iter().copied().collect();
        let mut backend = FakeBackend {
            active: original.clone(),
            fail_register: Some(next[1]),
            ..Default::default()
        };
        let result = replace_bindings(&mut backend, &old, &next, || {
            panic!("Must not persist failed bindings")
        });
        assert!(result.is_err());
        assert_eq!(backend.active, original);
    }

    #[test]
    fn persistence_or_removal_failure_restores_the_original_keys() {
        let old = Hotkeys::default().bindings().unwrap();
        let next = [binding("Ctrl+Alt+K")];
        let original: HashSet<_> = old.iter().copied().collect();
        let mut backend = FakeBackend {
            active: original.clone(),
            ..Default::default()
        };
        assert!(
            replace_bindings(&mut backend, &old, &next, || Err("disk failure".into())).is_err()
        );
        assert_eq!(backend.active, original);
        backend.fail_unregister = Some(old[1]);
        assert!(replace_bindings(&mut backend, &old, &next, || panic!("Must not save")).is_err());
        assert_eq!(backend.active, original);
    }
}
