use std::{
    collections::BTreeSet,
    path::{Path, PathBuf},
};

pub fn document_roots(primary: PathBuf) -> Vec<PathBuf> {
    let mut roots = vec![primary];
    if let Some(home) = std::env::var_os("USERPROFILE") {
        let legacy = PathBuf::from(home).join("Documents");
        if legacy.is_absolute() && !roots.contains(&legacy) {
            roots.push(legacy);
        }
    }
    roots
}

pub(crate) fn directories(path: &Path) -> Result<Vec<String>, String> {
    let entries = match std::fs::read_dir(path) {
        Ok(entries) => entries,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(vec![]),
        Err(_) => return Err("Não foi possível ler os perfis locais do jogo.".into()),
    };
    let mut names = Vec::new();
    for (count, entry) in entries.enumerate() {
        if count >= 256 {
            return Err("Muitos diretórios de perfil. Informe o ID ou link manualmente.".into());
        }
        let entry = entry.map_err(|_| "Não foi possível ler os perfis locais do jogo.")?;
        let kind = entry
            .file_type()
            .map_err(|_| "Não foi possível ler os perfis locais do jogo.")?;
        if kind.is_dir() && !kind.is_symlink() {
            if let Some(name) = entry.file_name().to_str() {
                names.push(name.into());
            }
        }
    }
    Ok(names)
}

fn unique(candidates: BTreeSet<String>) -> Result<String, String> {
    match candidates.len() {
        0 => {
            Err("Nenhum perfil local compatível encontrado. Informe o ID ou link do perfil.".into())
        }
        1 => Ok(candidates.into_iter().next().unwrap()),
        _ => Err(
            "Mais de um perfil local encontrado. Informe o ID ou link do perfil desejado.".into(),
        ),
    }
}

pub fn aoe4(roots: &[PathBuf]) -> Result<String, String> {
    let mut candidates = BTreeSet::new();
    for root in roots {
        let users = root
            .join("My Games")
            .join("Age of Empires IV")
            .join("Users");
        for name in directories(&users)? {
            if name.len() == 17
                && name.bytes().all(|byte| byte.is_ascii_digit())
                && name.parse::<u64>().is_ok_and(|id| id > 0)
            {
                candidates.insert(name);
            }
        }
    }
    unique(candidates)
}

pub fn sc2(roots: &[PathBuf]) -> Result<String, String> {
    let mut candidates = BTreeSet::new();
    for root in roots {
        let accounts = root.join("StarCraft II").join("Accounts");
        for account in directories(&accounts)? {
            if account.is_empty() || !account.bytes().all(|byte| byte.is_ascii_digit()) {
                continue;
            }
            for name in directories(&accounts.join(&account))? {
                if let Some(handle) = sc2_handle(&name) {
                    candidates.insert(handle);
                }
            }
        }
    }
    unique(candidates)
}

pub fn sc2_handle(value: &str) -> Option<String> {
    let parts: Vec<_> = value.split('-').collect();
    if parts.len() != 4 || parts[1] != "S2" {
        return None;
    }
    if [parts[0], parts[2], parts[3]]
        .iter()
        .any(|value| value.is_empty() || !value.bytes().all(|b| b.is_ascii_digit()))
    {
        return None;
    }
    let region: u32 = parts[0].parse().ok()?;
    let realm: u32 = parts[2].parse().ok()?;
    let id: u64 = parts[3].parse().ok()?;
    ([1, 2, 3, 5].contains(&region) && (1..=2).contains(&realm) && id > 0)
        .then(|| format!("{region}-S2-{realm}-{id}"))
}

pub fn sc2_profile_url(handle: &str) -> Option<String> {
    let handle = sc2_handle(handle)?;
    let parts: Vec<_> = handle.split('-').collect();
    Some(format!(
        "https://starcraft2.blizzard.com/en-us/profile/{}/{}/{}",
        parts[0], parts[2], parts[3]
    ))
}

