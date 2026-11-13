pub mod aoe2;
pub mod aoe4;
pub mod local_profile;
pub mod profile;
pub mod sc2;
pub mod session;

pub const AOE2_ID: &str = "aoe2-de";

pub fn supports(game_id: &str) -> bool {
    matches!(game_id, AOE2_ID | "aoe4" | "sc2")
}
