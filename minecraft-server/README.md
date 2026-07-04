# Minecraft Server Deployment

This runs a Paper Minecraft Java server with Docker Compose using the
`itzg/minecraft-server` image.

Render is not the right host for this server because Minecraft needs TCP port
`25565`, not an HTTP web service. Use a VPS, cloud VM, home server, or another
host that supports raw TCP ports and Docker.

## First deploy

On the server:

```bash
git clone <your-repo-url>
cd <repo>/minecraft-server
cp .env.example .env
```

Edit `.env`:

```bash
MINECRAFT_EULA=TRUE
RCON_PASSWORD=<strong-password>
```

Then start it:

```bash
docker compose up -d
```

Players connect to:

```text
<server-public-ip>:25565
```

## Operations

```bash
docker compose logs -f minecraft
docker compose exec minecraft rcon-cli list
docker compose exec minecraft rcon-cli stop
docker compose pull
docker compose up -d
```

## Chunk pre-generation

This server installs the Chunky plugin for Paper. For Docker, the
`itzg/minecraft-server` container downloads Chunky from Modrinth at startup. For
local Windows hosting, `start-local.ps1` installs `plugins/Chunky.jar`
automatically.

After the server is running, type these commands in the server console:

```text
chunky radius 5000
chunky start
```

Useful controls:

```text
chunky progress
chunky pause
chunky continue
chunky cancel
```

Use a smaller radius first if you are testing. A `5000` block radius can take a
while and will increase the world folder size.

## Bedrock and Nintendo Switch

The local server installs Geyser and Floodgate automatically. These let Bedrock
clients connect to this Paper Java server. Bedrock uses UDP port `19132`.

Players on Windows, mobile, or tablet Bedrock can connect to:

```text
<server-ip>:19132
```

Nintendo Switch does not show custom local servers normally. Use a BedrockConnect
DNS method on the Switch, then enter the server IP and port:

```text
192.168.1.192
19132
```

## Firewall

Open TCP `25565` on the server and in the cloud firewall/security group.
RCON port `25575` is not published publicly by this compose file.

## Data

World data is stored in the Docker named volume `minecraft-data`.
Back it up before changing versions or server types.

## Local Windows run

This repo also includes a local Java runner for this machine:

```powershell
cd C:\Users\erico\src\Codex_Try\minecraft-server
powershell -ExecutionPolicy Bypass -File .\update-paper.ps1
```

Review https://aka.ms/MinecraftEULA, then set `eula=true` in `eula.txt`.

Start the server:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-local.ps1
```

For LAN play, connect to this computer's local IP on port `25565`.
For internet play, forward TCP `25565` on the router to this machine and allow
Java through Windows Firewall.
