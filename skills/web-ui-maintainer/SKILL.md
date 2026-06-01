---
name: web-ui-maintainer
description: Use when changing mq-ums web UI, command form behavior, dry-run flow, confirmation UX, API status display, CSS, or browser-side safety affordances.
---

# Web UI Maintainer

Use this skill for the local browser UI under `web/`.

## UI Role

The UI is an operational control panel for IGEL UMS actions. It should be quiet, clear, and safety-forward rather than decorative.

## Files To Inspect

- `web/index.html`
- `web/app.js`
- `web/styles.css`
- `web/ui-api.css`
- `server/src/index.js`
- `config/commands.json`
- `tests/api.test.js`
- `docs/COMMANDS.md`
- `docs/SECURITY.md`

## Design Rules

- Show loaded commands clearly and group by section when available.
- Make dangerous commands visually distinct and require typing `RUN`.
- Keep dry-run obvious and easy to use before live execution.
- Show JSON output in a readable, copyable format.
- Keep health/API key/configuration state visible without exposing secrets.
- Avoid marketing-style pages; this is an operations tool.
- Keep layout dense, calm, and repeat-use friendly.
- Do not hide security constraints in small text.

## Behavior Rules

- UI must not construct raw PowerShell.
- UI sends `commandId`, allowlisted args, optional `confirmText`, and `dryRun`.
- Client-side validation is a convenience only; server validation is authoritative.
- Do not store credentials or API keys in localStorage unless explicitly designed and documented.
- Keep error messages actionable without leaking secret values.

## Verification

```bash
npm test
npm run validate
```

If running locally:

```bash
npm start
```

Then check:

- `http://127.0.0.1:8787/health`
- command list loads
- dry-run works
- dangerous command without `RUN` is rejected

## Output Standard

When reporting UI changes, mention command selection, confirmation behavior, dry-run behavior, and API verification.
