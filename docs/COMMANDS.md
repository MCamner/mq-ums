# Command Reference

All commands are driven by `config/commands.json`. No raw PowerShell is executed from the browser — every command must be in this allowlist and every arg value is validated before being passed to PowerShell.

Read-only entries may declare a bounded `cacheTtlSeconds`. Dangerous entries
must not declare cache metadata; config validation rejects that combination.

Dangerous commands require typing **`RUN`** in the confirmation field. All executions are written to `logs/audit-YYYY-MM-DD.jsonl`.

---

## Status

### Get UMS Status

**PSIGEL command:** `Get-UMSStatus`

Returns UMS server status, version, and build information. Use this to verify connectivity.

No args required.

---

### Get Firmware

**PSIGEL command:** `Get-UMSFirmware`

Lists all firmware versions registered in UMS.

| Arg | Required | Notes |
|---|---|---|
| Id | Optional | Pass to get a specific firmware version |

---

## Devices

### Get Devices

**PSIGEL command:** `Get-UMSDevice`

Lists devices registered in UMS.

| Arg | Required | Notes |
|---|---|---|
| Id | Optional | Pass for a single device |
| Filter | Optional | `short` (default) \| `details` \| `online` \| `shadow` \| `deviceattributes` \| `networkadapters` |

---

### Start Device (Wake-on-LAN)

**PSIGEL command:** `Start-UMSDevice`  
**Confirmation required:** `RUN`

Sends a wake-on-LAN command to a device.

| Arg | Required | Notes |
|---|---|---|
| Id | Yes | Numeric device ID (from Get Devices) |

---

### Stop Device

**PSIGEL command:** `Stop-UMSDevice`  
**Confirmation required:** `RUN`

Shuts down a device.

| Arg | Required | Notes |
|---|---|---|
| Id | Yes | Numeric device ID |

---

### Restart Device

**PSIGEL command:** `Restart-UMSDevice`  
**Confirmation required:** `RUN`

Restarts a device.

| Arg | Required | Notes |
|---|---|---|
| Id | Yes | Numeric device ID |

---

### Send Device Settings

**PSIGEL command:** `Send-UMSDeviceSetting`  
**Confirmation required:** `RUN`

Pushes the current profile settings to a device immediately.

| Arg | Required | Notes |
|---|---|---|
| Id | Yes | Numeric device ID |

---

### Update Device

**PSIGEL command:** `Update-UMSDevice`  
**Confirmation required:** `RUN`

Updates device metadata fields.

| Arg | Required | Notes |
|---|---|---|
| Id | Yes | Numeric device ID |
| Name | Optional | New display name |
| Site | Optional | Site field |
| Department | Optional | Department field |
| CostCenter | Optional | Cost center field |
| Comment | Optional | Comment field |
| AssetId | Optional | Asset ID field |

---

### Move Device

**PSIGEL command:** `Move-UMSDevice`  
**Confirmation required:** `RUN`

Moves a device to a different directory.

| Arg | Required | Notes |
|---|---|---|
| Id | Yes | Numeric device ID |
| DestId | Yes | Destination directory ID (from Get Device Directories) |

---

### Remove Device

**PSIGEL command:** `Remove-UMSDevice`  
**Confirmation required:** `RUN`

Deletes a device from UMS. **Cannot be undone.**

| Arg | Required | Notes |
|---|---|---|
| Id | Yes | Numeric device ID |

---

### Reset Device to Factory Defaults

**PSIGEL command:** `Reset-UMSDevice`  
**Confirmation required:** `RUN`

Resets a device to factory defaults (2FA reset). **Cannot be undone.**

| Arg | Required | Notes |
|---|---|---|
| Id | Yes | Numeric device ID |

---

## Device Directories

### Get Device Directories

**PSIGEL command:** `Get-UMSDeviceDirectory`

Lists device directories.

| Arg | Required | Notes |
|---|---|---|
| Id | Optional | Pass for a specific directory |
| Filter | Optional | `children` to include child elements |

---

### New Device Directory

**PSIGEL command:** `New-UMSDeviceDirectory`  
**Confirmation required:** `RUN`

Creates a new device directory.

| Arg | Required | Notes |
|---|---|---|
| Name | Yes | Directory name |

---

### Rename Device Directory

**PSIGEL command:** `Update-UMSDeviceDirectory`  
**Confirmation required:** `RUN`

Renames a device directory.

| Arg | Required | Notes |
|---|---|---|
| Id | Yes | Directory ID |
| Name | Yes | New name |

---

### Move Device Directory

**PSIGEL command:** `Move-UMSDeviceDirectory`  
**Confirmation required:** `RUN`

Moves a device directory into another parent directory.

| Arg | Required | Notes |
|---|---|---|
| Id | Yes | Directory ID |
| DestId | Yes | Destination directory ID |

---

### Remove Device Directory

**PSIGEL command:** `Remove-UMSDeviceDirectory`  
**Confirmation required:** `RUN`

Deletes a device directory. **The directory must be empty.**

| Arg | Required | Notes |
|---|---|---|
| Id | Yes | Directory ID |

---

## Profiles

### Get Profiles

**PSIGEL command:** `Get-UMSProfile`

Lists all profiles registered in UMS.

