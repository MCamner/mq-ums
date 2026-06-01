# Skills

mq-ums ships with built-in skills for safe UMS command operations, PSIGEL
integration, local web UI maintenance, docs, release readiness, and repo-aware
work.

Skills live in `skills/`. They describe the local responsibility boundaries for
the web UI, Node API, PowerShell runner, command allowlist, docs, and release
flow.

## Built-in skills

| Skill | Purpose |
| --- | --- |
| [docs-maintainer](skills/docs-maintainer/SKILL.md) | Keep README, command docs, architecture docs, security docs, PSIGEL notes, live validation docs, changelog, roadmap, and GitHub Pages consistent with code. |
| [psigel-integration-maintainer](skills/psigel-integration-maintainer/SKILL.md) | Maintain PowerShell scripts, PSIGEL integration, Windows install flow, credential handling, live UMS validation, and operational troubleshooting docs. |
| [release-readiness](skills/release-readiness/SKILL.md) | Prepare mq-ums for release by checking version sync, command config validation, tests, docs, security, live validation docs, and Git state. |
| [repo-aware](skills/repo-aware/SKILL.md) | Inspect, explain, plan, review, or change mq-ums with repository-specific context. |
| [ums-command-safety-maintainer](skills/ums-command-safety-maintainer/SKILL.md) | Maintain command safety boundaries, `config/commands.json`, PowerShell execution, dangerous command confirmation, auth, and audit logging. |
| [web-ui-maintainer](skills/web-ui-maintainer/SKILL.md) | Maintain the local web UI, command forms, dry-run flow, confirmation UX, API status display, CSS, and browser-side safety affordances. |

## Boundaries

- Browser requests must execute only validated, allowlisted PSIGEL commands.
- Dangerous commands require explicit confirmation.
- Credential handling and audit logging are part of the safety surface.
- Documentation must stay aligned with live validation and operational behavior.
