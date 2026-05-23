<#
.SYNOPSIS
    Runs the mq-ums v0.1.4 live read-only validation flow.

.DESCRIPTION
    This script validates the live UMS path for the three v0.1.4 read-only
    commands. It uses the same allowlisted PowerShell runner as the Node API.

    It does not print credentials or credential contents.

.EXAMPLE
    .\scripts\Test-LiveUmsValidation.ps1

.EXAMPLE
    .\scripts\Test-LiveUmsValidation.ps1 -UmsHost ums.example.com -CredPath C:\mq-ums\ums.cred.xml
#>
[CmdletBinding()]
param(
    [string] $UmsHost = $env:MQ_UMS_HOST,
    [string] $UmsPort = $(if ($env:MQ_UMS_PORT) { $env:MQ_UMS_PORT } else { "8443" }),
    [string] $CredPath = $env:MQ_UMS_CRED_PATH
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot = Split-Path -Parent $PSScriptRoot
$Runner = Join-Path $RepoRoot "scripts/Invoke-UmsCommand.ps1"
$AuditDir = Join-Path $RepoRoot "logs"
$Pass = 0
$Fail = 0

function Pass($Label) {
    Write-Host "[PASS] $Label" -ForegroundColor Green
    $script:Pass++
}

function Fail($Label, $Message) {
    Write-Host "[FAIL] $Label" -ForegroundColor Red
    if ($Message) {
        $Redacted = "$Message" `
            -replace [regex]::Escape("$CredPath"), "<redacted-cred-path>" `
            -replace "(?i)(password|token|apikey|api_key|secret)\s*[:=]\s*\S+", '$1=<redacted>'
        Write-Host "       $Redacted" -ForegroundColor DarkGray
    }
    $script:Fail++
}

function Check($Label, [scriptblock] $Block) {
    try {
        & $Block | Out-Null
        Pass $Label
    } catch {
        Fail $Label $_.Exception.Message
    }
}

function Run-MqUmsCommand($CommandId, $PsCommand, $Args = @{}) {
    $ArgsJson = $Args | ConvertTo-Json -Compress
    & $Runner `
        -CommandId $CommandId `
        -PsCommand $PsCommand `
        -ArgsJson $ArgsJson `
        -UmsHost $UmsHost `
        -UmsPort $UmsPort `
        -CredPath $CredPath
}

Write-Host ""
Write-Host "mq-ums v0.1.4 live UMS validation"
Write-Host "=================================="
Write-Host ""

Check "PowerShell version >= 7" {
    if ($PSVersionTable.PSVersion.Major -lt 7) {
        throw "PowerShell 7+ required"
    }
}

Check "PSIGEL module imports" {
    Import-Module PSIGEL -ErrorAction Stop
}

Check "credential path configured" {
    if (-not $CredPath) {
        throw "MQ_UMS_CRED_PATH or -CredPath is required"
    }
    if (-not (Test-Path $CredPath)) {
        throw "Credential file not found"
    }
}

Check "credential file loads through DPAPI" {
    $Credential = Import-Clixml -Path $CredPath
    if (-not $Credential) {
        throw "Credential file loaded empty"
    }
}

Check "UMS host configured" {
    if (-not $UmsHost) {
        throw "MQ_UMS_HOST or -UmsHost is required"
    }
}

Check "UMS session create/remove" {
    $Credential = Import-Clixml -Path $CredPath
    $Session = New-UMSAPICookie -Computername $UmsHost -TCPPort ([int]$UmsPort) -Credential $Credential
    Remove-UMSAPICookie -Computername $UmsHost -TCPPort ([int]$UmsPort) -WebSession $Session
}

Write-Host ""
Write-Host "[check] live read-only commands"

Check "Get-UMSStatus" {
    Run-MqUmsCommand "get-status" "Get-UMSStatus"
}

Check "Get-UMSFirmware" {
    Run-MqUmsCommand "get-firmware" "Get-UMSFirmware"
}

Check "Get-UMSDevice" {
    Run-MqUmsCommand "get-device" "Get-UMSDevice"
}

Write-Host ""
Write-Host "[check] audit log"

Check "audit directory exists or can be created" {
    if (-not (Test-Path $AuditDir)) {
        New-Item -ItemType Directory -Path $AuditDir | Out-Null
    }
}

Check "no obvious secret markers in latest audit log" {
    $Latest = Get-ChildItem -Path $AuditDir -Filter "audit-*.jsonl" -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    if (-not $Latest) {
        return
    }

    $Content = Get-Content -Raw -Path $Latest.FullName
    if ($Content -match "(?i)password|token|api[_-]?key|secret") {
        throw "Potential secret marker found in $($Latest.Name)"
    }
}

Write-Host ""
Write-Host "Result: $Pass passed, $Fail failed"
Write-Host ""

if ($Fail -gt 0) {
    exit 1
}
