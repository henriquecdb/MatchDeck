use crate::preferences::InterfaceLanguage;
use std::{collections::HashMap, sync::OnceLock};

pub fn text(language: InterfaceLanguage, message: &str) -> String {
    static ENGLISH: OnceLock<HashMap<String, String>> = OnceLock::new();
    if language == InterfaceLanguage::English {
        return ENGLISH
            .get_or_init(|| {
                serde_json::from_str(include_str!("../../src/i18n/en.json"))
                    .expect("Invalid bundled English translations")
            })
            .get(message)
            .map(String::as_str)
            .unwrap_or(message)
            .to_owned();
    }
    message.to_owned()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tray_labels_use_the_same_catalog_as_the_interface() {
        assert_eq!(
            text(InterfaceLanguage::English, "Ativar/desativar detecção"),
            "Toggle detection"
        );
        assert_eq!(
            text(InterfaceLanguage::Portuguese, "Ativar/desativar detecção"),
            "Ativar/desativar detecção"
        );
        assert_eq!(text(InterfaceLanguage::English, "MatchDeck"), "MatchDeck");
    }
}
