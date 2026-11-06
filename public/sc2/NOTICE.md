# StarCraft II integration

The traditional StarCraft II icon in public/games/sc2.png was extracted from the locally installed StarCraft II.exe, icon index 0, at 256 × 256. It is Blizzard Entertainment artwork and is not covered by MatchDeck’s MIT license. The Terran, Protoss, Zerg and Random emblems in public/sc2/races/*.png are StarCraft artwork belonging to Blizzard Entertainment and are not covered by MatchDeck’s MIT license. Source copies: https://github.com/teampheenix/StarCraft-Casting-Tool/tree/6f5cbb5c0e3847c00f2714467df1d4f410b5c82a/casting_html/src/img/races (Terran.png, Protoss.png, Zerg.png, Random.png). These PNG files are bundled unchanged; no source code from that project is included. The unknown-race SVG remains an original MatchDeck placeholder.

StarCraft and Battle.net trademarks belong to Blizzard Entertainment. MatchDeck is an independent project, not endorsed by Blizzard or SC2 Pulse.

Statistics are fetched from the public SC2 Pulse API: https://sc2pulse.nephest.com/sc2/ . Endpoint contracts: https://sc2pulse.nephest.com/sc2/v3/api-docs . The integration does not bundle SC2 Pulse implementation code. Local match detection uses the game client HTTP API on 127.0.0.1:6119; no process memory access, game injection or automated game actions.

Replay protocol schema Base98310 is derived from Blizzard/s2protocol (MIT): https://github.com/Blizzard/s2protocol/blob/master/s2protocol/versions/protocol98310.py . Copyright (c) Blizzard Entertainment; license preserved at src-tauri/src/games/sc2/replay/LICENSE-Blizzard.txt and bundled as public/sc2/LICENSE-Blizzard-s2protocol.txt. Local replay reading uses bounded Rust parsers with flate2, bzip2 and notify; it does not bundle Python or execute game code.
