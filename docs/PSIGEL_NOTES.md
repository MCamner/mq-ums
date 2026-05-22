# PSIGEL Notes

[PSIGEL](https://github.com/MCamner/PSIGEL) is a PowerShell module for the IGEL UMS REST API.

## Auth pattern

```powershell
$cred = Import-Clixml -Path C:\mq-ums\ums.cred.xml
$ws   = New-UMSAPICookie -Hostname ums.example.com -TCPPort 8443 -Credential $cred

Get-UMSDevice -WebSession $ws

Remove-UMSAPICookie -WebSession $ws
```

mq-ums follows this pattern exactly in `scripts/Invoke-UmsCommand.ps1`.

## Commands in use

| mq-ums id | PSIGEL function | Danger |
|---|---|---|
| get-status | Get-UMSStatus | No |
| get-firmware | Get-UMSFirmware | No |
| get-device | Get-UMSDevice | No |
| get-profile | Get-UMSProfile | No |
| get-directory | Get-UMSDirectory | No |
| restart-device | Restart-UMSDevice | Yes |
| update-device-firmware | Update-UMSDeviceFirmware | Yes |
| move-device | Move-UMSDevice | Yes |

## Saving credentials (Windows)

```powershell
Get-Credential | Export-Clixml -Path C:\mq-ums\ums.cred.xml
```

Or use the helper script:

```powershell
.\scripts\New-UmsCredential.ps1 -Path C:\mq-ums\ums.cred.xml
```

## Adding new commands

1. Add an entry to `config/commands.json`
2. Run `npm run validate` to check the config
3. Restart the server

No code changes needed — the runner is fully data-driven.

## Useful PSIGEL references

- [Command reference](https://github.com/MCamner/PSIGEL/tree/master/Docs/Reference)
- [Scripting guide](https://github.com/MCamner/PSIGEL/blob/master/Docs/Guides/Scripting-with-PSIGEL.md)
