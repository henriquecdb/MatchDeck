# Changelog

## [0.9.0] - 2026-11-13

### Added

- Local Age of Empires II: DE and Age of Empires IV sessions with manual start/end controls, record, win rate and ten latest results saved per game and profile.
- Optional session bars in both overlays, showing wins, losses, draws and recent results.
- Post-game summaries with source-confirmed result, opponent or team, map, duration and published rating change when available. Configurable display duration.
- Fictional win, loss and draw post-game demos for both games without changing real sessions; Age 2 follows the selected 1v1 to 4v4 format.
- Compact vertical Age 4 layout, selectable in the Overlay tab and supported by saved layout profiles.

### Fixed

- Late results enrich the same game without double-counting; unconfirmed results are not counted as losses.
- Summaries respect profile, game, focus and manual hiding without opening old games at startup or replacing a new active match.
- Age 4 duration uses the source duration rather than treating the record update timestamp as the match ending.
- A false value in the Age 2 finished field is no longer treated as a completed game.

### Coverage

- Age 2 follows the modes already detected by the app, including teams. Age 4 remains limited to ranked and quick-play PC 1v1.
- Counts depend on results published in recent source queries; this is not a complete history of games played while the app was closed.

## [0.8.0] - 2026-11-12

### Added

- SC2 post-game overlay summary with replay-confirmed result, opponent, map, duration and session record. Configurable duration from 0 to 30 seconds.
- Post-game demo with fictional win, loss and draw results.
- Local character-identity history with previous encounter record and last meeting shown when a replay confirms a returning opponent.
- Session records by opponent race and on-demand map statistics.
- Initial MMR, latest query and session change by race and season, with query, failure and missing-baseline states plus manual refresh.
- Per-game layout profiles to save and restore position, monitor, scale, opacity and display options.

### Improved

- Persistent SC2 Pulse caching, shared concurrent queries, failure backoff and Retry-After handling.
- The overlay shows players as soon as the local API responds, enriching statistics in the background while preserving match state and manual hiding.
- Fallback data shows its cache timestamp; history or chart failures preserve available statistics.

### Fixed

- Late responses cannot revive a finished match or leak across profile changes.
- Invalid cache files are preserved for recovery instead of overwritten at startup.
- Interrupted MMR queries recover correctly; concurrent retries and retroactive baselines are prevented.
- Post-game demo button proportions match the other actions.

## [0.7.0] - 2026-11-11

### Added

- Local SC2 sessions with manual start and end controls, a record and the ten latest replay-confirmed results.
- Optional in-game session bar with wins, losses, win rate and recent results, controlled from the Overlay tab.
- Per-profile session storage, recovery after restarting the app and duplicate-result protection.

### Improved

- More compact SC2 matchup overlay with race, name and MMR in two rows.
- Shorter session panel text, with counting details under About the session.
- Session bar demo with fictional results and window sizing that follows session visibility.

### Fixed

- Replay start-time calculation at Faster speed, preventing valid games from being excluded from a session.
- Event-driven session updates preserve newer results when an earlier read finishes later.

### Validation

- Matchup overlay, session bar and result tracking validated by the user in real games.

## [0.6.0] - 2026-11-06

### Added

- Automatic local SC2 replay reading to confirm maps and results and show up to five 1v1 matches, using file notifications, caching and processing limits.
- Local Age 4 (Steam) and SC2 profile identification from the Windows Documents folder, including OneDrive, with remote identity checks and no guessing between multiple profiles.
- Traditional SC2 icon extracted from the installed executable and bundled locally.
- Early Access StarCraft II integration with game selection, demo and a compact two-row overlay.
- SC2 profile linking by SC2 Pulse ID or SC2/Pulse profile URL, reusing statistics, last five matches and rating charts from the existing games.
- MMR, wins, losses and draws separated by race and season. Up to 30 chart records from the last 90 days of the published season.
- Match detection through the local SC2 client HTTP API, with stats captured at the start, end confirmation and consecutive-game handling.
- Independent per-game settings and cached matches. No private Blizzard credentials required.

### Improved

- Latest results belong to the linked profile in each game, load automatically and highlight wins and losses with color and bold text.
- Bundled SC2 race emblems and character-name identification when Pulse does not publish a valid name.
- Draw results are preserved in match history and included in win-rate calculations.
- Diagnostics, languages, hotkeys, game focus and demo support adapted to SC2.

### Limitations

- The first iteration targets two-human 1v1 games. Replays, AI and larger formats do not activate the overlay. The local API does not expose teams, map or queue; ranked, unranked and custom games are not claimed to be distinguishable.
- Overlay MMR and statistics are ranked values published by SC2 Pulse for that race. Unique name/region matches are marked as Suggested profile, without claiming client-confirmed identity. Ambiguous names and missing data remain without stats.
- Live MMR changes are not estimated; published changes appear in history. Current MMR is not substituted for historical starting MMR.
- SC2 is in Early Access. Local replay outcomes have been validated; live overlay behavior and broader match coverage remain under observation.

