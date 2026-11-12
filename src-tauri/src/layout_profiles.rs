use crate::{commands::SharedState, model::OverlaySettings, storage};
use serde::{Deserialize, Serialize};
use tauri::{Manager, State};

#[derive(Clone, Deserialize, Serialize)]
pub struct LayoutProfile {
    id: String,
    name: String,
    settings: OverlaySettings,
}
#[derive(Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ProfileAction {
    Read,
    Save,
    Delete,
}

fn update(
    profiles: &mut Vec<LayoutProfile>,
    action: ProfileAction,
    id: Option<String>,
    name: Option<String>,
    settings: Option<OverlaySettings>,
) -> Result<(), String> {
    match action {
        ProfileAction::Read => {}
        ProfileAction::Delete => {
            let id = id.ok_or("Selecione um perfil de layout.")?;
            let index = profiles
                .iter()
                .position(|p| p.id == id)
                .ok_or("Perfil de layout não encontrado.")?;
            profiles.remove(index);
        }
        ProfileAction::Save => {
            let name = name.unwrap_or_default().trim().to_owned();
            if name.is_empty() || name.chars().count() > 32 {
                return Err("Use um nome de 1 a 32 caracteres.".into());
            }
            if profiles
                .iter()
                .any(|p| p.name.to_lowercase() == name.to_lowercase() && Some(&p.id) != id.as_ref())
            {
                return Err("Já existe um perfil com esse nome.".into());
            }
            let settings = settings
                .ok_or("Configuração de layout ausente.")?
                .normalize();
            if let Some(id) = id {
                let profile = profiles
                    .iter_mut()
                    .find(|p| p.id == id)
                    .ok_or("Perfil de layout não encontrado.")?;
                profile.name = name;
                profile.settings = settings;
            } else {
                if profiles.len() >= 12 {
                    return Err("Limite de 12 perfis por jogo.".into());
                }
                profiles.push(LayoutProfile {
                    id: chrono::Utc::now()
                        .timestamp_nanos_opt()
                        .ok_or("Falha ao criar perfil.")?
                        .to_string(),
                    name,
                    settings,
                });
            }
        }
    }
    Ok(())
}

#[tauri::command]
pub fn layout_profiles(
    app: tauri::AppHandle,
    state: State<'_, SharedState>,
    game_id: String,
    action: ProfileAction,
    id: Option<String>,
    name: Option<String>,
    settings: Option<OverlaySettings>,
) -> Result<Vec<LayoutProfile>, String> {
    let state = state.lock().map_err(|e| e.to_string())?;
    if !crate::games::supports(&game_id) || state.detection.config.game_id != game_id {
        return Err("O jogo foi alterado; tente novamente".into());
    }
    let path = app
        .path()
        .app_config_dir()
        .map_err(|e| e.to_string())?
        .join("games")
        .join(&game_id)
        .join("layout-profiles.json");
    let mut profiles: Vec<LayoutProfile> = match std::fs::read(path) {
        Ok(bytes) => serde_json::from_slice(&bytes).map_err(|_| {
            "Arquivo de perfis de layout inválido. O original foi preservado.".to_string()
        })?,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => vec![],
        Err(error) => return Err(error.to_string()),
    };
    let read = matches!(action, ProfileAction::Read);
    update(&mut profiles, action, id, name, settings)?;
    if !read {
        storage::write_game(&app, "layout-profiles.json", &profiles, &game_id)?;
    }
    Ok(profiles)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn profiles_keep_saved_settings_and_validate_update_delete_and_duplicate_names() {
        let mut profiles = vec![];
        let settings = OverlaySettings {
            x: -1200,
            scale: 1.2,
            show_session: false,
            ..Default::default()
        };
        update(
            &mut profiles,
            ProfileAction::Save,
            None,
            Some(" Compacto ".into()),
            Some(settings),
        )
        .unwrap();
        assert_eq!(profiles[0].settings.x, -1200);
        assert!(!profiles[0].settings.show_session);
        assert!(update(
            &mut profiles,
            ProfileAction::Save,
            None,
            Some("compacto".into()),
            Some(OverlaySettings::default())
        )
        .is_err());
        let id = profiles[0].id.clone();
        update(
            &mut profiles,
            ProfileAction::Save,
            Some(id.clone()),
            Some("Detalhado".into()),
            Some(OverlaySettings::default()),
        )
        .unwrap();
        assert_eq!(profiles.len(), 1);
        assert_eq!(profiles[0].settings.scale, 1.0);
        update(&mut profiles, ProfileAction::Delete, Some(id), None, None).unwrap();
        assert!(profiles.is_empty());
    }
}
