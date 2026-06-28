const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

const {
  DEFAULTS,
  createRng,
  formatCurrency,
  parseArgs,
  simulate
} = require('../trading/simulator');

test('parseArgs applies defaults and numeric command-line overrides', () => {
  const args = parseArgs([
    '--capital',
    '250',
    '--trades=12',
    '--winRate',
    '0.6',
    '--json',
    'ignored-positional'
  ]);

  assert.equal(args.capital, 250);
  assert.equal(args.trades, 12);
  assert.equal(args.winRate, 0.6);
  assert.equal(args.rewardRatio, DEFAULTS.rewardRatio);
  assert.equal(args.json, true);
});

test('parseArgs merges JSON config files and later CLI overrides', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'simulator-test-'));
  const configPath = path.join(directory, 'config.json');
  fs.writeFileSync(configPath, JSON.stringify({ capital: 300, trades: 5 }), 'utf8');

  try {
    const args = parseArgs(['--config', configPath, '--trades', '9']);

    assert.equal(args.capital, 300);
    assert.equal(args.trades, 9);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('parseArgs rejects invalid numeric options', () => {
  assert.throws(() => parseArgs(['--capital', 'not-a-number']), /Invalid number for --capital/);
  assert.throws(() => parseArgs(['--seed']), /Missing value for --seed/);
});

test('createRng returns repeatable seeded sequences', () => {
  const first = createRng(42);
  const second = createRng(42);

  assert.deepEqual(
    [first(), first(), first()],
    [second(), second(), second()]
  );
});

test('simulate produces deterministic results for a seeded config', () => {
  const result = simulate({
    ...DEFAULTS,
    capital: 100,
    trades: 3,
    winRate: 0.5,
    rewardRatio: 2,
    leverage: 10,
    riskFraction: 0.02,
    feeRate: 0.0005,
    slippage: 0.0005,
    minRisk: 1,
    seed: 7
  });

  assert.equal(result.finalCapital, 89.54);
  assert.equal(result.roi, -0.1046);
  assert.equal(result.wins, 1);
  assert.equal(result.losses, 2);
  assert.equal(result.tradesSimulated, 3);
  assert.deepEqual(
    result.history.map(({ win, pnl, capital, exposure }) => ({ win, pnl, capital, exposure })),
    [
      { win: true, pnl: 39.98, capital: 139.98, exposure: 20 },
      { win: false, pnl: -28.02, capital: 111.96, exposure: 28 },
      { win: false, pnl: -22.41, capital: 89.54, exposure: 22.39 }
    ]
  );
});

test('simulate stops when capital reaches the bankrupt threshold', () => {
  const result = simulate({
    ...DEFAULTS,
    capital: 10,
    trades: 10,
    winRate: 0,
    rewardRatio: 2,
    leverage: 10,
    riskFraction: 0.5,
    feeRate: 0,
    slippage: 0,
    minRisk: 1,
    bankruptThreshold: 5,
    seed: 1
  });

  assert.equal(result.finalCapital, 0);
  assert.equal(result.tradesSimulated, 1);
  assert.equal(result.history.at(-1).status, 'stopped');
});

test('formatCurrency formats dollars with two decimal places', () => {
  assert.equal(formatCurrency(12), '$12.00');
  assert.equal(formatCurrency(12.345), '$12.35');
});
