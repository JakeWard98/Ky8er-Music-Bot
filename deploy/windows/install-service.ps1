# Install Ky8er Music Bot as a Windows service using NSSM.
#
# Prerequisites:
#   - Node.js 20 LTS installed (https://nodejs.org)
#   - NSSM installed and on PATH (https://nssm.cc) — `choco install nssm` works
#   - This repo cloned to the InstallDir below, with `npm ci --omit=dev` already
#     run and a populated .env file alongside package.json
#
# Run from an elevated (Administrator) PowerShell prompt:
#   Set-ExecutionPolicy -Scope Process Bypass
#   .\deploy\windows\install-service.ps1

[CmdletBinding()]
param(
    [string]$ServiceName = 'Ky8erMusicBot',
    [string]$InstallDir  = 'C:\ky8er-music-bot',
    [string]$NodeExe     = "$Env:ProgramFiles\nodejs\node.exe"
)

$ErrorActionPreference = 'Stop'

if (-not (Get-Command nssm -ErrorAction SilentlyContinue)) {
    throw "nssm.exe not found on PATH. Install via 'choco install nssm' or download from https://nssm.cc."
}
if (-not (Test-Path $NodeExe)) {
    throw "Node.js not found at $NodeExe. Install Node 20 LTS or pass -NodeExe."
}
if (-not (Test-Path (Join-Path $InstallDir 'src\index.js'))) {
    throw "Bot source not found at $InstallDir\src\index.js. Clone the repo there and run 'npm ci --omit=dev' first."
}
if (-not (Test-Path (Join-Path $InstallDir '.env'))) {
    throw "$InstallDir\.env is missing. Copy .env.example to .env and fill in the secrets."
}

$logsDir = Join-Path $InstallDir 'logs'
New-Item -ItemType Directory -Force -Path $logsDir | Out-Null

Write-Host "Installing service '$ServiceName'..."
nssm install $ServiceName $NodeExe "src\index.js"
nssm set $ServiceName AppDirectory       $InstallDir
nssm set $ServiceName DisplayName        "Ky8er Music Bot"
nssm set $ServiceName Description        "Discord music bot (discord.js v14, Node 20)"
nssm set $ServiceName Start              SERVICE_AUTO_START
nssm set $ServiceName AppStdout          (Join-Path $logsDir 'stdout.log')
nssm set $ServiceName AppStderr          (Join-Path $logsDir 'stderr.log')
nssm set $ServiceName AppRotateFiles     1
nssm set $ServiceName AppRotateOnline    1
nssm set $ServiceName AppRotateBytes     10485760
nssm set $ServiceName AppStopMethodSkip  0
nssm set $ServiceName AppStopMethodConsole 15000   # send Ctrl+C, wait 15s
nssm set $ServiceName AppExit Default    Restart
nssm set $ServiceName AppRestartDelay    5000

Write-Host "Starting service..."
nssm start $ServiceName

Write-Host "`nService installed. Useful commands:"
Write-Host "  nssm status   $ServiceName"
Write-Host "  nssm restart  $ServiceName"
Write-Host "  nssm stop     $ServiceName"
Write-Host "  nssm remove   $ServiceName confirm"
Write-Host "  Get-Content $logsDir\stdout.log -Wait -Tail 50"
