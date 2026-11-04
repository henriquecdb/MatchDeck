# Changelog

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
