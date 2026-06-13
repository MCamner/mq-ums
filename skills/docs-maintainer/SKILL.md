---
name: docs-maintainer
description: Use when keeping mq-ums README, command docs, architecture docs, security docs, PSIGEL notes, live validation docs, changelog, roadmap, or GitHub Pages consistent with code.
---

# Docs Maintainer

Keep mq-ums docs accurate because they describe safety-critical operational behavior.

## When to use

- Keeping README, command docs, security docs, PSIGEL notes, or changelog consistent with code
- Syncing docs after command, API, or UI behavior changes
- Checking for version badge drift or broken command surface examples

## When not to use

- Command catalog changes — use `ums-command-safety-maintainer`
- Web UI changes — use `web-ui-maintainer`
- PowerShell or PSIGEL integration changes — use `psigel-integration-maintainer`
- Product positioning — run `repo-signal positioning`

## Evals

### Should trigger

- "sync the README after the command surface changed"
- "the version badge is stale"
- "update the changelog for this release"
- "do the documented commands match config/commands.json?"

### Should not trigger

- "add a command to the catalog" → use `ums-command-safety-maintainer`
- "fix the web command form" → use `web-ui-maintainer`
- "the PowerShell install flow is broken" → use `psigel-integration-maintainer`

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
