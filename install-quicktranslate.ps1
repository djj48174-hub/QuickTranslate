# ---------------------------------------------------------------------------
#  QuickTranslate installer for BetterDiscord (Windows)
#
#  Works standalone: you can download just this file and run it. If the plugin
#  file is not sitting next to the script, it is downloaded from GitHub.
#
#  Usage:
#     powershell -ExecutionPolicy Bypass -File install-quicktranslate.ps1
#     powershell -ExecutionPolicy Bypass -File install-quicktranslate.ps1 -NoRestart
#     powershell -ExecutionPolicy Bypass -File install-quicktranslate.ps1 -Source C:\path\QuickTranslate.plugin.js
#
#  Remove it again:
#     powershell -ExecutionPolicy Bypass -File uninstall-quicktranslate.ps1
#
#  Repo: https://github.com/djj48174-hub/QuickTranslate
# ---------------------------------------------------------------------------

[CmdletBinding()]
param(
    [switch]$NoRestart,
    [string]$Source
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch { }

$PluginId   = 'QuickTranslate'
$PluginFile = 'QuickTranslate.plugin.js'
$RepoUrl    = 'https://github.com/djj48174-hub/QuickTranslate'
$ReleaseUrl = $RepoUrl + '/releases/latest/download/' + $PluginFile
$RawUrl     = 'https://raw.githubusercontent.com/djj48174-hub/QuickTranslate/main/plugin/' + $PluginFile
$BDRoot     = Join-Path $env:APPDATA 'BetterDiscord'
$BDPlugins  = Join-Path $BDRoot 'plugins'
$BDData     = Join-Path $BDRoot 'data\stable\plugins.json'

function Test-PluginFile {
    param([string]$Path)
    if ([string]::IsNullOrWhiteSpace($Path)) { return $false }
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return $false }
    if ((Get-Item -LiteralPath $Path).Length -lt 10000) { return $false }
    $head = @(Get-Content -LiteralPath $Path -TotalCount 8 -ErrorAction SilentlyContinue) -join "`n"
    return ($head -match ('@name\s+' + [regex]::Escape($PluginId)))
}

