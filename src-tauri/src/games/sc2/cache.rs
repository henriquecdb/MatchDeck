use super::{
    provider::region_id,
    response::{Character, Team},
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    future::Future,
    path::PathBuf,
    sync::{Arc, Mutex},
    time::Instant,
};
use tokio::sync::Mutex as AsyncMutex;

const CAPACITY: usize = 32;
const MAX_AGE_SECONDS: i64 = 24 * 60 * 60;

#[derive(Clone, Deserialize, Serialize)]
pub struct PlayerData {
    pub character: Character,
    pub teams: Vec<Team>,
    pub fetched_at: DateTime<Utc>,
    #[serde(skip)]
    pub stale: bool,
}

impl PlayerData {
    pub fn fresh(&self) -> bool {
        (0..60).contains(
            &Utc::now()
                .signed_duration_since(self.fetched_at)
                .num_seconds(),
        )
    }

    pub fn usable(&self, id: u64) -> bool {
        self.character.id == id
            && CharacterIdentity::from_character(&self.character).is_some()
            && (0..MAX_AGE_SECONDS).contains(
                &Utc::now()
                    .signed_duration_since(self.fetched_at)
                    .num_seconds(),
            )
    }
}

#[derive(Clone, Deserialize, Serialize)]
pub struct CharacterIdentity {
    pub region: String,
    realm: u32,
    battlenet_id: u64,
}

impl CharacterIdentity {
    pub fn from_character(character: &Character) -> Option<Self> {
        (character.id > 0
            && region_id(&character.region).is_some()
            && (1..=2).contains(&character.realm)
            && character.battlenet_id > 0)
            .then(|| Self {
                region: character.region.clone(),
                realm: character.realm,
                battlenet_id: character.battlenet_id,
            })
    }

    fn valid(&self) -> bool {
        region_id(&self.region).is_some() && (1..=2).contains(&self.realm) && self.battlenet_id > 0
    }

    pub fn handle(&self) -> String {
        format!(
            "{}-S2-{}-{}",
            region_id(&self.region).unwrap_or(0),
            self.realm,
            self.battlenet_id
        )
    }
}

struct CacheEntry {
    data: Option<PlayerData>,
    retry_after: Option<Instant>,
}

struct Slot {
    entry: Arc<AsyncMutex<CacheEntry>>,
    last_used: Instant,
}

#[derive(Default, Deserialize, Serialize)]
struct DiskCache {
    players: HashMap<u64, PlayerData>,
    identities: HashMap<u64, CharacterIdentity>,
}

#[derive(Default)]
pub struct PlayerCache {
    slots: AsyncMutex<HashMap<u64, Slot>>,
    disk: Mutex<DiskCache>,
    directory: Option<PathBuf>,
}

impl PlayerCache {
    pub fn open(directory: PathBuf) -> Self {
        let path = directory.join("pulse-cache.json");
        let loaded: Option<DiskCache> = std::fs::metadata(&path)
            .ok()
            .filter(|metadata| metadata.len() <= 8 * 1024 * 1024)
            .and_then(|_| std::fs::read(path).ok())
            .and_then(|bytes| serde_json::from_slice(&bytes).ok());
        let was_loaded = loaded.is_some();
        let mut disk = loaded.unwrap_or_default();
        disk.players.retain(|id, data| data.usable(*id));
        disk.identities
            .retain(|id, identity| *id > 0 && identity.valid());
        trim_players(&mut disk.players);
        for data in disk.players.values_mut() {
            data.teams =
                super::provider::latest_teams(std::mem::take(&mut data.teams), &data.character);
        }
        let slots = disk
            .players
            .iter()
            .map(|(id, data)| {
                (
                    *id,
                    Slot {
                        entry: Arc::new(AsyncMutex::new(CacheEntry {
                            data: Some(data.clone()),
                            retry_after: None,
                        })),
                        last_used: Instant::now(),
                    },
                )
            })
            .collect();
        let cache = Self {
            slots: AsyncMutex::new(slots),
            disk: Mutex::new(disk),
            directory: Some(directory),
        };
        if was_loaded {
            if let Ok(disk) = cache.disk.lock() {
                cache.persist(&disk);
            }
        }
        cache
    }

