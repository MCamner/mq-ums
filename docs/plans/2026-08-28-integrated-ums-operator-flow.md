# Integrated UMS Operator Flow Implementation Plan

## Goal

Bind the tested Node API execution path into one governed operator flow from
command catalog through PowerShell result, audit/history, cache, browser views,
live validation and release evidence.

## Owner repo

mq-ums

## Secondary repos

None. `mq-hal` or other MQ consumers may read a future stable status contract,
but this plan adds no cross-repo dependency.

## Architecture boundary

- `config/commands.json` remains the sole runtime allowlist.
- The Node server owns request validation, command execution orchestration,
  result envelopes, cache policy and audit/history projections.
- `scripts/Invoke-UmsCommand.ps1` owns PSIGEL session setup, command invocation
  and teardown, but does not become a second policy engine.
- The governed `web/` console consumes only same-origin Node API contracts.
- `docs/IGEL-UMS-Console.html` remains an ungoverned development tool and is not
  integrated into the operator flow.
- `docs/contracts/*.yaml` document commands; validation must keep their safety
  metadata aligned with the runtime allowlist.

## Current evidence

- `/api/health`, `/api/ums-status`, `/api/commands` and `/api/run` are consumed
  by `web/app.js` and covered by Node API tests.
- `/api/run` writes audit JSONL, but no API or browser surface reads it.
- `Test-LiveUmsValidation.ps1` invokes the PowerShell runner directly, so it
  does not prove the browser/Node API path end to end.
- `/api/ums-status` reads a separate emitted file and is not updated by normal
  command executions.
- The command YAML contracts are not loaded or cross-validated by the server.
- Local audit files contain dry-run/error evidence but no successful execution
  record. A successful live server call is user-reported but not reproducible
  from committed repo evidence yet.

## Target flow

```text
config/commands.json
        │ validated catalog + safety metadata
        ▼
server command service
        │ one normalized ums_command_result.v1
        ├──────────────► redacted audit/history
        ├──────────────► read-only cache
        ├──────────────► connection evidence
        ▼
scripts/Invoke-UmsCommand.ps1 → PSIGEL → IGEL UMS
        │
        ▼
same-origin API → browser device/result/history views
```

## Non-goals

- No arbitrary PowerShell or free-form cmdlet names.
- No new write commands and no change to existing `danger` flags, sections or
  confirmation text.
- No role-based access control; that remains v0.3.0 scope.
- No promotion of the standalone development console.
- No persistent cache of dangerous-command results.
- No automatic claims that live UMS is healthy from one successful command.

## Approval gates

- Before plan file write: yes — requested by the user.
- Before implementation file writes: yes — separate approval required.
- Before commit: yes.
- Before push/PR: yes.
- Before live UMS execution, settings changes or destructive commands: yes,
  explicit operator approval on the Windows management host.

## Test gates

```bash
npm run validate
npm test
./release-check.sh
```

Windows live gate after static tests:

```powershell
.\scripts\Test-LiveUmsValidation.ps1 `
  -ViaApi `
  -EmitStatus .\out\ums_connection_status.v1.json
```

The live gate must use read-only commands only and must produce redacted
contract evidence without hostnames, credentials, session IDs or device data.

## Rollback

- Deliver each task as a separate commit and revert the failing slice.
- Keep `/api/run` request compatibility until the final migration gate passes.
- New response contracts are versioned; never rewrite historical audit rows.
- Disabling cache/history must leave direct allowlisted execution functional.

### Task 1: Define the shared result and history contracts

**Purpose:** Give server, audit, cache, UI and tests one stable shape without
putting raw PowerShell output into logs.

**Files:**

- Create: `schemas/ums_command_result.v1.json`
- Create: `schemas/ums_command_history.v1.json`
- Create: `examples/ums_command_result.v1.json`
- Create: `examples/ums_command_history.v1.json`
- Modify: `package.json`
- Modify: `tests/api.test.js`
- Modify: `docs/ARCHITECTURE.md`

**Contract minimum:**

