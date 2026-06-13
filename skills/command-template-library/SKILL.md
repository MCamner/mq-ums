---
name: command-template-library
description: Use when adding, updating, or reviewing commands in mq-ums. Guides the full flow from YAML contract to commands.json entry, COMMANDS.md section, and optional Python wrapper.
---

# Command Template Library

Maintain the mq-ums command surface through contracts — not direct edits to JSON or docs.

## When to use

Use this skill when the user asks to:

* add a new UMS command to mq-ums
* update an existing command's args, description, or danger flag
* generate commands.json entries or COMMANDS.md sections from a contract
* review whether a command follows the contract schema
* create a Python wrapper for a UMS command

## When not to use

* Command safety boundaries, allowlists, confirmation flow, or audit logging — use `ums-command-safety-maintainer`
* PowerShell/PSIGEL integration changes — use `psigel-integration-maintainer`
* Web UI form changes for a command — use `web-ui-maintainer`

## Evals

### Should trigger

* "add a get-firmware command to mq-ums"
* "make remove-device require confirmation"
* "generate the COMMANDS.md section for this contract"
* "does this command contract follow the schema?"

### Should not trigger

* "tighten the dangerous-command allowlist" → use `ums-command-safety-maintainer`
* "fix the PSIGEL credential flow" → use `psigel-integration-maintainer`
* "the command form in the web UI is broken" → use `web-ui-maintainer`
* "is mq-ums ready to release?" → use `release-readiness`

## Core rule

Every command must have a YAML contract in `docs/contracts/` before it is added to `config/commands.json` or `docs/COMMANDS.md`. The generator is the only path from contract to output.

Never edit `config/commands.json` or `docs/COMMANDS.md` directly when adding new commands.

## Files to inspect first

* `docs/contracts/` — canonical source for all commands
* `config/commands.json` — generated output (do not hand-edit for new commands)
* `docs/COMMANDS.md` — generated docs (do not hand-edit for new commands)
* `tools/generate-command-from-template.py` — the generator
* `docs/templates/command-contract.yaml` — blank template to copy

## Workflow

```bash
# 1. Copy the blank template
cp docs/templates/command-contract.yaml docs/contracts/<id>.yaml

# 2. Fill in all required fields (id, name, section, psCommand, description, danger)

# 3. Preview output — no files are modified
python3 tools/generate-command-from-template.py docs/contracts/<id>.yaml

# 4. Apply when satisfied
python3 tools/generate-command-from-template.py docs/contracts/<id>.yaml --apply
```

## Contract schema

See `templates/command-template.md` for the full field reference.

* `id` — kebab-case, unique across all commands
* `name` — display name shown in UI
* `section` — grouping: Status, Devices, Device Directories, Profiles, Profile Directories, Assignments
* `psCommand` — exact PSIGEL PowerShell cmdlet
* `description` — one sentence
* `danger` — `true` for any command that mutates state; `false` for read-only
* `confirmText` — required when `danger: true`; typically `RUN`
* `inputs` — list of accepted args with `name`, `required`, `notes`
* `python_wrapper` — set `true` to also emit a Python function

## Naming conventions

* Read-only: `get-*`, no inputs required by default
* Mutating: `new-*`, `update-*`, `move-*`, `remove-*`, `restart-*`, `reset-*` — always `danger: true`
* Input names: PascalCase to match PSIGEL convention (`Id`, `Name`, `Filter`, `DestId`)

## Validation rules

* Input `name` must match `^[A-Za-z]\w{0,63}$`
* `danger: true` without `confirmText` → generator exits with error
* Empty required fields → generator exits with error

## Templates

* `templates/command-template.md` — full field reference with examples
* `templates/powershell-command-template.md` — PS cmdlet naming conventions
* `templates/json-command-template.md` — commands.json entry shape
* `templates/python-command-template.md` — Python wrapper pattern
