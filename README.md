# Mental Health Slider Tracker

## Quick start
1. Install Node.js 18+ (bundles npm).
2. Open a terminal in `c:/Users/erico/src/Codex_Try`.
3. Run `npm install`, then `npm start`.
4. Keep that terminal open and browse to [http://localhost:3000](http://localhost:3000).

## Detailed steps
### 1. Install dependencies
```bash
cd c:/Users/erico/src/Codex_Try
npm install
```

### 2. Start (and keep) the server
```bash
npm start
```
You should see `Server listening on http://localhost:3000`. Do **not** close this window. If Windows Defender Firewall prompts, allow Node.js on private networks so the browser can reach it. The app stores data in `data/entries.db`, so keep the working directory writable.

### 3. Use the app
1. Visit [http://localhost:3000](http://localhost:3000) on the same machine.
2. Move the 10 mental health sliders and hit **Save Entry**.
3. Tap **Refresh** (or wait a moment) to update the line chart with your latest submission.

### 4. Verify connectivity (optional but handy)
Open a second terminal and run either:
```bash
curl http://localhost:3000/api/sliders
# or PowerShell
Invoke-WebRequest http://localhost:3000/api/sliders
```
A JSON payload confirms the backend is reachable. If this command fails, the browser will fail too.

## Troubleshooting
- **Browser says “can’t connect to localhost:3000”**  
  The server is not running, crashed, or is blocked by a firewall. Restart `npm start`, watch for errors, and allow Node.js network access when prompted.
- **`EADDRINUSE: address already in use :::3000`**  
  Another process owns port 3000. Stop it or run `PORT=4000 npm start` and browse to `http://localhost:4000`.
- **`npm ERR!` permission errors**  
  Close editors locking the folder, then rerun the command from a terminal with appropriate rights.
- **Changes do not appear**  
  The browser may be caching files. Hard-refresh (Ctrl+Shift+R) after the server restarts.

## Available scripts
- `npm start` – launch the Express + Chart.js app.
- `node --check server.js` – syntax check without running the server.

## Futures-trading simulator (educational)
This repo also includes a **toy** CLI to explore how risky leveraged trades behave. It never places real orders and should not be used for live trading.

```bash
# basic run with deterministic seed
node trading/simulator.js --seed 42

# customize parameters
node trading/simulator.js --capital 250 --trades 120 --winRate 0.42 --rewardRatio 1.8 --leverage 15 --riskFraction 0.03 --seed 7

# output JSON for downstream analysis
node trading/simulator.js --json > run.json
```

Key options (see `--help` for all):

| Flag | Meaning |
| --- | --- |
| `--capital` | Starting equity (default 100) |
| `--trades` | Number of simulated trades |
| `--winRate` | Probability of a win per trade (0–1) |
| `--rewardRatio` | Payout multiple on wins vs. risked amount |
| `--leverage` | Futures leverage applied to each trade |
| `--riskFraction` | Fraction of current equity risked per trade |

WARNING: Trading real money—especially with futures leverage—can result in losses exceeding your stake. This script is for experimentation only.
