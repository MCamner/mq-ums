# Architecture

```
Browser UI  (web/)
    ↓  HTTP POST /api/run
Node.js Express  (server/src/index.js)
    ↓  spawn pwsh
PowerShell runner  (scripts/Invoke-UmsCommand.ps1)
    ↓  Import-Module PSIGEL
PSIGEL module
    ↓  HTTPS REST
IGEL UMS / IMI REST API
```

## Components

### Web UI (`web/`)
Vanilla JS, no build step. Loads command list from `/api/commands`, renders
args fields, handles confirm dialog for dangerous commands, displays JSON output.

### Express API (`server/src/index.js`)
- `GET /api/commands` — returns allowlisted command definitions
- `POST /api/run` — validates commandId, args, confirmText, then spawns PowerShell
- Serves static web UI
- Optional API key via `MQ_UMS_API_KEY`
- Binds to `127.0.0.1` by default

### Config (`config/commands.json`)
Source of truth for the command allowlist. Validated on startup. Each entry defines:
- `id` — URL-safe identifier
- `psCommand` — exact PSIGEL function name (validated as `Verb-Noun`)
- `allowedArgs` — whitelist of parameter names
- `danger` — if true, requires `confirmText` in the request
- `confirmText` — must equal `"RUN"` for dangerous commands

### PowerShell runner (`scripts/Invoke-UmsCommand.ps1`)
Called by the server with pre-validated args. Creates a UMS session via
`New-UMSAPICookie`, runs the command, tears down the session, outputs JSON.

## Security boundaries

| Boundary | Rule |
|---|---|
| Browser → API | No raw PowerShell. Only command IDs and string args. |
| API → Config | commandId must exist in commands.json |
| API → Args | Only keys in `allowedArgs` pass through; values checked against safe charset |
| Dangerous commands | Blocked unless `confirmText == "RUN"` |
| Network | API binds to 127.0.0.1 by default |
| Credentials | Stored via PowerShell DPAPI Export-Clixml, never in .env |