    async fn entry(&self, id: u64) -> Arc<AsyncMutex<CacheEntry>> {
        let mut slots = self.slots.lock().await;
        if slots.len() >= CAPACITY && !slots.contains_key(&id) {
            let oldest = slots
                .iter()
                .filter(|(_, slot)| Arc::strong_count(&slot.entry) == 1)
                .min_by_key(|(_, slot)| slot.last_used)
                .map(|(id, _)| *id);
            if let Some(oldest) = oldest {
                slots.remove(&oldest);
            }
        }
        let slot = slots.entry(id).or_insert_with(|| {
            let data = self.disk.lock().ok().and_then(|disk| {
                disk.players
                    .get(&id)
                    .filter(|data| data.usable(id))
                    .cloned()
            });
            Slot {
                entry: Arc::new(AsyncMutex::new(CacheEntry {
                    data,
                    retry_after: None,
                })),
                last_used: Instant::now(),
            }
        });
        slot.last_used = Instant::now();
        slot.entry.clone()
    }

    pub async fn load(
        &self,
        id: u64,
        refresh: bool,
        fetch: impl Future<Output = Result<PlayerData, String>>,
    ) -> Result<PlayerData, String> {
        let requested_at = Utc::now();
        let slot = self.entry(id).await;
        let mut entry = slot.lock().await;
        if let Some(data) = &entry.data {
            if data.usable(id) && ((!refresh && data.fresh()) || data.fetched_at >= requested_at) {
                return Ok(data.clone());
            }
        }
        let waiting = entry
            .retry_after
            .is_some_and(|until| until > Instant::now());
        let result = if waiting {
            Err("SC2 Pulse ocupado; tente novamente em instantes.".into())
        } else {
            fetch.await.and_then(|data| {
                if data.usable(id) {
                    Ok(data)
                } else {
                    Err("A fonte retornou um perfil diferente do solicitado".into())
                }
            })
        };
        match result {
            Ok(data) => {
                entry.data = Some(data.clone());
                entry.retry_after = None;
                self.save(&data);
                Ok(data)
            }
            Err(error) => {
                if !waiting {
                    entry.retry_after = Some(Instant::now() + std::time::Duration::from_secs(15));
                }
                if let Some(data) = entry.data.as_ref().filter(|data| data.usable(id)) {
                    let mut cached = data.clone();
                    cached.stale = true;
                    Ok(cached)
                } else {
                    Err(error)
                }
            }
        }
    }

    pub fn identity(&self, id: u64) -> Option<CharacterIdentity> {
        self.disk.lock().ok()?.identities.get(&id).cloned()
    }

    pub fn profile(&self, id: u64) -> Option<crate::detection::model::Profile> {
        let disk = self.disk.lock().ok()?;
        disk.identities.get(&id)?;
        let name = disk
            .players
            .get(&id)
            .filter(|data| data.usable(id))
            .map(|data| data.character.profile_name())
            .unwrap_or_else(|| format!("SC2 #{id}"));
        Some(crate::detection::model::Profile {
            profile_id: id,
            name,
        })
    }

    pub fn remember_character(&self, character: &Character) {
        let Some(identity) = CharacterIdentity::from_character(character) else {
            return;
        };
        if let Ok(mut disk) = self.disk.lock() {
            disk.identities.insert(character.id, identity);
            self.persist(&disk);
        }
    }

    pub fn save(&self, data: &PlayerData) {
        if let Ok(mut disk) = self.disk.lock() {
            disk.players.retain(|id, saved| saved.usable(*id));
            disk.players.insert(data.character.id, data.clone());
            trim_players(&mut disk.players);
            self.persist(&disk);
        }
    }

    fn persist(&self, disk: &DiskCache) {
        if let Some(directory) = &self.directory {
            if let Err(error) = crate::storage::write_atomic(directory, "pulse-cache.json", disk) {
                eprintln!("Não foi possível salvar o cache SC2: {error}");
            }
        }
    }
}

