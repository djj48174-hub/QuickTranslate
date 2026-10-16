# ---------------------------------------------------------------------------
#  Install QuickTranslate into BetterDiscord (and enable it).
#
#  Usage:
#     powershell -ExecutionPolicy Bypass -File install-quicktranslate.ps1
#     powershell -ExecutionPolicy Bypass -File install-quicktranslate.ps1 -NoRestart
#
#  Uninstall:
#     powershell -ExecutionPolicy Bypass -File uninstall-quicktranslate.ps1
# ---------------------------------------------------------------------------

[CmdletBinding()]
param(
    [switch]$NoRestart
)

$ErrorActionPreference = 'Stop'

$PluginId   = 'QuickTranslate'
$PluginFile = 'QuickTranslate.plugin.js'
$Source     = Join-Path $PSScriptRoot ('plugin\' + $PluginFile)
$BDRoot     = Join-Path $env:APPDATA 'BetterDiscord'
$BDPlugins  = Join-Path $BDRoot 'plugins'
$BDData     = Join-Path $BDRoot 'data\stable\plugins.json'

if (-not (Test-Path $Source)) {
    Write-Host "Plugin source not found: $Source" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $BDRoot)) {
    Write-Host "BetterDiscord not installed ($BDRoot missing)." -ForegroundColor Red
    exit 1
}

# 1) copy the plugin
if (-not (Test-Path $BDPlugins)) { New-Item -ItemType Directory -Force -Path $BDPlugins | Out-Null }
$target = Join-Path $BDPlugins $PluginFile
Copy-Item -LiteralPath $Source -Destination $target -Force
Write-Host ("Copied plugin -> " + $target) -ForegroundColor Green

# 2) enable it in BetterDiscord's state
$state = @{}
if (Test-Path $BDData) {
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

$dir = Split-Path $BDData -Parent
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
$json = $state | ConvertTo-Json -Depth 5
[IO.File]::WriteAllText($BDData, $json, (New-Object System.Text.UTF8Encoding($false)))
Write-Host ("Enabled in BetterDiscord -> " + $BDData) -ForegroundColor Green

# 3) restart Discord so it loads
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
        if (Test-Path $shortcut) {
            Start-Process -FilePath $shortcut
        } else {
            $exe = Join-Path $env:LOCALAPPDATA 'Discord\Update.exe'
            if (Test-Path $exe) { Start-Process -FilePath $exe -ArgumentList '--processStart', 'Discord.exe' }
            else { Write-Host "Start Discord manually." -ForegroundColor Yellow }
        }
        Write-Host "Discord restarted." -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "  QuickTranslate installed." -ForegroundColor Green
Write-Host "  Look for the globe button next to the message box." -ForegroundColor Gray
Write-Host ""
