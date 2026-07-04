$ErrorActionPreference = 'Stop'

Set-Location $PSScriptRoot

$UserAgent = 'codex-local-minecraft-setup/1.0'
$Headers = @{ 'User-Agent' = $UserAgent }
$PluginDir = Join-Path $PSScriptRoot 'plugins'
$VersionFile = Join-Path $PSScriptRoot 'bedrock-bridge-version.json'

New-Item -ItemType Directory -Force -Path $PluginDir | Out-Null

$plugins = @(
  @{
    Name = 'Geyser-Spigot'
    Project = 'geyser'
    Download = 'spigot'
    Output = Join-Path $PluginDir 'Geyser-Spigot.jar'
  },
  @{
    Name = 'Floodgate-Spigot'
    Project = 'floodgate'
    Download = 'spigot'
    Output = Join-Path $PluginDir 'Floodgate-Spigot.jar'
  }
)

$installed = @()

foreach ($plugin in $plugins) {
  $url = "https://download.geysermc.org/v2/projects/$($plugin.Project)/versions/latest/builds/latest/downloads/$($plugin.Download)"
  Write-Host "Downloading $($plugin.Name)..."
  Invoke-WebRequest -Headers $Headers -Uri $url -OutFile $plugin.Output

  $installed += @{
    name = $plugin.Name
    project = $plugin.Project
    downloadedAt = (Get-Date).ToUniversalTime().ToString('o')
    url = $url
  }

  Write-Host "Installed $($plugin.Name) at $($plugin.Output)"
}

@{
  plugins = $installed
} | ConvertTo-Json -Depth 4 | Set-Content -Encoding ASCII $VersionFile
