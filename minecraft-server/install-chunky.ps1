$ErrorActionPreference = 'Stop'

Set-Location $PSScriptRoot

$Project = 'chunky'
$UserAgent = 'codex-local-minecraft-setup/1.0'
$Headers = @{ 'User-Agent' = $UserAgent }
$PluginDir = Join-Path $PSScriptRoot 'plugins'
$PluginPath = Join-Path $PluginDir 'Chunky.jar'
$VersionFile = Join-Path $PSScriptRoot 'chunky-version.json'
$PaperVersionFile = Join-Path $PSScriptRoot 'paper-version.json'

New-Item -ItemType Directory -Force -Path $PluginDir | Out-Null

$minecraftVersion = $null
if (Test-Path $PaperVersionFile) {
  $paperVersion = Get-Content $PaperVersionFile -Raw | ConvertFrom-Json
  $minecraftVersion = $paperVersion.version
}

$versions = Invoke-RestMethod -Headers $Headers "https://api.modrinth.com/v2/project/$Project/version"
$knownGameVersions = @($versions | ForEach-Object { $_.game_versions } | Select-Object -Unique)
if ($minecraftVersion -and $knownGameVersions -notcontains $minecraftVersion) {
  Write-Host "Paper version '$minecraftVersion' is not listed by Chunky on Modrinth; using the latest Paper/Spigot release."
  $minecraftVersion = $null
}

$compatibleVersions = @(
  $versions | Where-Object {
    $_.version_type -eq 'release' -and
    ($_.loaders -contains 'paper' -or $_.loaders -contains 'spigot') -and
    (-not $minecraftVersion -or $_.game_versions -contains $minecraftVersion)
  } | Sort-Object @{ Expression = { [datetime]$_.date_published }; Descending = $true }
)

if (-not $compatibleVersions -and $minecraftVersion) {
  Write-Host "No Chunky release matched Minecraft $minecraftVersion exactly; falling back to the latest Paper/Spigot release."
  $compatibleVersions = @(
    $versions | Where-Object {
      $_.version_type -eq 'release' -and
      ($_.loaders -contains 'paper' -or $_.loaders -contains 'spigot')
    } | Sort-Object @{ Expression = { [datetime]$_.date_published }; Descending = $true }
  )
}

if (-not $compatibleVersions) {
  throw 'No compatible Chunky release was found on Modrinth.'
}

$selected = $compatibleVersions[0]
$jarFile = @($selected.files | Where-Object { $_.primary -eq $true -and $_.filename -like '*.jar' } | Select-Object -First 1)
if (-not $jarFile) {
  $jarFile = @($selected.files | Where-Object { $_.filename -like '*.jar' } | Select-Object -First 1)
}

if (-not $jarFile) {
  throw "No jar file was found for Chunky $($selected.version_number)."
}

Write-Host "Downloading Chunky $($selected.version_number)..."
Invoke-WebRequest -Headers $Headers -Uri $jarFile.url -OutFile $PluginPath

@{
  project = $Project
  version = $selected.version_number
  minecraftVersion = $minecraftVersion
  downloadedAt = (Get-Date).ToUniversalTime().ToString('o')
  url = $jarFile.url
} | ConvertTo-Json | Set-Content -Encoding ASCII $VersionFile

Write-Host "Installed Chunky at $PluginPath"
