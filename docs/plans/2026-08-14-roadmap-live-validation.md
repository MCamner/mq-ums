# Roadmap And Live Validation Start Implementation Plan

## Goal

Synchronize the v0.1.4 roadmap with verified release state and start the live
validation gate without claiming evidence that requires the Windows UMS host.

## Owner repo

mq-ums

## Secondary repos

None.

## Architecture boundary

- mqobsidian owns context contracts, templates, generators, and published context surfaces.
- mq-agent owns planning, workflow routing, task decomposition, and agent handoff.
- mq-mcp owns execution tools, tool safety, and runtime boundaries.
- mq-hal owns status, operator summaries, release/runbook views.
- repo-signal owns publish readiness, security/readiness scoring, and repo health checks.

## Non-goals

- No live write commands or production UMS mutations.
- No fabricated live-validation results.
- No v0.2.0 UI work before the v0.1.4 live gate is reviewed.

## Approval gates

- Before file writes: approved by the user's request.
- Before commit: separate user request required.
- Before push/merge: separate user request required.
- Before deletion/settings changes: separate approval required; none planned.

## Test gates

- `npm run validate`
- `npm test`
- `./release-check.sh`
- `pwsh -NoProfile -File scripts/Test-LiveUmsValidation.ps1 -EmitStatus <temporary-path>`
- `git diff --check`

## Rollback

Revert the documentation commit. The live-validation probe writes only to a
temporary path outside the repository.

### Task 1: Synchronize verified roadmap state

**Purpose:** Remove stale RC, CI, release, and nonexistent lint-command claims.

**Files:**

- Modify: `ROADMAP.md`

**Steps:**

1. Record v0.1.4 as released with live environment validation pending.
2. Mark verified CI and GitHub release checks complete.
3. Replace the nonexistent lint command with the repository release gate.

**Expected result:** Roadmap facts match the repository and GitHub state.

### Task 2: Start the live validation gate

**Purpose:** Prove the harness runs safely and identify environment-only
blockers before execution on the Windows management host.

**Files:**

- Read-only reference: `scripts/Test-LiveUmsValidation.ps1`
- Read-only reference: `docs/LIVE_UMS_VALIDATION.md`

**Steps:**

1. Run local tests, config validation, and release gate.
2. Run the read-only harness with status output directed to a temporary file.
3. Validate that the resulting status remains `unknown` outside the UMS host.
4. Leave all live-only roadmap boxes unchecked.

**Expected result:** Local gates pass and the remaining Windows/UMS blockers are
reported honestly.

### Task 3: Remove runner syntax blockers found by the probe

**Purpose:** Ensure the real PowerShell entrypoint parses before it reaches
environment-specific PSIGEL and credential checks.

**Files:**

- Modify: `tests/validate-config.test.js`
- Modify: `scripts/Invoke-UmsCommand.ps1`

**Steps:**

1. Add a regression test for a variable immediately followed by a colon.
2. Delimit the interpolated credential-path variable correctly.
3. Re-run the live harness and confirm parser errors are gone.

**Expected result:** Missing local prerequisites produce dependency errors, not
a PowerShell parser failure.

**Commit suggestion:**

`docs(roadmap): sync release state and start live validation`
