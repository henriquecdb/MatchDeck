use serde::Deserialize;
use std::{collections::HashMap, sync::OnceLock};

#[derive(Deserialize)]
struct Civilization {
    units: Vec<String>,
}

pub fn unique_units(civilization: &str) -> Vec<String> {
    static CATALOG: OnceLock<HashMap<String, Civilization>> = OnceLock::new();
    CATALOG
        .get_or_init(|| {
            serde_json::from_str(include_str!("../../../../src/games/aoe2/unit-catalog.json"))
                .expect("Catálogo de unidades inválido")
        })
        .get(civilization)
        .map(|entry| entry.units.clone())
        .unwrap_or_default()
}
