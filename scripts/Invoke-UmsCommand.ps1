<#
.SYNOPSIS
    Runs a single allowlisted PSIGEL command and outputs the result as JSON.
    Called by the Node.js backend — do not run manually.

.NOTES
    Args are validated and allowlisted server-side before this script is called.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)] [string] $CommandId,
    [Parameter(Mandatory)] [string] $PsCommand,
    [Parameter(Mandatory)] [string] $ArgsJson,
    [Parameter(Mandatory)] [string] $UmsHost,
    [Parameter(Mandatory)] [string] $UmsPort,
    [Parameter(Mandatory)] [string] $CredPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-JsonResult($data) {
    $data | ConvertTo-Json -Depth 10 -Compress
}

function Write-JsonError($message) {
    @{ error = $message } | ConvertTo-Json -Compress
    exit 1
}

# Validate inputs
if (-not $UmsHost)   { Write-JsonError "MQ_UMS_HOST is not set"; exit 1 }
if (-not $CredPath)  { Write-JsonError "MQ_UMS_CRED_PATH is not set"; exit 1 }
if (-not (Test-Path $CredPath)) { Write-JsonError "Credential file not found: $CredPath"; exit 1 }

# Load PSIGEL
try {
    Import-Module PSIGEL -ErrorAction Stop
} catch {
    Write-JsonError "Failed to import PSIGEL module: $_"
    exit 1
}

# Load credential
try {
    $credential = Import-Clixml -Path $CredPath
} catch {
    Write-JsonError "Failed to load credential from $CredPath: $_"
    exit 1
}

# Parse args
try {
    $cmdArgs = $ArgsJson | ConvertFrom-Json -AsHashtable
} catch {
    Write-JsonError "Failed to parse ArgsJson: $_"
    exit 1
}

# Create UMS session
$webSession = $null
try {
    $webSession = New-UMSAPICookie -Computername $UmsHost -TCPPort ([int]$UmsPort) -Credential $credential
} catch {
    Write-JsonError "Failed to create UMS session: $_"
    exit 1
}

# Run command
# Computername and TCPPort are required by all PSIGEL functions alongside WebSession
try {
    $splat = @{
        Computername = $UmsHost
        TCPPort      = [int]$UmsPort
        WebSession   = $webSession
    }
    foreach ($key in $cmdArgs.Keys) {
        $splat[$key] = $cmdArgs[$key]
    }

    $result = & $PsCommand @splat
    Write-JsonResult $result
} catch {
    Write-JsonError "Command '$PsCommand' failed: $_"
} finally {
    if ($webSession) {
        try { Remove-UMSAPICookie -Computername $UmsHost -TCPPort ([int]$UmsPort) -WebSession $webSession } catch {}
    }
}
