$ErrorActionPreference = 'Stop'

$Project = 'paper'
$UserAgent = 'codex-local-minecraft-setup/1.0'
$Headers = @{ 'User-Agent' = $UserAgent }

function Get-VersionWeight {
  param([string]$Version)

  if ($Version -match '^(\d+)\.(\d+)\.(\d+)') {
    return ([int]$Matches[1] * 1000000) + ([int]$Matches[2] * 1000) + [int]$Matches[3]
  }

  if ($Version -match '^(\d+)\.(\d+)') {
    return ([int]$Matches[1] * 1000000) + ([int]$Matches[2] * 1000)
  }

  return 0
}

$projectInfo = Invoke-RestMethod -Headers $Headers "https://fill.papermc.io/v3/projects/$Project"
$versions = @()
$projectInfo.versions.PSObject.Properties | ForEach-Object {
  $versions += $_.Value
}

$sortedVersions = $versions | Sort-Object @{ Expression = { Get-VersionWeight $_ }; Descending = $true }
$selected = $null

foreach ($version in $sortedVersions) {
  $builds = Invoke-RestMethod -Headers $Headers "https://fill.papermc.io/v3/projects/$Project/versions/$version/builds"
  $stableBuild = @($builds | Where-Object { $_.channel -eq 'STABLE' } | Select-Object -First 1)

  if ($stableBuild) {
    $selected = [pscustomobject]@{
      Version = $version
      Build = $stableBuild.id
      Url = $stableBuild.downloads.'server:default'.url
    }
    break
  }
}

if (-not $selected) {
  throw 'No stable Paper build was found.'
}

Write-Host "Downloading Paper $($selected.Version) build $($selected.Build)..."
Invoke-WebRequest -Headers $Headers -Uri $selected.Url -OutFile 'server.jar'

@{
  version = $selected.Version
  build = $selected.Build
  downloadedAt = (Get-Date).ToUniversalTime().ToString('o')
  url = $selected.Url
} | ConvertTo-Json | Set-Content -Encoding ASCII 'paper-version.json'

Write-Host 'Downloaded server.jar'

