---
name: docs-maintainer
description: Use when keeping mq-ums README, command docs, architecture docs, security docs, PSIGEL notes, live validation docs, changelog, roadmap, or GitHub Pages consistent with code.
---

# Docs Maintainer

Keep mq-ums docs accurate because they describe safety-critical operational behavior.

## Docs Surfaces

- `README.md`
- `docs/COMMANDS.md`
- `docs/ARCHITECTURE.md`
- `docs/SECURITY.md`
- `docs/PSIGEL_NOTES.md`
- `docs/LIVE_UMS_VALIDATION.md`
- `docs/index.html`
- `CHANGELOG.md`
- `ROADMAP.md`

## Verify Claims Against Code

- command catalog: `config/commands.json`
- API behavior: `server/src/index.js`
- config validation: `server/src/validate-config.js`
- PowerShell flow: `scripts/*.ps1`
- tests: `tests/*.test.js`
- release gates: `release-check.sh`

## Common Drift

- docs mention commands not present in `config/commands.json`
- dangerous command docs miss `RUN`
- README examples use wrong port or bind address
- version badge, `VERSION`, `package.json`, changelog, and `docs/index.html` disagree
- live validation docs imply write operations
- security docs omit audit logging or API key behavior

## Verification

```bash
npm run validate
npm test
./release-check.sh
```

For docs-only command changes, at minimum run:

```bash
npm run validate
```

## Editing Guidance

Document only implemented behavior. Keep redaction rules explicit for anything involving UMS hosts, credentials, audit logs, or live validation output.
