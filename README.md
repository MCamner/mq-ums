# mq-ums

Local web UI for managing IGEL UMS via [PSIGEL](https://github.com/MCamner/PSIGEL).

```
Browser UI → Node.js API → PowerShell → PSIGEL → IGEL UMS
```

## Quick start (Windows)

```powershell
cd C:\mq-ums

# Install PSIGEL and Node deps
.\scripts\install-windows.ps1

# Save UMS credentials (encrypted, DPAPI)
.\scripts\New-UmsCredential.ps1 -Path C:\mq-ums\ums.cred.xml

# Configure
copy .env.example .env
notepad .env

# Start
npm start
```

Open `http://127.0.0.1:8787`.

## Configuration

| Variable | Description | Default |
|---|---|---|
| `MQ_UMS_HOST` | UMS server hostname | required |
| `MQ_UMS_PORT` | UMS TCP port | `8443` |
| `MQ_UMS_CRED_PATH` | Path to credential XML file | required |
| `MQ_UMS_API_KEY` | Optional API key for the web UI | disabled |
| `MQ_UMS_BIND` | Bind address | `127.0.0.1` |
| `MQ_UMS_HTTP_PORT` | HTTP port | `8787` |

## Adding commands

Edit `config/commands.json` and add an entry. Run `npm run validate` to check.
No code changes needed — the runner is data-driven.

## Test connectivity

```powershell
.\scripts\Test-PSIGEL.ps1 -UmsHost ums.example.com -CredPath C:\mq-ums\ums.cred.xml
```

## Security

- No raw PowerShell from the browser
- Command allowlist in `config/commands.json`
- Dangerous commands (`Restart-*`, `Remove-*`, `Update-*`) require typing `RUN`
- Credentials stored via Windows DPAPI (`Export-Clixml`)
- Binds to `127.0.0.1` by default

See [docs/SECURITY.md](docs/SECURITY.md) and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Create GitHub repo

```bash
cd ~/mq-ums
git init
git branch -M main
git add .
git commit -m "initial mq-ums prototype"
gh repo create MCamner/mq-ums --private --source . --remote origin --push
```