- `request_id`, `command_id`, `section`, `safety`, `dry_run`
- `status`, `started_at`, `duration_ms`, `source`
- optional `data` in the API response only
- structured, redacted `error` without raw credential paths
- `source`: `live | cache | dry-run`

History records contain metadata and redacted summaries, never raw `data`, raw
stdout/stderr, credentials or full device objects.

**Steps:**

1. Write schema-negative tests for unknown fields and secret-bearing examples.
2. Add versioned JSON schemas and minimal public-safe examples.
3. Add a schema validation test command to `package.json`.
4. Document which fields may cross each boundary.
5. Run all static gates.

**Expected result:** Every downstream task targets explicit v1 contracts and
cannot silently add raw UMS output to history.

**Commit suggestion:**

`feat(api): define command result and history contracts`

### Task 2: Extract one command execution service

**Purpose:** Make `/api/run`, live validation and future consumers use the same
catalog lookup, argument policy, PowerShell invocation and result normalization.

**Files:**

- Create: `server/src/command-service.js`
- Modify: `server/src/index.js`
- Modify: `server/src/audit.js`
- Create: `tests/command-service.test.js`
- Modify: `tests/api.test.js`

**Steps:**

1. Move existing command lookup, confirmation and arg filtering behind an
   injected `executeCommand` service without changing `/api/run` behavior.
2. Inject the PowerShell spawn function in tests; never require UMS for unit
   tests.
3. Emit one `ums_command_result.v1` envelope per request.
4. Give the same `request_id` to response and audit metadata.
5. Redact errors before either audit or response serialization.
6. Remove querystring API-key support; accept `x-api-key` only.
7. Prove unknown args, invalid values, missing confirmation, spawn failure,
   timeout and malformed PowerShell JSON fail closed.

**Expected result:** One service owns execution semantics; the Express route is
transport only, and existing danger/section metadata is unchanged.

**Commit suggestion:**

`refactor(api): centralize allowlisted command execution`

### Task 3: Make audit a readable, redacted history contract

**Purpose:** Connect successful API calls to operator-visible history without
exposing raw arguments or UMS results.

**Files:**

- Modify: `server/src/audit.js`
- Modify: `server/src/index.js`
- Modify: `tests/api.test.js`
- Create: `tests/audit.test.js`
- Modify: `docs/SECURITY.md`
- Modify: `docs/ARCHITECTURE.md`

**Steps:**

1. Add strict audit parsing that skips or reports malformed JSONL rows without
   failing the server.
2. Store `request_id`, command metadata, result status, duration and safe arg
   names; do not store argument values by default.
3. Add authenticated `GET /api/history?limit=<n>` with a bounded maximum.
4. Return `ums_command_history.v1`, newest first.
5. Test traversal resistance, malformed rows, limit bounds and secret markers.
6. Preserve append-only audit behavior and existing filenames.

**Expected result:** Audit becomes a safe product surface instead of a write-only
side effect.

**Commit suggestion:**

`feat(audit): expose redacted command history`

### Task 4: Add read-only result caching inside the command service

**Purpose:** Make repeatable operator checks fast without bypassing audit or
inventing a second execution path.

**Files:**

- Create: `server/src/result-cache.js`
- Modify: `server/src/command-service.js`
- Modify: `config/commands.json`
- Modify: `server/src/validate-config.js`
- Create: `tests/result-cache.test.js`
- Modify: `tests/validate-config.test.js`
- Modify: `docs/COMMANDS.md`

**Steps:**

1. Add optional `cacheTtlSeconds` metadata, allowed only when `danger: false`.
2. Key cache entries by command id plus normalized filtered args.
3. Keep cache in memory for v0.2.0; set strict TTL and item-count bounds.
4. Audit cache hits with `source: cache` and the original result request id.
5. Add an explicit refresh/bypass request flag for read-only commands.
6. Prove dangerous commands can never read or populate cache.

**Expected result:** Cached and live runs share response/history contracts and
safety gates.

**Commit suggestion:**

