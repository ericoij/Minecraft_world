$ErrorActionPreference = 'Stop'

Set-Location $PSScriptRoot

if (-not (Test-Path 'server.jar')) {
  powershell -ExecutionPolicy Bypass -File .\update-paper.ps1
}

if (-not (Test-Path 'plugins\Chunky.jar')) {
  powershell -ExecutionPolicy Bypass -File .\install-chunky.ps1
}

if (-not (Test-Path 'plugins\Geyser-Spigot.jar') -or -not (Test-Path 'plugins\Floodgate-Spigot.jar')) {
  powershell -ExecutionPolicy Bypass -File .\install-bedrock-bridge.ps1
}

if ((Get-Content 'eula.txt' -Raw) -notmatch '(?m)^eula=true\s*$') {
  Write-Host 'Minecraft EULA has not been accepted yet.'
  Write-Host 'Review https://aka.ms/MinecraftEULA, then set eula=true in eula.txt and run this again:'
  Write-Host 'powershell -ExecutionPolicy Bypass -File .\start-local.ps1'
  exit 1
}

$java = 'java'
$localJava = Get-ChildItem -Path 'java25' -Recurse -Filter 'java.exe' -ErrorAction SilentlyContinue | Select-Object -First 1
if ($localJava) {
  $java = $localJava.FullName
}

& $java -Xms1G -Xmx2G -jar server.jar nogui
