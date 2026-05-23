# mq-ums

Local web UI for managing IGEL UMS via [PSIGEL](https://github.com/MCamner/PSIGEL).

![CI](https://github.com/MCamner/mq-ums/actions/workflows/ci.yml/badge.svg)
![Version](https://img.shields.io/badge/version-0.1.3-blue)
![License](https://img.shields.io/badge/license-MIT-green)

```text
Browser UI → Node.js API → PowerShell → PSIGEL → IGEL UMS
```

## Quick start

```powershell
git clone https://github.com/MCamner/mq-ums.git C:\mq-ums
cd C:\mq-ums

.\scripts\install-windows.ps1
.\scripts\New-UmsCredential.ps1 -Path C:\mq-ums\ums.cred.xml

copy .env.example .env
notepad .env   # set MQ_UMS_HOST and MQ_UMS_CRED_PATH

npm start
```

Open `http://127.0.0.1:8787`. Verify connectivity at `http://127.0.0.1:8787/health`.

## Usage

1. Select a command from the dropdown
2. Fill in any required args (e.g. device `Id`)
3. For dangerous commands (`Restart-*`, `Update-*`, `Move-*`), type `RUN` to confirm
4. Click **Run** — output appears as JSON

Start with read-only commands: `Get-UMSStatus`, `Get-UMSFirmware`, `Get-UMSDevice`.

## Configuration

| Variable | Description | Default |
| --- | --- | --- |
| `MQ_UMS_HOST` | UMS server hostname or IP | required |
| `MQ_UMS_PORT` | UMS TCP port | `8443` |
| `MQ_UMS_CRED_PATH` | Path to credential XML file | required |
| `MQ_UMS_API_KEY` | Optional API key for the web UI | disabled |
| `MQ_UMS_BIND` | Bind address | `127.0.0.1` |
| `MQ_UMS_HTTP_PORT` | HTTP port | `8787` |

## Test connectivity

```powershell
.\scripts\Test-PSIGEL.ps1 -UmsHost ums.example.com -CredPath C:\mq-ums\ums.cred.xml
```

## Adding commands

Edit `config/commands.json` and add an entry. Run `npm run validate` to check.
No code changes needed — the runner is data-driven.

## Proof

- `config/commands.json` is the sole allowlist — no command runs unless it appears there
- `server/src/validate-config.js` enforces: safe psCommand format (`^[A-Za-z]+-[A-Za-z]+$`), allowed verb set, arg name safety (`^[A-Za-z]\w{0,63}$`), danger+confirmText pairing, and no duplicate IDs
- `validate-config.js` runs at server startup and on every CI push — bad config blocks startup
- Dangerous commands (`Restart-*`, `Remove-*`, `Reset-*`, `Move-*`, etc.) require `confirmText: "RUN"` in both config and client request
- Dry-run mode previews what would execute without spawning PowerShell
- Every command execution is written to `logs/audit-YYYY-MM-DD.jsonl` — timestamp, command, args, status
- Credentials stored via Windows DPAPI (`Export-Clixml`) — never in `.env` or plaintext
- API binds to `127.0.0.1` by default — not exposed to network without explicit override
- `release-check.sh` gates every release on: config validation, tests, version sync across VERSION/package.json/README/CHANGELOG/docs/index.html

## Security

- No raw PowerShell from the browser
- Command allowlist enforced in `config/commands.json`
- Dangerous commands (`Restart-*`, `Remove-*`, `Update-*`, `Move-*`) require typing `RUN`
- Credentials stored via Windows DPAPI — never in `.env` or plaintext
- API binds to `127.0.0.1` by default

See [docs/SECURITY.md](docs/SECURITY.md) and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Roadmap

See [ROADMAP.md](ROADMAP.md).

## Documentation

- [Command reference](docs/COMMANDS.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Security](docs/SECURITY.md)
- [PSIGEL Notes](docs/PSIGEL_NOTES.md)
- [Roadmap](ROADMAP.md)
- [Changelog](CHANGELOG.md)
