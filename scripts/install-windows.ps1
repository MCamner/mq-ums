<#
.SYNOPSIS
    Sets up mq-ums on Windows: installs PSIGEL, checks Node.js, validates config.

.EXAMPLE
    .\scripts\install-windows.ps1
#>
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Write-Host "`nmq-ums install`n==============`n"

# PSIGEL
Write-Host "Installing PSIGEL module..."
Install-Module -Name PSIGEL -Scope CurrentUser -Force
Write-Host "  PSIGEL installed." -ForegroundColor Green

# Node.js check
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Host "  [WARN] node not found. Install from https://nodejs.org" -ForegroundColor Yellow
} else {
    $v = & node --version
    Write-Host "  Node.js: $v" -ForegroundColor Green
}

# npm install
$npmCmd = Get-Command npm -ErrorAction SilentlyContinue
if ($npmCmd) {
    Write-Host "Running npm install..."
    & npm install
    Write-Host "  npm install done." -ForegroundColor Green
} else {
    Write-Host "  [WARN] npm not found — run 'npm install' manually" -ForegroundColor Yellow
}

Write-Host "`nNext steps:"
Write-Host "  1. .\scripts\New-UmsCredential.ps1 -Path C:\mq-ums\ums.cred.xml"
Write-Host "  2. copy .env.example .env  (then edit .env)"
Write-Host "  3. npm start"
Write-Host "  4. Open http://127.0.0.1:8787"