| Arg | Required | Notes |
|---|---|---|
| Id | Optional | Pass for a specific profile |

---

### Rename Profile

**PSIGEL command:** `Update-UMSProfile`  
**Confirmation required:** `RUN`

Renames a profile.

| Arg | Required | Notes |
|---|---|---|
| Id | Yes | Profile ID |
| Name | Yes | New name |

---

### Move Profile

**PSIGEL command:** `Move-UMSProfile`  
**Confirmation required:** `RUN`

Moves a profile to a different profile directory.

| Arg | Required | Notes |
|---|---|---|
| Id | Yes | Profile ID |
| DestId | Yes | Destination profile directory ID |

---

### Remove Profile

**PSIGEL command:** `Remove-UMSProfile`  
**Confirmation required:** `RUN`

Deletes a profile from UMS. **Cannot be undone.**

| Arg | Required | Notes |
|---|---|---|
| Id | Yes | Profile ID |

---

## Profile Directories

### Get Profile Directories

**PSIGEL command:** `Get-UMSProfileDirectory`

Lists profile directories.

| Arg | Required | Notes |
|---|---|---|
| Id | Optional | Pass for a specific directory |
| Filter | Optional | `children` to include child elements |

---

### New Profile Directory

**PSIGEL command:** `New-UMSProfileDirectory`  
**Confirmation required:** `RUN`

Creates a new profile directory.

| Arg | Required | Notes |
|---|---|---|
| Name | Yes | Directory name |

---

### Rename Profile Directory

**PSIGEL command:** `Update-UMSProfileDirectory`  
**Confirmation required:** `RUN`

Renames a profile directory.

| Arg | Required | Notes |
|---|---|---|
| Id | Yes | Directory ID |
| Name | Yes | New name |

---

### Move Profile Directory

**PSIGEL command:** `Move-UMSProfileDirectory`  
**Confirmation required:** `RUN`

Moves a profile directory into another parent directory.

| Arg | Required | Notes |
|---|---|---|
| Id | Yes | Directory ID |
| DestId | Yes | Destination directory ID |

---

### Remove Profile Directory

**PSIGEL command:** `Remove-UMSProfileDirectory`  
**Confirmation required:** `RUN`

Deletes a profile directory. **The directory must be empty.**

| Arg | Required | Notes |
|---|---|---|
| Id | Yes | Directory ID |

---

## Assignments

### Get Device Assignments

**PSIGEL command:** `Get-UMSDeviceAssignment`

Lists all profiles currently assigned to a specific device.

| Arg | Required | Notes |
|---|---|---|
| Id | Yes | Device ID |

---

### Get Device Directory Assignments

**PSIGEL command:** `Get-UMSDeviceDirectoryAssignment`

Lists all profiles assigned to a device directory.

| Arg | Required | Notes |
|---|---|---|
| Id | Yes | Device directory ID |

---

### Get Profile Assignments

**PSIGEL command:** `Get-UMSProfileAssignment`

Lists all devices and directories that a profile is assigned to.

| Arg | Required | Notes |
|---|---|---|
| Id | Yes | Profile ID |

---

### Assign Profile

**PSIGEL command:** `New-UMSProfileAssignment`  
**Confirmation required:** `RUN`

Assigns a profile to a device or device directory.

| Arg | Required | Notes |
|---|---|---|
| Id | Yes | Profile ID |
| ReceiverId | Yes | Target device or directory ID |
| ReceiverType | Yes | `tc` (device) or `tcdirectory` (device directory) |

---

### Remove Profile Assignment

**PSIGEL command:** `Remove-UMSProfileAssignment`  
**Confirmation required:** `RUN`

Removes a profile assignment from a device or device directory.

| Arg | Required | Notes |
|---|---|---|
| Id | Yes | Profile ID |
| ReceiverId | Yes | Target device or directory ID |
| ReceiverType | Yes | `tc` or `tcdirectory` |

---

## Adding commands

Edit `config/commands.json` and run `npm run validate` to verify. No code changes needed — the runner is fully data-driven.

Requirements for a new entry:

```json
{
  "id": "kebab-case-id",
  "section": "Section Name",
  "name": "Human Name",
  "psCommand": "Verb-UMSNoun",
  "allowedArgs": ["ArgName"],
  "danger": false,
  "description": "One-line description."
}
```

For dangerous commands also add `"confirmText": "RUN"`.

**Arg name rules:** must match `^[A-Za-z]\w{0,63}$` (alphanumeric + underscore, starts with letter).  
**psCommand rules:** must match `^[A-Za-z]+-[A-Za-z]+$` (PowerShell Verb-Noun). Verb must be one of: `Get`, `Set`, `New`, `Remove`, `Move`, `Start`, `Stop`, `Restart`, `Reset`, `Send`, `Update`.

## Dry-run mode

Any command can be previewed without execution by checking **Dry run** in the UI. The server returns what would have been sent to PowerShell without spawning `pwsh`.

## Audit log

Every command execution (including dry runs) is written to `logs/audit-YYYY-MM-DD.jsonl`. The log contains timestamp, commandId, psCommand, sanitized args, danger flag, dryRun flag, status, and duration. Credential paths and raw output are never logged.
