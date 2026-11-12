import assert from 'node:assert/strict';
import test from 'node:test';
import type { ConsistencyClause } from './bindingTypes';
import { computeConsistency, consistencyClausesForStage, primaryConsistency, type ConsistencyData } from './consistencyRules';

function clause(partial: Partial<ConsistencyClause>): ConsistencyClause {
  return {
    appliesTo: 'both',
    kind: 'best_day_vs_total_profit',
    percent: null,
    amount: null,
    days: null,
    minDayProfitPercent: null,
    effect: 'blocks_payout',
    condition: null,
    estimated: false,
    officialText: 'texto oficial',
    sourceUrl: 'https://example.com',
    ...partial,
  };
}

// Conta de 100k: +1.200 e +800 nos dias anteriores, hoje -500 fechado.
const data: ConsistencyData = {
  initialBalance: 100_000,
  balance: 101_500,
  days: [
    { date: '2026-11-10', pnl: 1_200 },
    { date: '2026-11-11', pnl: 800 },
    { date: '2026-11-12', pnl: -500 },
  ],
  today: '2026-11-12',
  profitTargetAmount: 10_000,
  bestClosedTrade: 900,
};

test('melhor dia sobre o lucro total: teto de hoje c/(1-c) do lucro anterior', () => {
  const result = computeConsistency(clause({ percent: 30 }), data)!;
  assert.equal(result.display, 'daycap');
  assert.equal(result.dayStartBalance, 102_000);
  assert.equal(result.cap, 857.14);
  // Melhor dia 1.200 > 30% de 1.500: precisa de 4.000 de lucro total.
  assert.equal(result.regularize, 2_500);
  assert.equal(result.status, 'warning');
});

test('melhor dia sobre a meta: teto fixo e meta que sobe se passar', () => {
  const ok = computeConsistency(clause({ kind: 'best_day_vs_profit_target', percent: 50, effect: 'raises_target' }), data)!;
  assert.equal(ok.cap, 5_000);
  assert.equal(ok.regularize, null);
  const passed = computeConsistency(
    clause({ kind: 'best_day_vs_profit_target', percent: 50, effect: 'raises_target' }),
    { ...data, days: [{ date: '2026-11-10', pnl: 6_000 }, { date: '2026-11-12', pnl: 0 }] },
  )!;
  // Melhor dia 6.000 = 50% de uma meta de 12.000: faltam 2.000 além da meta original.
  assert.equal(passed.regularize, 2_000);
  assert.ok(passed.message.includes('a meta sobe'));
});

test('teto diário de lucro: por percentual do saldo inicial ou valor fixo', () => {
  assert.equal(computeConsistency(clause({ kind: 'daily_profit_cap', percent: 2, effect: 'caps_counted_profit' }), data)!.cap, 2_000);
  assert.equal(computeConsistency(clause({ kind: 'daily_profit_cap', amount: 4_000, effect: 'caps_counted_profit' }), data)!.cap, 4_000);
});

test('dias lucrativos: conta só os dias acima do mínimo', () => {
  const result = computeConsistency(clause({ kind: 'profitable_days', days: 3, minDayProfitPercent: 1 }), data)!;
  assert.equal(result.display, 'counter');
  assert.equal(result.current, 1); // só o dia de +1.200 passa de 1% (1.000)
  assert.equal(result.required, 3);
});

test('maior trade sobre o lucro líquido: teto do próximo trade', () => {
  const result = computeConsistency(clause({ kind: 'largest_trade_vs_net_profit', percent: 33, estimated: true }), data)!;
  assert.equal(result.display, 'tradecap');
  // Lucro líquido 1.500: próximo trade até 0,33/0,67 × 1.500 = 738,81.
  assert.equal(result.cap, 738.81);
  // Maior trade 900 > 33% de 1.500 (495): precisa de 2.727,27 de lucro total.
  assert.equal(result.regularize, 1_227.27);
  assert.ok(result.message.includes('Estimativa'));
});

test('maior trade desconhecido: mostra o teto, sem inventar a regularização', () => {
  const result = computeConsistency(clause({ kind: 'largest_trade_vs_net_profit', percent: 33 }), { ...data, bestClosedTrade: null })!;
  assert.equal(result.cap, 738.81);
  assert.equal(result.regularize, null);
});

test('estrutura vence o texto livre e filtra pela fase', () => {
  const snapshot = {
    criticalRules: {
      consistencyRule: 'Melhor dia 50%',
      consistency: [clause({ appliesTo: 'funded', percent: 40 })],
    },
  } as any;
  assert.deepEqual(consistencyClausesForStage(snapshot, 'evaluation'), []);
  assert.equal(consistencyClausesForStage(snapshot, 'funded')![0].percent, 40);
});

test('sem estrutura, o texto livre continua valendo (vínculos antigos)', () => {
  const snapshot = { criticalRules: { consistencyRule: 'Best Day Rule de 50%; exceder não reprova' } } as any;
  const [legacy] = consistencyClausesForStage(snapshot, 'evaluation')!;
  assert.equal(legacy.percent, 50);
  assert.equal(legacy.effect, 'soft');
});

test('várias cláusulas: a principal vai ao vivo e as outras viram texto curto', () => {
  const result = primaryConsistency(
    [clause({ kind: 'profitable_days', days: 5 }), clause({ percent: 40 })],
    data,
  )!;
  assert.equal(result.display, 'daycap');
  assert.ok(result.message.includes('5 dias com lucro'));
});
