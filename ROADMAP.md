# mq-ums Roadmap

mq-ums is a local web UI for managing IGEL UMS through PSIGEL and PowerShell.

It is designed for a Windows Server environment where the UMS instance and
PowerShell tooling are available locally or through a controlled management
host.

mq-ums should make common UMS operations easier to test and run from a browser,
without exposing raw PowerShell execution.

---

## Core idea

```text
browser UI
  ↓
local Node API
  ↓
command allowlist
  ↓
PowerShell / PSIGEL
  ↓
IGEL UMS
```

The browser never sends arbitrary PowerShell.

Every supported action must be defined in:

```text
config/commands.json
```

Every dangerous command must require explicit confirmation.

---

## Current status

Current stable version:

```text
v0.1.3 — docs, CI and validation hardening
```

Current capability:

- local web UI
- local Node API
- PowerShell command runner
- PSIGEL command catalog
- 30-command allowlist
- dry-run mode
- health endpoints
- audit logging
- config validation
- GitHub Pages landing page
- CI validation

Current priority:

```text
v0.1.4 — live UMS validation
```

Reason:

The prototype is in good shape. The next risk is not more UI polish. The next
risk is whether the allowed commands behave correctly against a real IGEL UMS
environment.

---

## Release map

| Version | Theme                                   | Status  |
| ------- | --------------------------------------- | ------- |
| v0.1.0  | Initial prototype                       | Done    |
| v0.1.1  | Local UI and command catalog foundation | Done    |
| v0.1.2  | Health, dry-run and audit foundation    | Done    |
| v0.1.3  | Docs, CI and validation hardening       | Done    |
| v0.1.4  | Live UMS validation                     | Next    |
| v0.2.0  | Daily-use operator UI                   | Planned |
| v0.3.0  | Safety profiles and command governance  | Planned |
| v0.4.0  | Device fleet workflows                  | Planned |
| v0.5.0  | Job execution and rollback visibility   | Planned |
| v0.6.0  | Reporting and audit export              | Planned |
| v0.7.0  | Multi-UMS support                       | Planned |
| v1.0.0  | Stable local UMS operations console     | Future  |

---

## Completed

### v0.1.0 — Initial prototype

Goal:

Create a basic local project for controlling IGEL UMS through a safer web
interface.

- [x] Create repository
- [x] Add README
- [x] Add VERSION
- [x] Add ROADMAP
- [x] Add package metadata
- [x] Add local server foundation
- [x] Add browser UI foundation
- [x] Add PowerShell runner foundation
- [x] Add command allowlist concept
- [x] Add first GitHub release

---

### v0.1.1 — Local UI and command catalog foundation

Goal:

Make the project understandable and usable as a local prototype.

- [x] Add browser-based command UI
- [x] Add local API routes
- [x] Add command catalog
- [x] Add command metadata
- [x] Add command categories
- [x] Add read-only command examples
- [x] Add dangerous command confirmation concept
- [x] Add documentation for local setup
- [x] Add GitHub Pages landing page

---

### v0.1.2 — Health, dry-run and audit foundation

Goal:

Make command execution observable before connecting to production UMS.

- [x] Add `GET /health`
- [x] Add `GET /api/health`
- [x] Add dry-run mode
- [x] Add audit log
- [x] Add JSONL audit format
- [x] Add command preview output
- [x] Add tests for command catalog validation
- [x] Add safer error behavior
- [x] Add local-only binding guidance

---

### v0.1.3 — Docs, CI and validation hardening

Goal:

Make the prototype easier to trust before live UMS testing.

- [x] Sync version references
- [x] Add CI validation
- [x] Validate `config/commands.json`
- [x] Validate command metadata
- [x] Validate dangerous command confirmation metadata
- [x] Validate dry-run behavior
- [x] Validate docs references
- [x] Add 30-command catalog
- [x] Update GitHub Pages
- [x] Add clearer security rules
- [x] Add proof that validation runs in CI

---

## Next: v0.1.4 — Live UMS validation

Goal:

Verify mq-ums safely against a real IGEL UMS environment before expanding the
feature set.

This release should prove that the prototype works with real PSIGEL commands,
real credentials and real UMS responses.

### Scope