`feat(api): cache bounded read-only results`

### Task 5: Build device results and history on the governed browser API

**Purpose:** Turn the generic working API into the daily-use v0.2.0 operator
workflow without creating another backend.

**Files:**

- Create: `web/result-model.js`
- Modify: `web/app.js`
- Modify: `web/index.html`
- Modify: `web/styles.css`
- Create: `tests/result-model.test.js`
- Modify: `tests/api.test.js`

**Steps:**

1. Normalize only `get-device` results into a client-side view model; retain a
   raw JSON detail view for unsupported shapes.
2. Add search, filters and client-side pagination over the returned device set.
3. Add a bounded history panel backed by `/api/history`.
4. Add copy JSON and a redacted short-summary action.
5. Show `live`, `cache` and `dry-run` sources explicitly.
6. Keep danger confirmation and command selection unchanged.
7. Test pure result-model functions with Node's built-in test runner.

**Expected result:** Device search and history are views over the same governed
execution records, not parallel features.

**Commit suggestion:**

`feat(web): connect device results and command history`

### Task 6: Cross-validate command documentation against runtime policy

**Purpose:** Bind the 30 YAML command contracts to the actual allowlist without
making documentation a second runtime source of truth.

**Files:**

- Create: `tools/validate-command-contracts.py`
- Create: `tests/test-command-contracts.sh`
- Modify: `package.json`
- Modify: `release-check.sh`
- Modify: `.github/workflows/ci.yml`
- Modify: `docs/templates/command-contract.yaml`

**Steps:**

1. Require one YAML contract per command id.
2. Compare `id`, `section`, `psCommand`, `danger`, `confirmText` and input names
   against `config/commands.json`.
3. Reject missing, duplicate or extra command contracts.
4. Run the validator in CI and release-check.
5. Keep descriptions/notes documentation-owned; do not load YAML at runtime.

**Expected result:** Catalog, docs and safety metadata cannot drift silently.

**Commit suggestion:**

`test(catalog): enforce command contract parity`

### Task 7: Validate the complete server path on Windows

**Purpose:** Replace separate runner proof with reproducible evidence that the
actual operator path works end to end.

**Files:**

- Modify: `scripts/Test-LiveUmsValidation.ps1`
- Modify: `server/src/index.js`
- Modify: `docs/LIVE_UMS_VALIDATION.md`
- Modify: `release-check.sh`
- Modify: `ROADMAP.md`
- Modify: `CHANGELOG.md`

**Steps:**

1. Add `-ViaApi` to start or target the local Node server and call
   `/api/health`, `/api/commands` and `/api/run`.
2. Run only `get-status`, `get-firmware` and `get-device` live.
3. Verify response schemas, matching audit request ids and session teardown.
4. Verify history contains metadata but no host, credential, session or device
   content.
5. Emit redacted `ums_connection_status.v1` with an evidence timestamp.
6. Make `release-check.sh --json` report missing/stale live evidence as an
   explicit warning or blocker chosen by release policy; never call it proven.
7. Close roadmap items only from the emitted evidence.

**Expected result:** One reproducible Windows run proves browser-facing Node API,
allowlist, PowerShell, PSIGEL, audit/history and status evidence as one chain.

**Commit suggestion:**

`test(integration): prove the live API-to-UMS path`

## Recommended first implementation slice

Tasks 1–3 only: contracts, shared command service and redacted history. This is
the smallest slice that actually binds the working API to another repo function
without mixing in UI redesign or cache semantics. Merge it before Tasks 4–7.

## Final acceptance criteria

- Exactly one policy/execution path exists for every API-triggered command.
- Every response and audit row correlates by `request_id`.
- History and cache never expose raw UMS output or argument values by default.
- Dangerous commands preserve current section, danger and confirmation metadata
  and never use cache.
- Device UI, history and status read stable server contracts.
- Command YAML safety metadata matches the runtime allowlist.
- A Windows live run proves the Node API path, not only the PowerShell runner.
- Static and live release evidence are reported separately and honestly.
