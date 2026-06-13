# Skills

mq-ums ships with built-in skills for safe UMS command operations, PSIGEL
integration, local web UI maintenance, docs, release readiness, and repo-aware
work.

Skills live in `skills/`. They describe the local responsibility boundaries for
the web UI, Node API, PowerShell runner, command allowlist, docs, and release
flow.

## Built-in skills

The table below is generated from SKILL.md frontmatter by
`./scripts/check-skills.sh --fix`. Do not edit it by hand.

<!-- BEGIN GENERATED SKILLS TABLE -->
| Skill | Description |
| ----- | ----------- |
| [command-template-library](skills/command-template-library/SKILL.md) | Use when adding, updating, or reviewing commands in mq-ums. Guides the full flow from YAML contract to commands.json entry, COMMANDS.md section, and optional Python wrapper. |
| [docs-maintainer](skills/docs-maintainer/SKILL.md) | Use when keeping mq-ums README, command docs, architecture docs, security docs, PSIGEL notes, live validation docs, changelog, roadmap, or GitHub Pages consistent with code. |
| [psigel-integration-maintainer](skills/psigel-integration-maintainer/SKILL.md) | Use when changing mq-ums PowerShell scripts, PSIGEL integration, Windows install flow, credential handling, live UMS validation, or operational troubleshooting docs. |
| [release-readiness](skills/release-readiness/SKILL.md) | Use when preparing mq-ums for release by checking version sync, command config validation, tests, docs, security, live validation docs, and Git state. |
| [repo-aware](skills/repo-aware/SKILL.md) | Use when inspecting, explaining, planning, reviewing, or changing mq-ums with repository-specific context. |
| [ums-command-safety-maintainer](skills/ums-command-safety-maintainer/SKILL.md) | Use when adding, changing, reviewing, or documenting mq-ums commands, config/commands.json, PowerShell execution, dangerous command confirmation, auth, audit logging, or API safety. |
| [web-ui-maintainer](skills/web-ui-maintainer/SKILL.md) | Use when changing mq-ums web UI, command form behavior, dry-run flow, confirmation UX, API status display, CSS, or browser-side safety affordances. |
<!-- END GENERATED SKILLS TABLE -->

## Boundaries

- Browser requests must execute only validated, allowlisted PSIGEL commands.
- Dangerous commands require explicit confirmation.
- Credential handling and audit logging are part of the safety surface.
- Documentation must stay aligned with live validation and operational behavior.
