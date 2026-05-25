---
name: repo-aware
description: Use when inspecting, explaining, planning, reviewing, or changing mq-ums with repository-specific context.
---

# Repo Aware

Use this skill to ground work in mq-ums's local web UI, Node API, PowerShell, PSIGEL, and UMS safety model.

## What This Repo Is

`mq-ums` is a local web UI for managing IGEL UMS through PSIGEL. The browser calls a Node.js API, the API validates requests against `config/commands.json`, and a PowerShell runner invokes allowlisted PSIGEL commands.

Primary surfaces:

- `server/src/index.js` for Express API, command execution, dry-run behavior, API key auth, and audit writes
- `server/src/validate-config.js` for command allowlist validation
- `config/commands.json` for the command catalog
- `scripts/*.ps1` for Windows/PowerShell setup and PSIGEL execution
- `web/` for the local browser UI
- `docs/SECURITY.md`, `docs/ARCHITECTURE.md`, and `docs/LIVE_UMS_VALIDATION.md` for safety and operations
- `tests/` for Node test coverage
- `release-check.sh` for release gating

## First Inspection

Start with:

```bash
git status --short
rg --files
sed -n '1,240p' README.md
cat package.json
sed -n '1,260p' server/src/index.js
sed -n '1,220p' server/src/validate-config.js
```

If changing commands or PSIGEL behavior, inspect:

```bash
sed -n '1,240p' config/commands.json
sed -n '1,240p' scripts/Invoke-UmsCommand.ps1
sed -n '1,240p' docs/SECURITY.md
sed -n '1,240p' docs/LIVE_UMS_VALIDATION.md
```

## Verification

Use focused checks:

```bash
npm run validate
npm test
```

For release or broad changes:

```bash
./release-check.sh
```

## Guardrails

- Keep `config/commands.json` as the sole command allowlist.
- Do not allow raw PowerShell from browser input.
- Keep dangerous commands behind `confirmText: "RUN"`.
- Do not commit credentials, `.env`, DPAPI exports, UMS host secrets, or audit logs.
- Keep API bound to `127.0.0.1` by default.
- Update docs and tests when command, security, or UI behavior changes.
