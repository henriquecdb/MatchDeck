# Unit artwork

Transparent unit images and civilization mappings originate from [AoE II Companion](https://github.com/denniske/aoe2companion), revision `797538c97f3cd957bf700b23b90cdaf808e4fa80`.

Unit images are copied without modification from `assets/units/`. Civilization emblems in `public/civilizations/` are copied from `assets/civilizations/de/`. Mappings are derived from `data/src/helper/civs.ts` and `dataset2/src/data/aoe2/civs.data.ts`. Run `scripts/sync-unit-assets.ps1` to reproduce the bundled catalog and both image sets.

Brazilian Portuguese civilization and unit labels in `src/games/aoe2/pt-BR.json` are derived from [AoE2 Tech Tree](https://github.com/SiegeEngineers/aoe2techtree), revision `e56728e76b7d08301fba7b18d5f16bc8554c109a`, matching the `en` and `br` game string tables. HTML line breaks are normalized to spaces. The strings remain game content owned by Microsoft. Run `node scripts/sync-localization.mjs` to reproduce the labels.

Age of Empires II artwork belongs to Microsoft and its respective creators. These game assets are not covered by MatchDeck's own code. See Microsoft's [Game Content Usage Rules](https://www.xbox.com/en-US/developers/rules). MatchDeck is an unofficial project and is not endorsed by Microsoft.
