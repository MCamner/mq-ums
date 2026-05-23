# Changelog

## [0.1.3] - 2026-05-23

### Added

* `## Proof` section in README documenting safety guarantees
* `release-check.sh` — pre-release gate: config validation, tests, version sync across VERSION/package.json/README/CHANGELOG/docs/index.html
* `validate-config.js` now enforces an explicit allowed verb set (`Get`, `Set`, `New`, `Remove`, `Move`, `Start`, `Stop`, `Restart`, `Reset`, `Send`, `Update`) — blocks any psCommand with an unlisted verb prefix
* CI `workflow_dispatch` trigger for manual runs
* CI docs-consistency job: version match across VERSION, package.json, README, CHANGELOG, and docs/index.html
* `docs/index.html` command catalog updated from 8 stale entries to all 30 current commands (removed non-existent `get-directory` and `update-device-firmware`; added all device, directory, profile, and assignment commands)
* `docs/COMMANDS.md` rewritten to match the 30-command catalog in `config/commands.json`

### Fixed

* README version badge corrected from `0.1.1` to `0.1.3`
* ROADMAP current status updated from `v0.1.1` to `v0.1.3`; removed duplicate `[x] Audit log` entry from Later section

## [0.1.2] - 2026-05-22

### Added

* `GET /health` and `GET /api/health` — readiness endpoint with version, bind address, commands loaded, and env config status
* Audit log — every command execution writes a JSONL entry to `logs/audit-YYYY-MM-DD.jsonl` (timestamp, commandId, psCommand, sanitized args, danger flag, dryRun flag, status, durationMs)
* Dry-run mode — UI toggle sends `dryRun: true`; server returns a preview of what would execute without spawning PowerShell
* `docs/COMMANDS.md` — human-readable command reference for all allowlisted commands
* `.github/ISSUE_TEMPLATE/` — bug, feature, command request, and security review templates
* `npm run validate:commands` alias for `npm run validate`

### Changed

* Frontend health check now calls `/health` instead of `/api/commands`
* Run button label updates to "Dry Run" when dry-run mode is active
* Startup log now includes version number
* `validate-config.js` — arg names are now validated against `^[A-Za-z]\w{0,63}$`

## [0.1.1] - 2026-05-22

### Added

* LICENSE (MIT)
* VERSION file
* ROADMAP.md
* Improved README with install, usage, and security sections

## [0.1.0] - 2026-05-22

### Added

* Initial prototype: Node.js Express API + vanilla JS web UI + PowerShell runner
* `config/commands.json` — allowlisted PSIGEL command catalog
* `server/src/index.js` — Express API with `/api/commands` and `/api/run`
* `server/src/validate-config.js` — startup config validation
* `web/` — browser UI with command selector, args fields, danger confirm dialog
* `scripts/Invoke-UmsCommand.ps1` — PowerShell runner using PSIGEL session pattern
* `scripts/New-UmsCredential.ps1` — DPAPI credential setup helper
* `scripts/Test-PSIGEL.ps1` — connectivity smoke test
* `scripts/install-windows.ps1` — Windows setup script
* `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/PSIGEL_NOTES.md`
* GitHub Actions CI — validates `commands.json` on every push
