use super::{
    catalog,
    response::{MatchFeed, RemoteMatch, RemoteProfile},
};
use crate::{
    detection::model::Profile,
    model::{MatchMode, MatchSnapshot, MatchSource, Player},
};
use chrono::Utc;
use futures_util::future::join_all;
use reqwest::Client;
use serde::de::DeserializeOwned;
use std::time::Duration;

const COMPANION: &str = "https://data.aoe2companion.com/api";

#[derive(Clone)]
pub struct Aoe2Provider {
    client: Client,
}

impl Aoe2Provider {
    pub fn new() -> Result<Self, String> {
        let client = Client::builder()
            .timeout(Duration::from_secs(15))
            .user_agent(concat!(
                "MatchDeck/",
                env!("CARGO_PKG_VERSION"),
                " (https://github.com/henriquecdb/MatchDeck)"
            ))
            .build()
            .map_err(|error| error.to_string())?;
        Ok(Self { client })
    }

    async fn get<T: DeserializeOwned>(
        &self,
        url: &str,
        query: &[(&str, String)],
    ) -> Result<T, String> {
        self.client
            .get(url)
            .query(query)
            .send()
            .await
            .map_err(|_| "Não foi possível conectar à fonte AoE2".to_string())?
            .error_for_status()
            .map_err(|error| {
                format!(
                    "Fonte AoE2 retornou erro HTTP: {}",
                    error.status().map(|status| status.as_u16()).unwrap_or(0)
                )
            })?
            .json()
            .await
            .map_err(|error| format!("A fonte AoE2 retornou dados incompatíveis: {error}"))
    }

    pub async fn resolve_profile(&self, input: &str) -> Result<Profile, String> {
        let input = input.trim();
        if input.is_empty() || !input.bytes().all(|byte| byte.is_ascii_digit()) {
            return Err("Informe o Profile ID numérico do AoE2 ou o Steam ID de 17 dígitos".into());
        }
        let profile_id = if input.len() == 17 {
            let response: serde_json::Value = self
                .get(
                    "https://aoe-api.worldsedgelink.com/community/leaderboard/getpersonalstat",
                    &[
                        ("title", "age2".into()),
                        (
                            "profile_names",
                            serde_json::to_string(&[format!("/steam/{input}")]).unwrap(),
                        ),
                    ],
                )
                .await?;
            if response["result"]["code"].as_u64() != Some(0) {
                return Err("Não foi possível resolver o perfil Steam".into());
            }
            response["statGroups"]
                .as_array()
                .into_iter()
                .flatten()
                .flat_map(|group| group["members"].as_array().into_iter().flatten())
                .find_map(|member| member["profile_id"].as_u64())
                .ok_or("Não foi encontrado perfil AoE2 para este Steam ID")?
        } else {
            input.parse::<u64>().map_err(|_| "Profile ID inválido")?
        };
        if profile_id == 0 {
            return Err("Profile ID inválido".into());
        }
        let profile: RemoteProfile = self
            .get(&format!("{COMPANION}/profiles/{profile_id}"), &[])
            .await?;
        if profile.profile_id != profile_id {
            return Err("A fonte retornou um perfil diferente do solicitado".into());
        }
        Ok(Profile {
            profile_id,
            name: profile.name,
        })
    }

    pub async fn local_profile(&self) -> Result<Profile, String> {
        let home = std::env::var_os("USERPROFILE").ok_or("Pasta do usuário não encontrada")?;
        let directory = std::path::PathBuf::from(home)
            .join("Games")
            .join("Age of Empires 2 DE");
        let candidates: Vec<String> = std::fs::read_dir(directory)
            .map_err(|_| "Pasta local do AoE2 não encontrada; informe o ID manualmente")?
            .filter_map(Result::ok)
            .filter(|entry| entry.path().is_dir())
            .filter_map(|entry| entry.file_name().into_string().ok())
            .filter(|name| name.len() == 17 && name.bytes().all(|byte| byte.is_ascii_digit()))
            .collect();
        if candidates.len() != 1 {
            return Err(
                "Não foi encontrado um único perfil Steam local; informe o ID manualmente".into(),
            );
        }
        self.resolve_profile(&candidates[0]).await
    }

    pub async fn matches(&self, profile_id: u64) -> Result<MatchFeed, String> {
        self.get(
            &format!("{COMPANION}/matches"),
            &[("profile_ids", profile_id.to_string())],
        )
        .await
    }

