#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const DEFAULTS = {
  capital: 100,
  trades: 50,
  winRate: 0.45,
  rewardRatio: 2,
  leverage: 10,
  riskFraction: 0.02,
  feeRate: 0.0005,
  slippage: 0.0005,
  minRisk: 1,
  bankruptThreshold: 5,
  seed: null,
  json: false
};

const helpText = `
Futures Monte-Carlo Simulator (no live trading)
Usage: node trading/simulator.js [options]

Options:
  --capital <number>         Starting capital (default: ${DEFAULTS.capital})
  --trades <number>          Number of trades to simulate (default: ${DEFAULTS.trades})
  --winRate <0-1>            Probability of a winning trade (default: ${DEFAULTS.winRate})
  --rewardRatio <number>     Reward-to-risk ratio for wins (default: ${DEFAULTS.rewardRatio})
  --leverage <number>        Futures leverage multiple (default: ${DEFAULTS.leverage})
  --riskFraction <0-1>       Fraction of capital risked per trade (default: ${DEFAULTS.riskFraction})
  --feeRate <0-1>            Transaction fee rate applied to notional exposure (default: ${DEFAULTS.feeRate})
  --slippage <0-1>           Slippage rate applied to exposure (default: ${DEFAULTS.slippage})
  --minRisk <number>         Minimum dollar risk per trade (default: ${DEFAULTS.minRisk})
  --bankruptThreshold <num>  Stop simulation if equity falls below this amount (default: ${DEFAULTS.bankruptThreshold})
  --seed <number>            Deterministic seed for repeatable runs
  --config <file>            JSON config file overriding any options
  --json                     Output JSON instead of formatted text
  --help                     Show this help text

Example:
  node trading/simulator.js --capital 250 --trades 120 --winRate 0.42 --leverage 15 --seed 42
`;

function parseArgs(rawArgs) {
  const args = { ...DEFAULTS };
  const remaining = [];

  for (let i = 0; i < rawArgs.length; i += 1) {
    const token = rawArgs[i];
    if (!token.startsWith('--')) {
      remaining.push(token);
      continue;
    }

    const [key, valueFromEq] = token.split('=');
    const normalizedKey = key.replace(/^--/, '');

    if (normalizedKey === 'help') {
      console.log(helpText);
      process.exit(0);
    }

    if (normalizedKey === 'json') {
      args.json = true;
      continue;
    }

    let value = valueFromEq;
    if (value === undefined) {
      value = rawArgs[i + 1];
      if (value && !value.startsWith('--')) {
        i += 1;
      } else {
        value = undefined;
      }
    }

    if (normalizedKey === 'config') {
      if (!value) {
        throw new Error('Missing value for --config');
      }
      const configPath = path.resolve(value);
      const fileData = fs.readFileSync(configPath, 'utf8');
      Object.assign(args, JSON.parse(fileData));
      continue;
    }

    if (value === undefined) {
      throw new Error(`Missing value for --${normalizedKey}`);
    }

    const numericKeys = [
      'capital',
      'trades',
      'winRate',
      'rewardRatio',
      'leverage',
      'riskFraction',
      'feeRate',
      'slippage',
      'minRisk',
      'bankruptThreshold',
      'seed'
    ];

    if (numericKeys.includes(normalizedKey)) {
      const numericValue = Number(value);
      if (!Number.isFinite(numericValue)) {
        throw new Error(`Invalid number for --${normalizedKey}`);
      }
      args[normalizedKey] = numericValue;
    } else {
      args[normalizedKey] = value;
    }
  }

  return args;
}

function createRng(seed) {
  if (!Number.isFinite(seed)) {
    return Math.random;
  }
  let t = seed + 0x6d2b79f5;
  return function rng() {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function simulate(config) {
  const rng = createRng(config.seed);
  const history = [];
  let capital = config.capital;
  let peak = capital;
  let maxDrawdown = 0;
  let wins = 0;
  let losses = 0;

  for (let i = 1; i <= config.trades; i += 1) {
    if (capital <= config.bankruptThreshold) {
      history.push({
        trade: i,
        status: 'stopped',
        capital: Number(capital.toFixed(2)),
        note: 'Bankrupt threshold hit'
      });
      break;
    }

    const riskAmount = Math.max(config.minRisk, capital * config.riskFraction);
    const exposure = riskAmount * config.leverage;
    const win = rng() < config.winRate;
    const grossPnl = win ? exposure * config.rewardRatio : -exposure;
    const fees = Math.abs(exposure) * config.feeRate;
    const slipCost = Math.abs(exposure) * config.slippage;
    const pnl = grossPnl - fees - slipCost;
    capital = Math.max(0, capital + pnl);

    if (win) {
      wins += 1;
    } else {
      losses += 1;
    }

    peak = Math.max(peak, capital);
    const drawdown = peak === 0 ? 0 : (peak - capital) / peak;
    maxDrawdown = Math.max(maxDrawdown, drawdown);

    history.push({
      trade: i,
      win,
      pnl: Number(pnl.toFixed(2)),
      capital: Number(capital.toFixed(2)),
      exposure: Number(exposure.toFixed(2))
    });
  }

  const roi = (capital - config.capital) / config.capital;

  return {
    config,
    finalCapital: Number(capital.toFixed(2)),
    roi: Number(roi.toFixed(4)),
    wins,
    losses,
    winRate: wins + losses > 0 ? wins / (wins + losses) : 0,
    maxDrawdown: Number(maxDrawdown.toFixed(4)),
    tradesSimulated: history.filter((h) => h.win !== undefined).length,
    history
  };
}

function formatCurrency(value) {
  return `$${value.toFixed(2)}`;
}

function printReport(result) {
  console.log('Futures Trading Simulator (educational use only)');
  console.log('------------------------------------------------');
  console.log(`Starting capital: ${formatCurrency(result.config.capital)}`);
  console.log(`Final capital:    ${formatCurrency(result.finalCapital)}`);
  console.log(`ROI:              ${(result.roi * 100).toFixed(2)}%`);
  console.log(`Trades run:       ${result.tradesSimulated}/${result.config.trades}`);
  console.log(`Wins/Losses:      ${result.wins}/${result.losses} (simulated win rate ${(result.winRate * 100).toFixed(2)}%)`);
  console.log(`Max drawdown:     ${(result.maxDrawdown * 100).toFixed(2)}%`);
  console.log(`Leverage used:    ${result.config.leverage}x, risk/trade ${(result.config.riskFraction * 100).toFixed(2)}%`);
  console.log('------------------------------------------------');
  console.log('Sample of last 5 trades:');
  const slice = result.history.filter((h) => h.win !== undefined).slice(-5);
  slice.forEach((trade) => {
    const outcome = trade.win ? 'WIN ' : 'LOSS';
    console.log(
      `${String(trade.trade).padStart(3, ' ')} | ${outcome} | PnL ${formatCurrency(trade.pnl)} | Equity ${formatCurrency(trade.capital)}`
    );
  });
  console.log('\nWARNING: This tool is a toy model. It does NOT place trades and cannot predict real markets.');
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const result = simulate(args);
    if (args.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      printReport(result);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    console.log('Use --help to see available options.');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  DEFAULTS,
  parseArgs,
  createRng,
  simulate,
  formatCurrency
};
