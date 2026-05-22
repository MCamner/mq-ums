# Command Reference

All commands are driven by `config/commands.json`. No raw PowerShell is executed from the browser — every command must be in this allowlist and every arg value is validated before being passed to PowerShell.

---

## Read-only commands

### Get UMS Status

**PSIGEL command:** `Get-UMSStatus`

Returns UMS server status and version information. Good first command to verify connectivity.

No args required.

---

### Get Firmware

**PSIGEL command:** `Get-UMSFirmware`

Lists all firmware versions registered in UMS.

No args required.

---

### Get Devices

**PSIGEL command:** `Get-UMSDevice`

Lists all devices registered in UMS.

| Arg | Required | Notes |
|---|---|---|
| Filter | Optional | Pass `details` for extended device info |

---

### Get Profiles

**PSIGEL command:** `Get-UMSProfile`

Lists all configuration profiles registered in UMS.

No args required.

---

### Get Directories

**PSIGEL command:** `Get-UMSDirectory`

Returns the UMS directory tree structure.

No args required.

---

## Dangerous commands

These require typing **`RUN`** in the confirmation field. The Run button stays disabled until the exact confirmation word is entered. All dangerous commands are also logged to the audit log.

### Restart Device

**PSIGEL command:** `Restart-UMSDevice`  
**Confirmation required:** `RUN`

Sends a restart instruction to a specific thin client.

| Arg | Required | Notes |
|---|---|---|
| Id | Yes | Numeric device ID (from Get Devices) |

---

### Update Device Firmware

**PSIGEL command:** `Update-UMSDeviceFirmware`  
**Confirmation required:** `RUN`

Assigns a new firmware version to a device. The firmware update is applied on the next device check-in.

| Arg | Required | Notes |
|---|---|---|
| Id | Yes | Numeric device ID |
| FirmwareId | Yes | Firmware version ID (from Get Firmware) |

---

### Move Device

**PSIGEL command:** `Move-UMSDevice`  
**Confirmation required:** `RUN`

Moves a device to a different directory in the UMS tree.

| Arg | Required | Notes |
|---|---|---|
| Id | Yes | Numeric device ID |
| DestId | Yes | Destination directory ID (from Get Directories) |

---

## Adding commands

Edit `config/commands.json` and run `npm run validate` to verify. No code changes needed — the runner is fully data-driven.

Requirements for a new entry:

```json
{
  "id": "kebab-case-id",
  "name": "Human Name",
  "psCommand": "Verb-UMSNoun",
  "allowedArgs": ["ArgName"],
  "danger": false,
  "description": "One-line description."
}
```

For dangerous commands also add `"confirmText": "RUN"`.

**Arg name rules:** must match `^[A-Za-z]\w{0,63}$` (alphanumeric + underscore, starts with letter).  
**psCommand rules:** must match `^[A-Za-z]+-[A-Za-z]+$` (standard PowerShell Verb-Noun pattern).

## Dry-run mode

Any command can be previewed without execution by checking **Dry run** in the UI. The server returns what would have been sent to PowerShell without spawning `pwsh`. Useful for verifying args before running a dangerous command.

## Audit log

Every command execution (including dry runs) is written to `logs/audit-YYYY-MM-DD.jsonl`. The log contains timestamp, commandId, psCommand, sanitized args, danger flag, dryRun flag, status, and duration. Credential paths and raw output are never logged.
