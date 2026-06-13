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

.EXAMPLE
    .\scripts\Test-LiveUmsValidation.ps1 -EmitStatus .\out\ums_connection_status.v1.json
#>
[CmdletBinding()]
param(
    [string] $UmsHost = $env:MQ_UMS_HOST,
    [string] $UmsPort = $(if ($env:MQ_UMS_PORT) { $env:MQ_UMS_PORT } else { "8443" }),
    [string] $CredPath = $env:MQ_UMS_CRED_PATH,

    # Optional path to write a machine-readable ums_connection_status.v1 JSON.
    # The emitted file contains only booleans, a timestamp and generic finding
    # text — never hostnames, credentials, session IDs or device data.
    [string] $EmitStatus
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot = Split-Path -Parent $PSScriptRoot
$Runner = Join-Path $RepoRoot "scripts/Invoke-UmsCommand.ps1"
$AuditDir = Join-Path $RepoRoot "logs"
$Pass = 0
$Fail = 0

# Per-check outcomes for the ums_connection_status.v1 contract. Keys default to
# $false so an aborted run still emits an honest "unproven" status.
$Status = [ordered]@{
    ums_host_configured = $false
    cred_file_present   = $false
    psigel_available    = $false
    session_create_ok   = $false
    session_remove_ok   = $false
    get_status_ok       = $false
}
$Findings = @()

function Pass($Label) {
    Write-Host "[PASS] $Label" -ForegroundColor Green
    $script:Pass++
}

function Fail($Label, $Message) {
    Write-Host "[FAIL] $Label" -ForegroundColor Red
    if ($Message) {
        $Redacted = "$Message"
        # Only redact the cred path when it is non-empty; an empty pattern would
        # match between every character and shred the message.
        if ($CredPath) {
            $Redacted = $Redacted -replace [regex]::Escape("$CredPath"), "<redacted-cred-path>"
        }
        $Redacted = $Redacted -replace "(?i)(password|token|apikey|api_key|secret)\s*[:=]\s*\S+", '$1=<redacted>'
        Write-Host "       $Redacted" -ForegroundColor DarkGray
    }
    $script:Fail++
}

function Check($Label, [scriptblock] $Block, $Key) {
    try {
        & $Block | Out-Null
        Pass $Label
        if ($Key) { $script:Status[$Key] = $true }
    } catch {
        Fail $Label $_.Exception.Message
        if ($Key) { $script:Status[$Key] = $false }
        $script:Findings += "$Label failed"
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
} "psigel_available"

Check "credential path configured" {
    if (-not $CredPath) {
        throw "MQ_UMS_CRED_PATH or -CredPath is required"
    }
    if (-not (Test-Path $CredPath)) {
        throw "Credential file not found"
    }
} "cred_file_present"

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
} "ums_host_configured"

# This single check covers both session_create_ok and session_remove_ok. The
# booleans are set inside the block so a clean create but failed teardown is
# reported honestly (create true, remove false).
Check "UMS session create/remove" {
    $Credential = Import-Clixml -Path $CredPath
    $Session = New-UMSAPICookie -Computername $UmsHost -TCPPort ([int]$UmsPort) -Credential $Credential
    $script:Status['session_create_ok'] = $true
    Remove-UMSAPICookie -Computername $UmsHost -TCPPort ([int]$UmsPort) -WebSession $Session
    $script:Status['session_remove_ok'] = $true
}

Write-Host ""
Write-Host "[check] live read-only commands"

Check "Get-UMSStatus" {
    Run-MqUmsCommand "get-status" "Get-UMSStatus"
} "get_status_ok"

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

if ($EmitStatus) {
    $AllOk = -not ($Status.Values -contains $false)
    if (-not $AllOk -and $Findings.Count -eq 0) {
        $Findings += "Live UMS validation has not been run against a real server yet"
    }

    $StatusDoc = [ordered]@{
        schema              = "ums_connection_status.v1"
        source              = "mq-ums"
        mode                = "read-only"
        generated_at        = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        ums_host_configured = [bool] $Status['ums_host_configured']
        cred_file_present   = [bool] $Status['cred_file_present']
        psigel_available    = [bool] $Status['psigel_available']
        session_create_ok   = [bool] $Status['session_create_ok']
        session_remove_ok   = [bool] $Status['session_remove_ok']
        get_status_ok       = [bool] $Status['get_status_ok']
        risk                = $(if ($AllOk) { "low" } else { "unknown" })
        findings            = @($Findings)
    }

    $EmitDir = Split-Path -Parent $EmitStatus
    if ($EmitDir -and -not (Test-Path $EmitDir)) {
        New-Item -ItemType Directory -Path $EmitDir -Force | Out-Null
    }
    $StatusDoc | ConvertTo-Json -Depth 4 | Set-Content -Path $EmitStatus -Encoding utf8
    Write-Host "Wrote ums_connection_status.v1 to $EmitStatus"
    Write-Host ""
}

if ($Fail -gt 0) {
    exit 1
}
