<#
.SYNOPSIS
    Saves UMS credentials securely to an encrypted XML file.

.EXAMPLE
    .\New-UmsCredential.ps1 -Path C:\mq-ums\ums.cred.xml
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)] [string] $Path
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Write-Host "This will save your UMS credentials to: $Path"
Write-Host "The file is encrypted with your Windows user account (DPAPI)."
Write-Host ""

$credential = Get-Credential -Message "Enter your IGEL UMS username and password"

if (-not $credential) {
    Write-Error "No credential provided. Aborting."
    exit 1
}

$dir = Split-Path $Path
if ($dir -and -not (Test-Path $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
}

$credential | Export-Clixml -Path $Path
Write-Host "Credential saved to: $Path"
Write-Host "Only this Windows user account can decrypt it."
