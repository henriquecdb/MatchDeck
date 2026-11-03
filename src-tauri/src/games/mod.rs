pub mod aoe2;

pub const AOE2_ID: &str = "aoe2-de";

pub fn supports(game_id: &str) -> bool {
    game_id == AOE2_ID
}