function Find-LocalPlugin {
    $candidates = @()
    if (-not [string]::IsNullOrWhiteSpace($Source)) { $candidates += $Source }
    if (-not [string]::IsNullOrWhiteSpace($PSScriptRoot)) {
        $candidates += (Join-Path $PSScriptRoot $PluginFile)
        $candidates += (Join-Path $PSScriptRoot ('plugin\' + $PluginFile))
    }
    foreach ($candidate in $candidates) {
        if (Test-PluginFile $candidate) { return (Resolve-Path -LiteralPath $candidate).Path }
    }
    return $null
}

function Get-RemotePlugin {
    param([string]$Destination)
    foreach ($url in @($ReleaseUrl, $RawUrl)) {
        try {
            Write-Host ("Downloading plugin: " + $url) -ForegroundColor Cyan
            Invoke-WebRequest -Uri $url -OutFile $Destination -UseBasicParsing -TimeoutSec 60
            if (Test-PluginFile $Destination) { return $true }
            Write-Host "Downloaded file does not look like the plugin." -ForegroundColor Yellow
        } catch {
            Write-Host ("Download failed: " + $_.Exception.Message) -ForegroundColor Yellow
        }
    }
    return $false
}

Write-Host ""
Write-Host "  QuickTranslate installer" -ForegroundColor Cyan
Write-Host ("  " + $RepoUrl) -ForegroundColor DarkGray
Write-Host ""

# 1) BetterDiscord must exist
if (-not (Test-Path -LiteralPath $BDRoot)) {
    Write-Host ("BetterDiscord not found (" + $BDRoot + ").") -ForegroundColor Red
    Write-Host "Install BetterDiscord first: https://betterdiscord.app" -ForegroundColor Yellow
    exit 1
}
if (-not (Test-Path -LiteralPath $BDPlugins)) {
    New-Item -ItemType Directory -Force -Path $BDPlugins | Out-Null
}

# 2) get the plugin (local copy if available, otherwise download)
$target = Join-Path $BDPlugins $PluginFile
$local = Find-LocalPlugin

if ($local) {
    Write-Host ("Using local plugin file: " + $local) -ForegroundColor Green
    Copy-Item -LiteralPath $local -Destination $target -Force
} else {
    Write-Host "No plugin file next to this script - downloading from GitHub..." -ForegroundColor Cyan
    $temp = Join-Path ([IO.Path]::GetTempPath()) ('qt-' + [Guid]::NewGuid().ToString('N') + '.js')
    try {
        if (-not (Get-RemotePlugin -Destination $temp)) {
            Write-Host ""
            Write-Host "Could not download the plugin. Check your internet connection, or" -ForegroundColor Red
            Write-Host ("download it manually from " + $RepoUrl) -ForegroundColor Yellow
            Write-Host ("and copy it to: " + $BDPlugins) -ForegroundColor Yellow
            exit 1
        }
        Copy-Item -LiteralPath $temp -Destination $target -Force
    } finally {
        if (Test-Path -LiteralPath $temp) { Remove-Item -LiteralPath $temp -Force -ErrorAction SilentlyContinue }
    }
}

$installed = Get-Item -LiteralPath $target
Write-Host ("Installed plugin: " + $target + " (" + $installed.Length + " bytes)") -ForegroundColor Green

# 3) enable it in BetterDiscord's state
$state = @{}
if (Test-Path -LiteralPath $BDData) {
    try {
        $raw = [IO.File]::ReadAllText($BDData, (New-Object System.Text.UTF8Encoding($false)))
        if (-not [string]::IsNullOrWhiteSpace($raw)) {
            $obj = $raw | ConvertFrom-Json
            foreach ($prop in $obj.PSObject.Properties) { $state[$prop.Name] = $prop.Value }
        }
    } catch {
        Write-Host "Could not read plugins.json, recreating it." -ForegroundColor Yellow
        $state = @{}
    }
}

$state[$PluginId] = $true

$dataDir = Split-Path $BDData -Parent
if (-not (Test-Path -LiteralPath $dataDir)) { New-Item -ItemType Directory -Force -Path $dataDir | Out-Null }
$json = $state | ConvertTo-Json -Depth 5
[IO.File]::WriteAllText($BDData, $json, (New-Object System.Text.UTF8Encoding($false)))
Write-Host ("Enabled in BetterDiscord: " + $BDData) -ForegroundColor Green

# 4) restart Discord so it loads
if (-not $NoRestart) {
    $procs = @(Get-Process -Name 'Discord', 'DiscordPTB', 'DiscordCanary' -ErrorAction SilentlyContinue)
    if ($procs.Count -gt 0) {
        Write-Host "Restarting Discord..." -ForegroundColor Cyan
        $procs | Stop-Process -Force -ErrorAction SilentlyContinue
        for ($i = 0; $i -lt 30; $i++) {
            Start-Sleep -Milliseconds 500
            if (@(Get-Process -Name 'Discord', 'DiscordPTB', 'DiscordCanary' -ErrorAction SilentlyContinue).Count -eq 0) { break }
        }

        $shortcut = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Discord Inc\Discord.lnk'
        if (Test-Path -LiteralPath $shortcut) {
            Start-Process -FilePath $shortcut
        } else {
            $exe = Join-Path $env:LOCALAPPDATA 'Discord\Update.exe'
            if (Test-Path -LiteralPath $exe) { Start-Process -FilePath $exe -ArgumentList '--processStart', 'Discord.exe' }
            else { Write-Host "Start Discord manually." -ForegroundColor Yellow }
        }
        Write-Host "Discord restarted." -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "  QuickTranslate installed." -ForegroundColor Green
Write-Host "  Look for the globe button next to the message box." -ForegroundColor Gray
Write-Host ""