#[cfg(test)]
mod tests {
    use super::*;
    struct Fixture(PathBuf);
    impl Fixture {
        fn new() -> Self {
            let path = std::env::temp_dir().join(format!(
                "matchdeck-profile-test-{}-{}",
                std::process::id(),
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_nanos()
            ));
            std::fs::create_dir(&path).unwrap();
            Self(path)
        }
        fn folder(&self, path: &str) {
            std::fs::create_dir_all(self.0.join(path)).unwrap();
        }
    }
    impl Drop for Fixture {
        fn drop(&mut self) {
            if let (Ok(path), Ok(root)) =
                (self.0.canonicalize(), std::env::temp_dir().canonicalize())
            {
                if path.starts_with(root)
                    && path.file_name().is_some_and(|name| {
                        name.to_string_lossy()
                            .starts_with("matchdeck-profile-test-")
                    })
                {
                    let _ = std::fs::remove_dir_all(path);
                }
            }
        }
    }
    #[test]
    fn finds_steam_profiles_under_redirected_documents_and_deduplicates_copies() {
        let fixture = Fixture::new();
        fixture.folder("OneDrive/Documentos/My Games/Age of Empires IV/Users/76561198000000042");
        fixture.folder("Documents/My Games/Age of Empires IV/Users/76561198000000042");
        fixture.folder("OneDrive/Documentos/My Games/Age of Empires IV/Users/cache");
        let roots = [
            fixture.0.join("OneDrive/Documentos"),
            fixture.0.join("Documents"),
        ];
        assert_eq!(aoe4(&roots).unwrap(), "76561198000000042");
        fixture.folder("Documents/My Games/Age of Empires IV/Users/76561198000000043");
        assert!(aoe4(&roots).unwrap_err().contains("Mais de um"));
    }
    #[test]
    fn finds_sc2_character_handles_without_confusing_them_with_account_ids() {
        let fixture = Fixture::new();
        fixture.folder("StarCraft II/Accounts/999999/1-S2-2-42");
        fixture.folder("StarCraft II/Accounts/999999/Hotkeys");
        fixture.folder("StarCraft II/Accounts/Hotkeys/2-S2-1-44");
        let roots = [fixture.0.clone()];
        assert_eq!(sc2(&roots).unwrap(), "1-S2-2-42");
        assert_eq!(
            sc2_profile_url("1-S2-2-42").unwrap(),
            "https://starcraft2.blizzard.com/en-us/profile/1/2/42"
        );
        fixture.folder("StarCraft II/Accounts/888888/2-S2-1-43");
        assert!(sc2(&roots).unwrap_err().contains("Mais de um"));
    }
    #[test]
    fn missing_profiles_and_invalid_handles_are_not_guessed() {
        let fixture = Fixture::new();
        assert!(aoe4(std::slice::from_ref(&fixture.0)).is_err());
        assert!(sc2(std::slice::from_ref(&fixture.0)).is_err());
        for value in [
            "../1-S2-1-42",
            "1-S2-2-0",
            "9-S2-1-42",
            "1-S2-3-42",
            "+1-S2-1-42",
            "1-S2-1-42-extra",
        ] {
            assert!(sc2_handle(value).is_none());
        }
    }

    #[tokio::test]
    #[ignore = "requires public AoE4 World and SC2 Pulse APIs"]
    async fn live_local_resolution_smoke_test() {
        let fixture = Fixture::new();
        fixture.folder("My Games/Age of Empires IV/Users/76561198325518070");
        fixture.folder("StarCraft II/Accounts/999999/2-S2-1-3141896");
        let age4 = crate::games::aoe4::provider::Aoe4Provider::new()
            .unwrap()
            .local_profile(std::slice::from_ref(&fixture.0))
            .await
            .unwrap();
        assert!(age4.profile_id > 0);
        assert_ne!(age4.profile_id.to_string(), "76561198325518070");
        assert!(!age4.name.is_empty());
        let sc2 = crate::games::sc2::provider::Sc2Provider::new()
            .unwrap()
            .local_profile(std::slice::from_ref(&fixture.0))
            .await
            .unwrap();
        assert_eq!(sc2.profile_id, 235030);
        assert!(!sc2.name.is_empty());
    }
}