fn trim_players(players: &mut HashMap<u64, PlayerData>) {
    while players.len() > CAPACITY {
        let oldest = players
            .iter()
            .min_by_key(|(_, data)| data.fetched_at)
            .map(|(id, _)| *id);
        if let Some(oldest) = oldest {
            players.remove(&oldest);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicUsize, Ordering};

    #[test]
    fn opening_an_invalid_cache_preserves_the_original_file_for_recovery() {
        let directory = std::env::temp_dir().join(format!(
            "matchdeck-cache-invalid-{}-{}",
            std::process::id(),
            Utc::now().timestamp_nanos_opt().unwrap()
        ));
        std::fs::create_dir_all(&directory).unwrap();
        let path = directory.join("pulse-cache.json");
        std::fs::write(&path, b"{incomplete").unwrap();
        let cache = PlayerCache::open(directory.clone());
        assert!(cache.identity(42).is_none());
        assert_eq!(std::fs::read(&path).unwrap(), b"{incomplete");
        std::fs::remove_file(path).unwrap();
        std::fs::remove_dir(directory).unwrap();
    }

    #[tokio::test]
    async fn concurrent_refreshes_share_one_fetch_and_errors_back_off_with_the_last_valid_data() {
        let cache = PlayerCache::default();
        let calls = AtomicUsize::new(0);
        let fetch = || async {
            calls.fetch_add(1, Ordering::Relaxed);
            tokio::time::sleep(std::time::Duration::from_millis(25)).await;
            Ok(PlayerData {
                character: Character {
                    id: 42,
                    name: "Nova".into(),
                    region: "US".into(),
                    realm: 1,
                    battlenet_id: 900,
                },
                teams: vec![],
                fetched_at: Utc::now(),
                stale: false,
            })
        };
        let (a, b) = tokio::join!(cache.load(42, true, fetch()), cache.load(42, true, fetch()));
        assert_eq!(calls.load(Ordering::Relaxed), 1);
        assert_eq!(a.unwrap().fetched_at, b.unwrap().fetched_at);
        let slot = cache.entry(42).await;
        slot.lock().await.data.as_mut().unwrap().fetched_at -= chrono::Duration::minutes(2);
        let offline = || async {
            calls.fetch_add(1, Ordering::Relaxed);
            Err("Offline".into())
        };
        assert!(cache.load(42, false, offline()).await.unwrap().stale);
        assert!(cache.load(42, true, offline()).await.unwrap().stale);
        assert_eq!(calls.load(Ordering::Relaxed), 2);
        assert!(cache.load(99, false, offline()).await.is_err());
    }

    #[tokio::test]
    async fn an_evicted_memory_entry_reuses_the_remaining_persisted_statistics() {
        let cache = PlayerCache::default();
        for id in 1..=32 {
            cache.save(&PlayerData {
                character: Character {
                    id,
                    name: "Nova".into(),
                    region: "US".into(),
                    realm: 1,
                    battlenet_id: id,
                },
                teams: vec![],
                fetched_at: Utc::now() - chrono::Duration::seconds(100 - id as i64),
                stale: false,
            });
            drop(cache.entry(id).await);
        }
        drop(cache.entry(1).await);
        drop(cache.entry(33).await);
        assert!(!cache.slots.lock().await.contains_key(&2));
        let recovered = cache.entry(2).await;
        assert_eq!(
            recovered.lock().await.data.as_ref().unwrap().character.id,
            2
        );
        assert_eq!(cache.slots.lock().await.len(), 32);
    }

    #[test]
    fn cached_statistics_reject_wrong_characters_future_dates_and_expired_records() {
        let mut data = PlayerData {
            character: Character {
                id: 42,
                name: "Nova#123".into(),
                region: "US".into(),
                realm: 1,
                battlenet_id: 900,
            },
            teams: vec![],
            fetched_at: Utc::now(),
            stale: false,
        };
        assert!(data.fresh() && data.usable(42));
        assert!(!data.usable(99));
        data.fetched_at = Utc::now() - chrono::Duration::minutes(2);
        assert!(!data.fresh());
        assert!(data.usable(42));
        data.fetched_at = Utc::now() - chrono::Duration::days(2);
        assert!(!data.usable(42));
        data.fetched_at = Utc::now() + chrono::Duration::hours(1);
        assert!(!data.usable(42));
        data.fetched_at = Utc::now();
        data.character.realm = 3;
        assert!(!data.usable(42));
    }
}
