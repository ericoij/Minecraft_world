# Codex Try

A small multi-tool project built while experimenting with Codex:

- A Node/Express mental health slider tracker with a browser UI and history chart.
- A deploy-ready Paper Minecraft server setup for local hosting or a Docker-capable VPS.
- A toy futures-trading simulator for exploring risk and leverage behavior.

## Project Map

| Path | Purpose |
| --- | --- |
| `server.js` | Express API, static web app hosting, health check, NeDB persistence |
| `public/` | Browser UI for the mental health slider tracker |
| `test/` | Node test suite |
| `render.yaml` | Render Blueprint config for the web app |
| `Dockerfile` | Container image for the web app |
| `minecraft-server/` | Paper Minecraft server scripts and Docker Compose config |
| `trading/simulator.js` | Educational futures-trading simulator CLI |

## Mental Health Slider Tracker

The web app lets you record 10 self-check-in sliders and view the entries over
time in a Chart.js line graph.

### Run Locally

Requirements:

- Node.js 20+
- npm

```bash
npm install
npm start
```

Open:

```text
http://localhost:3000
```

The app stores entries in:

```text
data/entries.db
```

Use a different port if needed:

```powershell
$env:PORT=4000
npm start
```

### API

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Deployment health check |
| `GET` | `/api/sliders` | Slider definitions |
| `GET` | `/api/entries` | Saved entries, sorted by time |
| `POST` | `/api/entries` | Save a new slider entry |

Example:

```bash
curl http://localhost:3000/api/sliders
```

### Test

```bash
npm test
```

## Deploy The Web App

This repo includes a Render Blueprint at `render.yaml`.

1. Push the repo to GitHub or GitLab.
2. In Render, create a new Blueprint.
3. Select this repo.
4. Render will run `npm ci`, start with `npm start`, and check `/health`.

The Render config mounts a persistent disk at:

```text
/var/data
```

and sets:

```text
DATA_DIR=/var/data
```

That keeps NeDB entries alive across deploys.

## Minecraft Server

The Minecraft setup lives in `minecraft-server/`. It supports two paths:

- Local Windows hosting with Java and Paper.
- Docker Compose hosting on a VPS, cloud VM, or home server.

Minecraft is not an HTTP web app. Players connect over raw TCP, normally:

```text
25565
```

Render is not the right target for the Minecraft server. Use a machine where
you can expose TCP `25565`.

### Local Windows Hosting

Requirements:

- Java 21+
- Router access if internet friends need to join

Download/update Paper:

```powershell
cd C:\Users\erico\src\Codex_Try\minecraft-server
powershell -ExecutionPolicy Bypass -File .\update-paper.ps1
```

Review the Minecraft EULA:

```text
https://aka.ms/MinecraftEULA
```

Then edit `minecraft-server/eula.txt`:

```text
eula=true
```

Start the server:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-local.ps1
```

The local start script also installs the Chunky plugin. To pre-generate chunks,
type these commands in the Minecraft server console after startup:

```text
chunky radius 5000
chunky start
```

Check or control the job with:

```text
chunky progress
chunky pause
chunky continue
chunky cancel
```

The server also installs Geyser and Floodgate so Bedrock clients can join. For a
Nintendo Switch, use a BedrockConnect DNS method and enter:

```text
192.168.1.192
Port: 19132
```

LAN players connect to your computer's LAN IP:

```text
192.168.1.192:25565
```

Internet players need router port forwarding:

| Setting | Value |
| --- | --- |
| Protocol | TCP |
| External port | `25565` |
| Internal IP | `192.168.1.192` |
| Internal port | `25565` |

Also allow Java through Windows Firewall.

### VPS / Docker Hosting

On the server:

```bash
git clone <your-repo-url>
cd <repo>/minecraft-server
cp .env.example .env
```

Edit `.env`:

```env
MINECRAFT_EULA=TRUE
RCON_PASSWORD=<strong-password>
```

Start it:

```bash
docker compose up -d
```

Watch logs:

```bash
docker compose logs -f minecraft
```

Run admin commands:

```bash
docker compose exec minecraft rcon-cli list
docker compose exec minecraft rcon-cli op YourMinecraftName
```

World data is stored in the Docker named volume:

```text
minecraft-data
```

Back it up before changing server versions or server types.

## Futures-Trading Simulator

This repo also includes a toy CLI for exploring how leveraged futures trades can
behave over repeated simulations.

It never places real orders and should not be used for live trading.

```bash
node trading/simulator.js --seed 42
```

Customize parameters:

```bash
node trading/simulator.js --capital 250 --trades 120 --winRate 0.42 --rewardRatio 1.8 --leverage 15 --riskFraction 0.03 --seed 7
```

Output JSON:

```bash
node trading/simulator.js --json > run.json
```

Key options:

| Flag | Meaning |
| --- | --- |
| `--capital` | Starting equity |
| `--trades` | Number of simulated trades |
| `--winRate` | Probability of a win |
| `--rewardRatio` | Win payout multiple vs. risk |
| `--leverage` | Futures leverage |
| `--riskFraction` | Fraction of equity risked per trade |

Trading real money, especially with futures leverage, can result in losses
exceeding your stake. This simulator is educational only.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Web app cannot connect | Confirm `npm start` is still running and the port is not blocked |
| `EADDRINUSE` | Use another port or stop the process already using `3000` |
| PowerShell blocks scripts | Use `powershell -ExecutionPolicy Bypass -File <script.ps1>` |
| Minecraft LAN works but internet does not | Check TCP `25565` port forwarding and Windows Firewall |
| Minecraft IP changes after reboot | Reserve the PC's LAN IP in the router |
| Data disappears after web deploy | Confirm `DATA_DIR` points to persistent storage |

## Notes

- Runtime databases, Minecraft worlds, logs, downloaded server jars, and secrets
  are intentionally ignored by git.
- Keep `.env` files private.
- Back up Minecraft world data before major updates.
