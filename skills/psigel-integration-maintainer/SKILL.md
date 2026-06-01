---
name: psigel-integration-maintainer
description: Use when changing mq-ums PowerShell scripts, PSIGEL integration, Windows install flow, credential handling, live UMS validation, or operational troubleshooting docs.
---

# PSIGEL Integration Maintainer

Use this skill for the Windows and PSIGEL side of mq-ums.

## Core Files

- `scripts/Invoke-UmsCommand.ps1`
- `scripts/install-windows.ps1`
- `scripts/New-UmsCredential.ps1`
- `scripts/Test-PSIGEL.ps1`
- `scripts/Test-LiveUmsValidation.ps1`
- `docs/PSIGEL_NOTES.md`
- `docs/LIVE_UMS_VALIDATION.md`
- `docs/SECURITY.md`
- `README.md`

## Integration Contract

- Credentials are stored with Windows DPAPI via `Export-Clixml`.
- `.env` points to credential path and UMS host; it must not contain credential contents.
- `Invoke-UmsCommand.ps1` receives an allowlisted `PsCommand` from Node.
- Live validation starts with read-only commands: `Get-UMSStatus`, `Get-UMSFirmware`, `Get-UMSDevice`.
- Troubleshooting docs must redact hostnames, usernames, tokens, credential paths, and UMS-sensitive output when needed.

## Change Rules

- Keep install and credential scripts Windows-focused and explicit.
- Do not add plaintext password storage.
- Do not broaden live validation into write actions without a separate explicit safety design.
- Keep examples copy-pasteable for PowerShell.
- Document prerequisites: PowerShell, PSIGEL, UMS reachability, credential XML, and `.env`.

## Verification

On macOS/Linux, run what is possible:

```bash
npm run validate
npm test
./release-check.sh
```

On a Windows management host with UMS access:

```powershell
.\scripts\Test-PSIGEL.ps1 -UmsHost <host> -CredPath <path>
.\scripts\Test-LiveUmsValidation.ps1
```

## Output Standard

Clearly separate locally verified checks from Windows/UMS checks that require the management host.
