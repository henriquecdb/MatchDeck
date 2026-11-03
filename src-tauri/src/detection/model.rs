use serde::{Deserialize, Serialize};

#[derive(Clone, Default, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Profile {
    pub profile_id: u64,
    pub name: String,
}

#[derive(Clone, Default, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct DetectionConfig {
    pub enabled: bool,
    pub profile: Option<Profile>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DetectionStatus {
    pub config: DetectionConfig,
    pub phase: String,
    pub message: String,
    pub last_checked: Option<String>,
    pub failures: u32,
}

impl Default for DetectionStatus {
    fn default() -> Self {
        Self {
            config: DetectionConfig::default(),
            phase: "disabled".into(),
            message: "Detecção desativada".into(),
            last_checked: None,
            failures: 0,
        }
    }
}

pub fn retry_delay(failures: u32) -> u64 {
    if failures == 0 {
        20
    } else {
        (20_u64 * 2_u64.pow(failures.min(3))).min(120)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn retries_back_off_with_a_cap() {
        assert_eq!(retry_delay(0), 20);
        assert_eq!(retry_delay(1), 40);
        assert_eq!(retry_delay(20), 120);
    }
}
