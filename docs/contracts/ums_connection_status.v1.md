# Contract: `ums_connection_status.v1`

A machine-readable summary of whether `mq-ums` can reach and authenticate
against a live IGEL UMS server in **read-only** mode.

This is the bridge artifact for downstream consumers (`mq-agent`, `mq-mcp`):
it answers "is the UMS path proven yet?" without exposing any secrets,
hostnames, or device data.

## How it is produced

This contract is **not** a new connection path. It is emitted by the existing
live validation flow:

```powershell
.\scripts\Test-LiveUmsValidation.ps1 -EmitStatus .\out\ums_connection_status.v1.json
```

The validation script connects the same way the Node API does — through PSIGEL
and a DPAPI credential file — so the status reflects the real architecture:

```text
Test-LiveUmsValidation.ps1
  → PSIGEL (New-UMSAPICookie / Get-UMSStatus / Remove-UMSAPICookie)
  → IGEL UMS
```

No write commands are ever issued. See [LIVE_UMS_VALIDATION.md](../LIVE_UMS_VALIDATION.md).

## Fields

| Field                 | Type      | Meaning |
|-----------------------|-----------|---------|
| `schema`              | string    | Always `ums_connection_status.v1`. |
| `source`              | string    | Always `mq-ums`. |
| `mode`                | string    | Always `read-only` for this contract. |
| `generated_at`        | string    | ISO-8601 UTC timestamp of the validation run. |
| `ums_host_configured` | bool      | `MQ_UMS_HOST` / `-UmsHost` is set. |
| `cred_file_present`   | bool      | DPAPI credential file exists at `MQ_UMS_CRED_PATH`. |
| `psigel_available`    | bool      | PSIGEL module imports successfully. |
| `session_create_ok`   | bool      | `New-UMSAPICookie` succeeded. |
| `session_remove_ok`   | bool      | `Remove-UMSAPICookie` succeeded (clean teardown). |
| `get_status_ok`       | bool      | `Get-UMSStatus` returned. |
| `risk`                | string    | `low` when the read-only path is fully proven, else `unknown`. |
| `findings`            | string[]  | Human-readable notes; failed checks are listed here. |

## Risk semantics

- `low` — every boolean above is `true`: host configured, credential present,
  PSIGEL available, session create/remove clean, and `Get-UMSStatus` returned.
  The read-only path is proven end-to-end.
- `unknown` — any check failed or has not run. **Never** interpret `unknown`
  as "safe to write." This contract makes no claim about write operations.

## Secret-handling guarantees

The emitted JSON contains **only booleans, a timestamp, and generic finding
text**. It carries no hostnames, usernames, credential paths, session IDs, or
device data. `findings` entries are check labels, never error payloads. Safe to
attach to issues and to forward to `mq-agent` / `mq-mcp`.

## Example

See [`examples/ums_connection_status.v1.json`](../../examples/ums_connection_status.v1.json)
— the unproven default state (all `false`, `risk: unknown`).
