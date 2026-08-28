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

.EXAMPLE
    .\scripts\Test-LiveUmsValidation.ps1 -ViaApi -ApiKey $env:MQ_UMS_API_KEY -EmitStatus .\out\ums_connection_status.v1.json
#>
[CmdletBinding()]
[Diagnostics.CodeAnalysis.SuppressMessageAttribute(
    'PSAvoidUsingPlainTextForPassword', 'CredPath',
    Justification = 'CredPath is a filesystem path to a DPAPI-encrypted credential file, not a password value.')]
param(
    [string] $UmsHost = $env:MQ_UMS_HOST,
    [string] $UmsPort = $(if ($env:MQ_UMS_PORT) { $env:MQ_UMS_PORT } else { "8443" }),
    [string] $CredPath = $env:MQ_UMS_CRED_PATH,
    [switch] $ViaApi,
    [string] $ApiBase = "http://127.0.0.1:8787",
    [string] $ApiKey = $env:MQ_UMS_API_KEY,

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
    api_health_ok       = $false
    api_commands_ok     = $false
    api_run_ok          = $false
    audit_history_ok    = $false
}
$Findings = @()
$ApiRequestIds = @()

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

function Invoke-MqUmsCommand($CommandId, $PsCommand, $CommandArgs = @{}) {
    if ($ViaApi) {
        $Headers = @{}
        if ($ApiKey) { $Headers['x-api-key'] = $ApiKey }
        $Body = @{
            commandId   = $CommandId
            args        = $CommandArgs
            dryRun      = $false
            bypassCache = $true
        } | ConvertTo-Json -Depth 5
        $Response = Invoke-RestMethod -Method Post -Uri "$ApiBase/api/run" `
            -Headers $Headers -ContentType "application/json" -Body $Body
        if ($Response.schema -ne "ums_command_result.v1" -or $Response.source -ne "live") {
            throw "API returned an unexpected command result contract"
        }
        $script:ApiRequestIds += "$($Response.request_id)"
        return $Response.data
    }
    $ArgsJson = $CommandArgs | ConvertTo-Json -Compress
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

if ($ViaApi) {
    Check "Node API health" {
        $Headers = @{}
        if ($ApiKey) { $Headers['x-api-key'] = $ApiKey }
        $Response = Invoke-RestMethod -Uri "$ApiBase/api/health" -Headers $Headers
        if (-not $Response.ok) { throw "API health is not OK" }
    } "api_health_ok"
    Check "Node API command catalog" {
        $Headers = @{}
        if ($ApiKey) { $Headers['x-api-key'] = $ApiKey }
        $Response = Invoke-RestMethod -Uri "$ApiBase/api/commands" -Headers $Headers
        if (-not $Response.commands -or $Response.commands.Count -lt 1) {
            throw "API returned no commands"
        }
    } "api_commands_ok"
}

$ApiRunFailuresBefore = $Fail

Check "Get-UMSStatus" {
    Invoke-MqUmsCommand "get-status" "Get-UMSStatus"
} "get_status_ok"

Check "Get-UMSFirmware" {
    Invoke-MqUmsCommand "get-firmware" "Get-UMSFirmware"
}

Check "Get-UMSDevice" {
    Invoke-MqUmsCommand "get-device" "Get-UMSDevice"
}

if ($ViaApi) {
    $Status['api_run_ok'] = ($Fail -eq $ApiRunFailuresBefore -and $ApiRequestIds.Count -eq 3)
    Check "API audit history correlates all live requests" {
        $Headers = @{}
        if ($ApiKey) { $Headers['x-api-key'] = $ApiKey }
        $History = Invoke-RestMethod -Uri "$ApiBase/api/history?limit=20" -Headers $Headers
        if ($History.schema -ne "ums_command_history.v1") {
            throw "API returned an unexpected history contract"
        }
        $HistoryIds = @($History.entries | ForEach-Object { "$($_.request_id)" })
        foreach ($RequestId in $ApiRequestIds) {
            if ($RequestId -notin $HistoryIds) { throw "Live request missing from audit history" }
        }
    } "audit_history_ok"
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
        api_health_ok       = [bool] $Status['api_health_ok']
        api_commands_ok     = [bool] $Status['api_commands_ok']
        api_run_ok          = [bool] $Status['api_run_ok']
        audit_history_ok    = [bool] $Status['audit_history_ok']
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
