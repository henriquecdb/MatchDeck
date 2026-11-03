# Changelog

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