- [ ] Test `Get-UMSStatus` against live UMS
- [ ] Test `Get-UMSFirmware` against live UMS
- [ ] Test `Get-UMSDevice` against live UMS
- [ ] Test authentication/session creation
- [ ] Test session teardown
- [ ] Test credential loading through DPAPI
- [ ] Confirm no credentials are written to logs
- [ ] Confirm no credentials are returned to browser
- [ ] Confirm dry-run never executes PSIGEL
- [ ] Confirm audit log captures command name, time, result and safety class
- [ ] Confirm audit log does not capture secrets
- [ ] Add `docs/LIVE_UMS_VALIDATION.md`
- [ ] Add live validation checklist
- [ ] Add sample redacted output
- [ ] Add troubleshooting for failed UMS connection
- [ ] Add troubleshooting for missing PSIGEL module
- [ ] Add troubleshooting for certificate/TLS problems
- [ ] Add troubleshooting for permissions errors

### Recommended live test commands

```powershell
Get-UMSStatus
Get-UMSFirmware
Get-UMSDevice
```

### Local validation flow

```bash
npm test
npm run validate
npm run lint
npm start
```

Then in browser:

```text
http://127.0.0.1:3000
```

### Definition of done

- [ ] At least three read-only PSIGEL commands verified against live UMS
- [ ] Dry-run verified against live UMS command paths
- [ ] DPAPI credential flow verified
- [ ] Session teardown verified
- [ ] Audit log verified
- [ ] No secret leakage found
- [ ] `docs/LIVE_UMS_VALIDATION.md` exists
- [ ] README includes live validation status
- [ ] GitHub Actions pass
- [ ] GitHub release `v0.1.4` exists

---

## v0.2.0 — Daily-use operator UI

Goal:

Make mq-ums useful for regular read-only and low-risk operational checks.

### Planned scope

- [ ] Improve device list view
- [ ] Add pagination for large device lists
- [ ] Add search/filter in browser UI
- [ ] Add response caching for read-only commands
- [ ] Add command history in UI
- [ ] Add command result detail view
- [ ] Add copy result as JSON
- [ ] Add copy command summary
- [ ] Add better loading states
- [ ] Add better error messages from PowerShell failures
- [ ] Add empty-state messages
- [ ] Add UI category filters
- [ ] Add read-only dashboard
- [ ] Add firmware overview panel
- [ ] Add UMS status panel

### Example UI sections

```text
Status
Devices
Firmware
Profiles
Jobs
Audit log
Settings
```

### Definition of done

- [ ] Operator can find devices quickly
- [ ] Operator can run read-only checks safely
- [ ] Operator can inspect command history
- [ ] Operator can understand PowerShell errors
- [ ] UI stays responsive with larger result sets
- [ ] Read-only commands remain safe by default

---

## v0.3.0 — Safety profiles and command governance

Goal:

Make the command surface safer and easier to control as more UMS actions are
added.

### Planned scope

- [ ] Add command safety classes
- [ ] Add role-based command profiles
- [ ] Add `read-only` profile
- [ ] Add `operator` profile
- [ ] Add `admin` profile
- [ ] Add dangerous command review metadata
- [ ] Add required confirmation text per dangerous command
- [ ] Add command enable/disable flag
- [ ] Add command owner metadata
- [ ] Add command documentation URL
- [ ] Add command risk notes
- [ ] Add validation for command governance fields
- [ ] Add UI indicator for safety level

### Proposed safety classes

```text
read-only
inventory
configuration-read
configuration-write
job-trigger
bulk-operation
dangerous
disabled
```

### Permanent rules

- Browser must never send raw PowerShell
- Every command must exist in `config/commands.json`
- Dangerous commands require confirmation text
- Disabled commands cannot run
- Unknown commands are rejected
- Audit log records every execution attempt

---

## v0.4.0 — Device fleet workflows

Goal:

Move from individual command execution to safe, repeatable device fleet
workflows.

### Planned scope

- [ ] Add saved filters
- [ ] Add device groups view
- [ ] Add firmware compliance view
- [ ] Add profile assignment preview
- [ ] Add bulk operation dry-run
- [ ] Add affected-device preview
- [ ] Add confirmation gate for bulk operations
- [ ] Add export selected devices
- [ ] Add workflow summary before execution
- [ ] Add rollback notes field

### Example workflows

```text
Find devices by firmware
Find devices by profile
Find offline devices
Preview profile assignment
Preview firmware update group
Export filtered devices
```

### Non-goals

