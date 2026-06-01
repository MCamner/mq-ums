---
name: release-readiness
description: Use when preparing mq-ums for release by checking version sync, command config validation, tests, docs, security, live validation docs, and Git state.
---

# Release Readiness

Use this skill before tagging, publishing, or announcing mq-ums.

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