## [0.5.2] - 2026-11-04

### Added

- Age 2 rating history chart for ranked and quick 1v1 queues, using each queue’s published history without additional requests.
- Age 4 Profile tab with statistics by queue and up to five completed multiplayer matches, reusing the Age 2 layout and cache.
- Rating progression chart with up to 30 recent records published by AoE4 World, dates and values on hover or keyboard focus. Ranked points, MMR and queues remain separate; the season is shown when available.

### Fixed

- General unranked rating labeled as Unranked, without attributing it exclusively to custom lobbies.

- Sidebar game picker appearing beneath panel buttons, including with collapsed navigation.
- Parsing of wrapped player entries and processed games returned by AoE4 World.

### Limitations

- The chart uses recent history included in the profile response, without fetching the entire account history or adding in-match polling.
- Recent matches are selected from the ten latest published games. Private, ongoing, discarded and unsupported games are excluded.
- The Age 4 live overlay remains limited to 1v1; team statistics do not enable live team detection.

## [0.5.1] - 2026-11-04

### Fixed

- Age 4 profile linking with Steam IDs and AoE4 World profile URLs containing a Steam ID.
- MatchDeck verifies the Steam ID in the source response and saves the canonical profile ID for match detection. Unrelated profile responses remain rejected.
- Regression tests cover canonical IDs, Steam IDs, profile URLs and invalid responses.

## [0.5.0] - 2026-11-04

### Added

- Experimental Age of Empires IV integration for ranked and quick-play 1v1 matches published by AoE4 World.
- Horizontal Age 4 overlay with civilization, league, player name, leaderboard rank, ranked points/rating, wins, losses and win rate. Icons and flags are bundled locally.
- Profile linking by AoE4 World ID or URL and a fictional 1v1 demo. Teams, custom lobbies and Age 4 match history are outside this release.
- Game selection cards, a sidebar game picker and an option to open the last used game.
- Separate profiles, settings and cache for each game. Switching stops the previous monitor and is blocked during matches and demos.
- MatchDeck Local build with data isolated from the regular installation for development tests.

### Improved

- Update checking stays active on the game library and across navigation without restarting its service.
- Detection is paused when opening the game library. Last-game startup can be enabled in settings.
- Existing Age 2 data and settings remain compatible.

### Limitations

- Age 4 depends on AoE4 World coverage and publication delays. Missing values appear as — without borrowing stats from another queue.
- The main number in ranked Age 4 is ranked points, not matchmaking MMR.

## [0.4.5] - 2026-11-03

### Added

- Profile tab with queue-specific rating, wins, losses and win rate for the linked player.
- The latest five available completed multiplayer matches, with result, map, civilization and confirmed rating change.
- One-minute cache on opening the profile, manual refresh, error recovery and explicit missing values. No additional periodic requests.

### Improved

- Concise Portuguese and English copy across Match, Overlay, Demo, Settings, Updates and Diagnostics.
- Expandable detection and layout help keeps limitations, warnings and controls accessible.

## [0.4.4] - 2026-11-03

### Fixed

- Detailed overlays are limited to 1v1 duels, and the option is disabled during other match formats.
- A saved detailed preference automatically uses vertical compact for teams and other formats, restoring detailed mode for the next 1v1.
- Native window dimensions follow the effective layout, including demos and settings saved by earlier versions.

## [0.4.3] - 2026-11-03

### Security

- npm and RustSec dependency audits in GitHub Actions, without ignoring known vulnerabilities.
- Independent Windows PR builds and ClamAV scans of the executable and installer, with hashes and reports.
- Release publication gated on successful dependency audits and final package scanning.

### Added

- Independent global hotkey settings for overlay lock and visibility, retaining Ctrl+Shift+O and Ctrl+Shift+H as defaults.
- Disable/reset controls, duplicate validation and rollback when registering or saving hotkeys fails.
- A 360 px vertical compact layout alongside the existing 720 px horizontal layout.
- Fictional 1v1, 2v2, 3v3 and 4v4 demos with teams, different civilizations and player colors.

### Improved

- Collapsible sidebar navigation with icons, active section highlighting, smaller-window support and a remembered navigation preference.
- Removed synchronization timestamps from overlays and team headings from 1v1 duels.
- Shortcut help reflects the user's saved bindings.

## [0.4.2] - 2026-11-03

### Added

- English and Brazilian Portuguese interface options, including the overlay, loading screens and tray menu.
- Independent language selection for civilization and unique unit names, defaulting to English in both interface languages.
- Language changes applied immediately and saved across restarts, preserving existing settings and match snapshots.
- Bilingual release notes displayed in the selected interface language.

[0.4.2]: https://github.com/henriquecdb/MatchDeck/compare/v0.4.1...v0.4.2

[0.4.3]: https://github.com/henriquecdb/MatchDeck/compare/v0.4.2...v0.4.3

[0.4.4]: https://github.com/henriquecdb/MatchDeck/compare/v0.4.3...v0.4.4