- No blind bulk execution
- No hidden profile assignment
- No firmware deployment without preview
- No automatic rollback without explicit design

---

## v0.5.0 — Job execution and rollback visibility

Goal:

Make UMS job execution easier to understand and safer to operate.

### Planned scope

- [ ] Add job list view
- [ ] Add job detail view
- [ ] Add job status polling
- [ ] Add job result summary
- [ ] Add job error view
- [ ] Add affected devices view
- [ ] Add job audit trail
- [ ] Add rollback visibility notes
- [ ] Add dangerous job confirmation gate
- [ ] Add webhook or local notification design

### Safety requirements

- Job-triggering commands require confirmation
- Job-triggering commands must show affected scope
- Bulk jobs must support dry-run preview where possible
- Audit log must record user intent and command metadata

---

## v0.6.0 — Reporting and audit export

Goal:

Make mq-ums useful for reporting, troubleshooting and operational evidence.

### Planned scope

- [ ] Export audit log as JSON
- [ ] Export audit log as CSV
- [ ] Export device inventory
- [ ] Export firmware overview
- [ ] Export command results
- [ ] Add report timestamp and environment metadata
- [ ] Add redaction rules
- [ ] Add printable report view
- [ ] Add daily operational check report
- [ ] Add troubleshooting bundle

### Possible reports

```text
UMS status report
Firmware compliance report
Device inventory report
Command audit report
Failed command report
```

---

## v0.7.0 — Multi-UMS support

Goal:

Support controlled switching between multiple UMS environments.

### Planned scope

- [ ] Add environment profiles
- [ ] Add environment selector
- [ ] Add per-environment credential reference
- [ ] Add per-environment command policy
- [ ] Add environment health status
- [ ] Add environment label in audit logs
- [ ] Add protection against accidental production actions
- [ ] Add clear production warning banner
- [ ] Add environment-specific dry-run policy

### Example environments

```text
Lab
Pilot
Production
Customer-A
Customer-B
```

### Safety requirements

- Production environment must be visually obvious
- Dangerous production actions require stronger confirmation
- Audit log must include environment name
- Credentials must remain separate per environment

---

## v1.0.0 — Stable local UMS operations console

Goal:

Make mq-ums stable enough to use as a controlled local operations console for
IGEL UMS.

### v1.0.0 requirements

- [ ] Stable local install flow
- [ ] Stable config format
- [ ] Stable command catalog schema
- [ ] Stable API routes
- [ ] Stable UI navigation
- [ ] Stable audit log format
- [ ] Stable credential handling model
- [ ] Stable dry-run behavior
- [ ] Complete security docs
- [ ] Complete live validation docs
- [ ] Complete troubleshooting docs
- [ ] Complete operator docs
- [ ] Green CI
- [ ] Protected main branch
- [ ] GitHub release
- [ ] GitHub Pages documentation
- [ ] No known critical safety gaps

---

## Long-term ideas

These are intentionally not scheduled yet.

- mq-agent integration
- mq-hal status brief
- repo-signal quality checks
- semantic memory for UMS environments
- PowerShell transcript integration
- Windows service mode
- signed local release package
- local desktop notification support
- webhook notifications
- Slack or Teams notification bridge
- screenshot-based docs
- demo videos or GIFs
- policy-as-code for UMS command access
- generated command reference from `commands.json`
- read-only public demo mode with mock data

---

## Design principles

mq-ums should remain:

- local-first
- browser-friendly
- PowerShell-aware
- PSIGEL-focused
- explicit
- safe by default
- allowlist-only
- dry-run friendly
- auditable
- operator-friendly
- useful without exposing raw shell access

The UI should make safe operations easier.

It should not become a browser-exposed PowerShell terminal.

---

## Permanent security rules

mq-ums must never:

- accept raw PowerShell from the browser
- execute unknown commands
- store credentials in `.env`
- store credentials in plaintext
- print secrets in logs
- return secrets to browser responses
- bind publicly by default
- run dangerous commands without confirmation
- hide command execution from audit logs

Every command must have:

- command id
- display name
- category
- safety class
- PowerShell mapping
- argument schema
- dry-run behavior
- audit behavior
- dangerous flag when needed
- confirmation text when dangerous

---

## Current recommended next step

Work on:

```text
v0.1.4 — live UMS validation
```

This release should prove that mq-ums works safely against a real IGEL UMS
environment before the UI grows into daily operational use.
