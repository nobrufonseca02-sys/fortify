import assert from 'node:assert/strict';
import test from 'node:test';
import { positionRows, sanitizeEaPositions, sanitizeEaTrades, snapshotRowsSince, tradeRowsSince } from './eaSync';

const NOW = new Date('2026-11-12T15:00:00Z');
const START = new Date('2026-11-11T09:30:00Z');
const epoch = (isoDate: string) => Date.parse(isoDate) / 1000;

test('snapshots só a partir do dia em que a conta foi ligada ao EA, com hoje ao vivo', () => {
  const rows = snapshotRowsSince(
    [
      { date: '2026-11-10', pnl: 500, eodBalance: 100_500, traded: true },
      { date: '2026-11-11', pnl: 1_000, eodBalance: 101_500, traded: true },
      { date: '2026-11-12', pnl: -300, eodBalance: 101_200, traded: true },
    ],
    { balance: 101_200, equity: 100_900, now: NOW },
    START,
  );
  assert.deepEqual(rows.map((row) => row.date), ['2026-11-11', '2026-11-12']);
  const today = rows[1];
  assert.equal(today.equity, 100_900);
  assert.equal(today.floating_pnl, -300);
  assert.equal(today.max_balance, 101_500);
  assert.equal(today.drawdown, 600);
});

test('hoje entra mesmo sem operação no dia', () => {
  const rows = snapshotRowsSince([], { balance: 100_000, equity: 100_000, now: NOW }, NOW);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].daily_pnl, 0);
});

test('operações anteriores ao início do registro não são gravadas', () => {
  const trades = sanitizeEaTrades([
    { ticket: 11, symbol: 'EURUSD', side: 'buy', volume: 1, openTime: epoch('2026-11-10T10:00:00Z'), closeTime: epoch('2026-11-10T11:00:00Z'), profit: 50 },
    { ticket: 12, symbol: 'XAUUSD', side: 'sell', volume: 0.5, openTime: epoch('2026-11-12T10:00:00Z'), closeTime: epoch('2026-11-12T12:20:00Z'), profit: -40, commission: -3.5 },
  ]);
  const rows = tradeRowsSince(trades, START);
  assert.deepEqual(rows.map((row) => row.ticket), [12]);
  assert.equal(rows[0].close_time, '2026-11-12T12:20:00.000Z');
  assert.equal(rows[0].commission, -3.5);
});

test('entrada não confiável: descarta linha sem ticket, ativo, lado ou horário válidos', () => {
  const trades = sanitizeEaTrades([
    { ticket: 'x', symbol: 'EURUSD', side: 'buy', volume: 1, closeTime: 1762950000 },
    { ticket: 5, symbol: '<script>', side: 'buy', volume: 1, closeTime: 1762950000 },
    { ticket: 6, symbol: 'EURUSD', side: 'hold', volume: 1, closeTime: 1762950000 },
    { ticket: 7, symbol: 'EURUSD', side: 'buy', volume: 1, closeTime: 12 },
  ]);
  assert.deepEqual(trades.map((trade) => trade.symbol), ['script']);
  assert.equal(sanitizeEaTrades('nada').length, 0);
});

test('posições abertas no formato de mt5_positions, stop zero vira sem stop', () => {
  const positions = sanitizeEaPositions([
    { ticket: 9, symbol: 'US100', volume: 1, openPrice: 20000, currentPrice: 20010, profit: 10, stopLoss: 0, takeProfit: 20100 },
  ]);
  const [row] = positionRows(positions, NOW);
  assert.equal(row.stop_loss, null);
  assert.equal(row.take_profit, 20100);
  assert.equal(row.floating_pnl, 10);
});
