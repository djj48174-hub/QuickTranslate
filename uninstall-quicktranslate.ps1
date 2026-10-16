# ---------------------------------------------------------------------------
#  Remove QuickTranslate from BetterDiscord (keeps BetterDiscord installed).
#
#  Usage:
#     powershell -ExecutionPolicy Bypass -File uninstall-quicktranslate.ps1
#     powershell -ExecutionPolicy Bypass -File uninstall-quicktranslate.ps1 -NoRestart
# ---------------------------------------------------------------------------

[CmdletBinding()]
param(
    [switch]$NoRestart
)

$ErrorActionPreference = 'Stop'

$PluginId   = 'QuickTranslate'
$PluginFile = 'QuickTranslate.plugin.js'
$BDRoot     = Join-Path $env:APPDATA 'BetterDiscord'
$BDPlugins  = Join-Path $BDRoot 'plugins'
$BDData     = Join-Path $BDRoot 'data\stable\plugins.json'
$target     = Join-Path $BDPlugins $PluginFile

# 1) delete the plugin file
if (Test-Path $target) {
    Remove-Item -LiteralPath $target -Force
    Write-Host ("Removed " + $target) -ForegroundColor Green
} else {
    Write-Host "Plugin file not found (already removed)." -ForegroundColor Yellow
}

# 2) drop its entry from BetterDiscord's state
if (Test-Path $BDData) {
    try {
        $raw = [IO.File]::ReadAllText($BDData, (New-Object System.Text.UTF8Encoding($false)))
        $obj = if ([string]::IsNullOrWhiteSpace($raw)) { @{} } else { $raw | ConvertFrom-Json }
        $state = [ordered]@{}
        foreach ($prop in $obj.PSObject.Properties) {
            if ($prop.Name -ne $PluginId) { $state[$prop.Name] = $prop.Value }
        }
        $json = if ($state.Count -eq 0) { '{}' } else { $state | ConvertTo-Json -Depth 5 }
        [IO.File]::WriteAllText($BDData, $json, (New-Object System.Text.UTF8Encoding($false)))
        Write-Host ("Updated " + $BDData) -ForegroundColor Green
    } catch {
        Write-Host ("Could not update plugins.json: " + $_.Exception.Message) -ForegroundColor Yellow
    }
}

# 3) restart Discord if asked
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
        if (Test-Path $shortcut) { Start-Process -FilePath $shortcut }
        else {
            $exe = Join-Path $env:LOCALAPPDATA 'Discord\Update.exe'
            if (Test-Path $exe) { Start-Process -FilePath $exe -ArgumentList '--processStart', 'Discord.exe' }
        }
        Write-Host "Discord restarted." -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "  QuickTranslate removed. BetterDiscord is still installed." -ForegroundColor Green
Write-Host ""
