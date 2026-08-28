# Security

## What mq-ums does NOT do

- Does not accept raw PowerShell from the browser
- Does not expose `Invoke-Expression` or any eval-style execution
- Does not store credentials in `.env` or plaintext files
- Does not bind to `0.0.0.0` by default

## Threat model

mq-ums is designed to run **locally on the Windows server** that can reach the IGEL UMS.
The intended access pattern is: operator opens browser on the same machine, or accesses
via SSH tunnel. It is not designed to be exposed to the public internet.

## Allowlist

Only commands listed in `config/commands.json` can be executed. The `psCommand`
field is validated against `/^[A-Za-z]+-[A-Za-z]+$/` at startup — no shell
metacharacters can reach PowerShell.

Arg values are validated against `/^[\w\s.,@:/\\-]{0,256}$/`. Any value outside
this charset is rejected before reaching the PowerShell runner.

## Dangerous commands

Commands with `"danger": true` require the request body to include:

```json
{ "confirmText": "RUN" }
```

The UI forces the operator to type the confirm word manually. This prevents
accidental execution of `Restart-*`, `Remove-*`, `Update-*` commands.

## Credentials

UMS credentials are stored via PowerShell `Export-Clixml`, which encrypts the
file using Windows DPAPI tied to the current user account. The credential file
path is set in `.env` as `MQ_UMS_CRED_PATH` and is never logged.

## Optional API key

Set `MQ_UMS_API_KEY` in `.env` to require `X-Api-Key: <key>` on all API calls.
Leave empty to disable (safe when binding to 127.0.0.1 only).
The key is accepted only through the header, never through a querystring.

## Audit and history redaction

Audit rows store command metadata and argument names, never argument values or
raw UMS results. `/api/history` exposes only contract-valid redacted rows.
PowerShell errors are redacted before they enter either the API response or the
audit metadata.

## Recommendations

- Keep `MQ_UMS_BIND=127.0.0.1` unless you have a specific reason to expose it
- Use SSH port forwarding if remote access is needed
- Do not commit `.env` or `*.cred.xml` files
- Run `.\scripts\Test-PSIGEL.ps1` before first use to verify connectivity
