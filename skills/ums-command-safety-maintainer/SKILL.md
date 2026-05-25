---
name: ums-command-safety-maintainer
description: Use when adding, changing, reviewing, or documenting mq-ums commands, config/commands.json, PowerShell execution, dangerous command confirmation, auth, audit logging, or API safety.
---

# UMS Command Safety Maintainer

Use this skill for mq-ums's safety boundary: browser requests can only execute validated, allowlisted PSIGEL commands.

## Core Files

- `config/commands.json`
- `server/src/validate-config.js`
- `server/src/index.js`
- `server/src/audit.js`
- `scripts/Invoke-UmsCommand.ps1`
- `tests/validate-config.test.js`
- `tests/api.test.js`
- `docs/SECURITY.md`
- `docs/COMMANDS.md`

## Safety Contract

- No raw PowerShell from the browser.
- `config/commands.json` is the only command allowlist.
- `psCommand` must match safe verb-noun format.
- Command verbs must stay in the explicit allowed verb set.
- Arg names must match safe identifier rules.
- Arg values are stringified and constrained before execution.
- Dangerous commands require configured `confirmText` and matching request confirmation.
- Dry-run must not spawn PowerShell.
- Every execution attempt should write an audit entry.

## Adding A Command

1. Add the command to `config/commands.json`.
2. Mark `danger: true` for write, move, restart, reset, remove, update, or disruptive commands.
3. Add `confirmText: "RUN"` for dangerous commands.
4. Keep `allowedArgs` minimal and explicit.
5. Run `npm run validate`.
6. Add or update tests if the command introduces a new safety edge.
7. Update `docs/COMMANDS.md` and security docs when user-facing.

## Risk Review

Check for:

- raw request fields passed to `spawn`
- missing confirmation for dangerous commands
- broad arg regex changes
- new allowed verbs without clear need
- API key bypass
- audit writes missing on success, error, or dry-run
- logging secrets, credentials, or full UMS host details unnecessarily

## Verification

```bash
npm run validate
npm test
```

For release confidence:

```bash
./release-check.sh
```

## Review Standard

Lead with command injection, confirmation bypass, allowlist drift, missing audit coverage, and docs/test gaps.
