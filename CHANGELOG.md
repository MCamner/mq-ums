# Changelog

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
