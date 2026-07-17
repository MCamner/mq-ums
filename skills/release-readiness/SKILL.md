---
name: release-readiness
description: Use when preparing mq-ums for release by checking version sync, command config validation, tests, docs, security, live validation docs, and Git state.
---

# Release Readiness

Use this skill before tagging, publishing, or announcing mq-ums.

## When to use

- Before tagging, publishing, or announcing a mq-ums release
- After completing command, API, or security changes to verify version alignment and checks

## When not to use

- Regular development or feature work
- Command additions without version bump — use `ums-command-safety-maintainer`
- Debugging API or web UI behavior

## Evals

### Should trigger

- "is mq-ums ready to release?"
- "run the mq-ums release checklist"
- "what's blocking the next mq-ums tag?"
- "verify version, changelog, and npm validate before tagging mq-ums"

### Should not trigger

- "update mq-ums docs" → use `docs-maintainer`
- "fix the PSIGEL integration" → use `psigel-integration-maintainer`
- "update the web UI" → use `web-ui-maintainer`
- "add a new UMS command" → use `ums-command-safety-maintainer`

## Always Inspect

- `git status --short`
- `VERSION`
- `package.json`
- `package-lock.json`
- `CHANGELOG.md`
- `README.md`
- `docs/index.html`
- `docs/SECURITY.md`
- `docs/LIVE_UMS_VALIDATION.md`
- `config/commands.json`
- `release-check.sh`

## Blockers

- `npm run validate` fails
- `npm test` fails
- version mismatch across `VERSION`, `package.json`, README badge, changelog, and docs page
- dangerous command lacks `confirmText`
- command config or API behavior changed without docs/tests
- live validation script or docs missing
- secrets, `.env`, credential XML, UMS hostnames, or audit logs are staged
- dirty worktree contains unrelated user changes

## Verification

```bash
./release-check.sh
```

If a narrower check is enough:

```bash
npm run validate
npm test
```

## Report Format

Return:

- status: ready, blocked, or uncertain
- blockers
- files changed
- checks run
- checks skipped and why
- Windows/UMS live checks not run locally, if applicable
