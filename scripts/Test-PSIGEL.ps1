<#
.SYNOPSIS
    Tests PSIGEL installation and optionally UMS connectivity.

.EXAMPLE
    .\Test-PSIGEL.ps1
    .\Test-PSIGEL.ps1 -UmsHost ums.example.com -CredPath C:\mq-ums\ums.cred.xml
#>
[CmdletBinding()]
param(
    [string] $UmsHost,
    [string] $UmsPort = "8443",
    [string] $CredPath
)

Set-StrictMode -Version Latest
$pass = 0; $fail = 0

function Check($label, $test) {
    try {
        & $test | Out-Null
        Write-Host "  [OK]  $label" -ForegroundColor Green
        $script:pass++
    } catch {
        Write-Host "  [FAIL] $label — $_" -ForegroundColor Red
        $script:fail++
    }
}

Write-Host "`nmq-ums PSIGEL Test`n==================`n"

Check "PowerShell version >= 7" {
    if ($PSVersionTable.PSVersion.Major -lt 7) { throw "PowerShell 7+ required" }
}

Check "PSIGEL module installed" {
    Import-Module PSIGEL -ErrorAction Stop
    $ver = (Get-Module PSIGEL).Version
    Write-Host "      Version: $ver" -ForegroundColor DarkGray
}

Check "PSIGEL commands available" {
    $cmds = Get-Command -Module PSIGEL | Select-Object -ExpandProperty Name
    if ($cmds.Count -lt 5) { throw "Fewer than 5 commands found" }
    Write-Host "      Commands: $($cmds.Count)" -ForegroundColor DarkGray
}

if ($CredPath) {
    Check "Credential file exists" {
        if (-not (Test-Path $CredPath)) { throw "Not found: $CredPath" }
    }

    Check "Credential file loadable" {
        $cred = Import-Clixml -Path $CredPath
        if (-not $cred) { throw "Credential is empty" }
    }
}

if ($UmsHost -and $CredPath) {
    Import-Module PSIGEL -ErrorAction SilentlyContinue
    $credential = Import-Clixml -Path $CredPath

    Check "UMS session (New-UMSAPICookie)" {
        $ws = New-UMSAPICookie -Hostname $UmsHost -TCPPort $UmsPort -Credential $credential
        Remove-UMSAPICookie -WebSession $ws
    }
}

Write-Host "`nResult: $pass passed, $fail failed`n"
exit $(if ($fail -gt 0) { 1 } else { 0 })
