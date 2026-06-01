# Live UMS Validation

mq-ums v0.1.4 focuses on validating the prototype against a real IGEL UMS
environment without expanding the command surface.

This document is intentionally operational. It should be completed on a Windows
management host that can reach IGEL UMS and has PSIGEL installed.

## Goal

Verify that mq-ums can safely run read-only PSIGEL commands against live UMS:

```powershell
Get-UMSStatus
Get-UMSFirmware
Get-UMSDevice
```

## Preconditions

- Windows Server or controlled Windows management host
- PowerShell 7+
- Node.js 18+
- PSIGEL module installed
- Network path to IGEL UMS
- UMS account with read-only permissions where possible
- DPAPI credential file created with `scripts/New-UmsCredential.ps1`
- `.env` configured with `MQ_UMS_HOST`, `MQ_UMS_PORT` and `MQ_UMS_CRED_PATH`

## Safety Rules

- Do not test write commands during v0.1.4 validation.
- Do not put credentials in `.env`.
- Do not paste credential values into issues, logs or screenshots.
- Keep `MQ_UMS_BIND=127.0.0.1` unless there is a specific controlled reason.
- Use dry-run before any live execution path.
- Redact hostnames, usernames, domains, serials and device names before sharing output.

## Validation Commands

From the repo root:

```powershell
npm test
npm run validate
.\scripts\Test-PSIGEL.ps1 -UmsHost $env:MQ_UMS_HOST -UmsPort $env:MQ_UMS_PORT -CredPath $env:MQ_UMS_CRED_PATH
.\scripts\Test-LiveUmsValidation.ps1
```

Then start the local app:

```powershell
npm start
```

Open:

```text
http://127.0.0.1:8787
```

## Live Checklist

### Environment

- [ ] PowerShell 7+ confirmed
- [ ] PSIGEL module imports successfully
- [ ] Credential file exists
- [ ] Credential file loads through DPAPI
- [ ] UMS session can be created
- [ ] UMS session can be removed

### Dry-run

- [ ] `get-status` dry-run returns `Get-UMSStatus`
- [ ] `get-firmware` dry-run returns `Get-UMSFirmware`
- [ ] `get-device` dry-run returns `Get-UMSDevice`
- [ ] Dry-run does not spawn PSIGEL execution
- [ ] Dry-run writes audit entry with `dryRun: true`

### Live read-only commands

- [ ] `Get-UMSStatus` succeeds
- [ ] `Get-UMSFirmware` succeeds
- [ ] `Get-UMSDevice` succeeds
- [ ] Live commands return JSON or parseable raw output
- [ ] Failed live commands return clear error text

### Audit and secret handling

- [ ] Audit log records command id
- [ ] Audit log records PSIGEL command name
- [ ] Audit log records status
- [ ] Audit log records duration when available
- [ ] Audit log does not contain credential path contents
- [ ] Audit log does not contain password, token or API key values
- [ ] Browser response does not contain secrets

## Sample Redacted Output

```text
[check] environment
[PASS] PowerShell 7+
[PASS] PSIGEL module imports
[PASS] credential file loads
[PASS] UMS session create/remove

[check] dry-run
[PASS] get-status dry-run
[PASS] get-firmware dry-run
[PASS] get-device dry-run

[check] live read-only
[PASS] Get-UMSStatus
[PASS] Get-UMSFirmware
[PASS] Get-UMSDevice

[check] audit
[PASS] audit log exists
[PASS] no obvious secret markers found
```

## Troubleshooting

### PSIGEL module missing

Run:

```powershell
Install-Module PSIGEL -Scope CurrentUser
```

Then verify:

```powershell
Import-Module PSIGEL
Get-Command -Module PSIGEL
```

### Credential file missing

Create it with:

```powershell
.\scripts\New-UmsCredential.ps1 -Path C:\mq-ums\ums.cred.xml
```

Do not commit or share the generated credential file.

### UMS connection fails

Check:

- `MQ_UMS_HOST`
- `MQ_UMS_PORT`
- DNS resolution
- firewall rules
- certificate/TLS requirements
- account permissions

### Session teardown fails

The runner attempts `Remove-UMSAPICookie` in a `finally` block. If teardown
still fails, capture redacted error output and verify the installed PSIGEL
version.

### Certificate or TLS problems

Confirm that the management host trusts the UMS certificate chain and that the
configured UMS port is correct.

### Permission errors

Start with the smallest read-only permissions needed for:

- `Get-UMSStatus`
- `Get-UMSFirmware`
- `Get-UMSDevice`

If those fail, validate the same commands directly in PowerShell before using
the browser UI.
