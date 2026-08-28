# Changelog

## [Unreleased]

### Added

* Versioned `ums_command_result.v1` and redacted `ums_command_history.v1`
  contracts with correlated request IDs.
* Shared Node command service, authenticated `/api/history`, bounded read-only
  cache and cache/live/dry-run source reporting.
* Governed browser device search, pagination, result detail, command history
  and redacted copy-summary flow.
* CI/release validation that all 30 YAML command contracts match the runtime
  allowlist.
* `Test-LiveUmsValidation.ps1 -ViaApi` for proving the complete Node API to UMS
  path and correlated audit history on Windows.

### Changed

* API-key authentication is header-only; querystring keys are no longer
  accepted.
* Audit rows retain argument names but no argument values or raw UMS results.
* Release readiness reports missing, stale or incomplete live UMS evidence as
  an explicit warning.

* `release-check.sh` now conforms to the `repo_release_check.v1` contract:
  `--json` emits the machine-readable verdict (`schema`, `repo`, `status`,
  `blockers`, `warnings`, `evidence`) on clean stdout and exits 0. Human mode is
  unchanged. Lets mq-agent's `stack release --all --preflight` read the release
  verdict.

## [0.1.4] - 2026-05-24

### Added

* `docs/LIVE_UMS_VALIDATION.md` with the v0.1.4 live read-only UMS validation checklist.
* `scripts/Test-LiveUmsValidation.ps1` for validating `Get-UMSStatus`, `Get-UMSFirmware`, and `Get-UMSDevice` through the same allowlisted runner used by the API.
* README live validation section with the supported read-only commands and documentation link.
* Release-check verification that the live validation doc and script exist.

### Changed

* Bumped project version to `0.1.4`.
* Updated GitHub Pages footer and docs links for v0.1.4.
* Roadmap now tracks v0.1.4 as a live-validation release candidate instead of a feature expansion.

### Safety

* Documented redaction rules for hostnames, usernames, domains, serials, device names, tokens, API keys and credential paths.
* Live validation remains read-only and does not add new UMS write actions.

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