    pub async fn profile_overview(
        &self,
        profile_id: u64,
    ) -> Result<super::profile::ProfileOverview, String> {
        let url = format!("{COMPANION}/profiles/{profile_id}");
        let (profile, feed) = tokio::try_join!(
            self.get::<RemoteProfile>(&url, &[]),
            self.matches(profile_id)
        )?;
        if profile.profile_id != profile_id {
            return Err("A fonte retornou um perfil diferente do solicitado".into());
        }
        Ok(super::profile::overview(profile, feed))
    }

    pub async fn snapshot(&self, remote: &RemoteMatch) -> MatchSnapshot {
        let queue = remote.leaderboard.as_deref();
        let results = join_all(
            remote
                .teams
                .iter()
                .flat_map(|team| {
                    team.players
                        .iter()
                        .map(move |player| (team.team_id, player))
                })
                .enumerate()
                .map(|(index, (team_id, player))| async move {
                    let mut warning = None;
                    let stats = if let (Some(id), Some(queue)) = (player.human_profile_id(), queue)
                    {
                        match self
                            .get::<RemoteProfile>(&format!("{COMPANION}/profiles/{id}"), &[])
                            .await
                        {
                            Ok(profile) if profile.profile_id == id => profile
                                .leaderboards
                                .into_iter()
                                .find(|board| board.leaderboard_id == queue),
                            _ => {
                                warning = Some(format!(
                                    "Estatísticas indisponíveis para {}",
                                    player.name
                                ));
                                None
                            }
                        }
                    } else {
                        None
                    };
                    let units = catalog::unique_units(player.civ.as_deref().unwrap_or(""));
                    (
                        Player {
                            rank: None,
                            rank_level: None,
                            mmr: None,
                            id: player
                                .human_profile_id()
                                .map(|id| id.to_string())
                                .unwrap_or_else(|| format!("slot-{index}")),
                            name: player.name.clone(),
                            civilization: player
                                .civ_name
                                .clone()
                                .unwrap_or_else(|| "Civilização indisponível".into()),
                            unique_units: units,
                            symbol: "⚔".into(),
                            team_id: team_id.filter(|id| *id > 0),
                            civilization_id: player.civ.clone(),
                            color: player.color,
                            color_hex: player.color_hex.clone(),
                            rating: player
                                .rating
                                .or_else(|| stats.as_ref().and_then(|board| board.rating)),
                            wins: stats.as_ref().and_then(|board| board.wins),
                            losses: stats.as_ref().and_then(|board| board.losses),
                            rating_change: if remote.is_finished() {
                                player.rating_diff
                            } else {
                                None
                            },
                            won: if remote.is_finished() {
                                player.won
                            } else {
                                None
                            },
                        },
                        warning,
                    )
                }),
        )
        .await;
        let (players, warnings): (Vec<_>, Vec<_>) = results.into_iter().unzip();
        MatchSnapshot {
            id: format!("aoe2-{}", remote.match_id),
            game_id: "aoe2-de".into(),
            mode: if queue.is_some_and(|queue| {
                matches!(
                    queue,
                    "rm_1v1" | "rm_team" | "ew_1v1" | "ew_team" | "dm_1v1" | "dm_team"
                )
            }) {
                MatchMode::Ranked
            } else if queue.is_some_and(|queue| queue.starts_with("qp_")) {
                MatchMode::Quick
            } else {
                MatchMode::Custom
            },
            map: remote
                .map_name
                .clone()
                .unwrap_or_else(|| "Mapa indisponível".into()),
            source: MatchSource::Live,
            players,
            queue: remote
                .leaderboard_name
                .clone()
                .or_else(|| remote.leaderboard.clone()),
            warnings: warnings.into_iter().flatten().collect(),
            synced_at: Some(now().to_rfc3339()),
            replay_of: None,
            queue_id: remote.leaderboard.clone(),
            finished_at: remote.finished.as_str().map(str::to_owned),
            self_player_id: None,
        }
    }
}

pub fn now() -> chrono::DateTime<Utc> {
    Utc::now()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    #[ignore = "requires public AoE2 APIs"]
    async fn live_api_smoke_test() {
        let provider = Aoe2Provider::new().unwrap();
        let input = std::env::var("MATCHDECK_TEST_PROFILE").unwrap_or_else(|_| "199325".into());
        let profile = provider.resolve_profile(&input).await.unwrap();
        assert_eq!(profile.profile_id.to_string(), input);
        let feed = provider.matches(profile.profile_id).await.unwrap();
        assert!(!feed.matches.is_empty());
        let snapshot = provider.snapshot(&feed.matches[0]).await;
        assert!(!snapshot.players.is_empty());
        assert!(snapshot.players.iter().all(|player| player.wins.is_some()));
    }
}
