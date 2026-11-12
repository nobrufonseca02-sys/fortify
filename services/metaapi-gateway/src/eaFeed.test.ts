import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildEaFeed,
  evaluateForEa,
  sanitizeEaDays,
  serializeEaError,
  serializeEaFeed,
  type EaLiveInput,
  type EaPreferences,
} from './eaFeed';
import { binding } from './testFixtures';
import type { AccountRuleBindingRow } from './ruleEngine/bindingTypes';

const NOW = new Date('2026-11-12T15:00:00Z');
const ALL: EaPreferences = { ruleKeys: null, stage: 'evaluation', warningPct: 70, criticalPct: 85 };
const account = { startBalance: 100_000, highestEquity: null, phase: 'Fase 1' };

function fullBinding(overrides: Partial<AccountRuleBindingRow['rule_snapshot']['criticalRules']> = {}) {
  const base = binding();
  return binding({
    rule_snapshot: {
      ...base.rule_snapshot,
      criticalRules: {
        ...base.rule_snapshot.criticalRules,
        consistencyRule: 'Melhor dia não pode passar de 30% do lucro total',
        newsRule: 'Proibido operar 2 minutos antes e depois de notícias de alto impacto',
        ...overrides,
      },
      monitorability: {
        automaticMt5: ['Perda diária', 'Perda máxima', 'Meta de lucro', 'Consistência', 'Dias mínimos'],
        manualCheck: ['Regra de notícias'],
        notSupportedYet: [],
      },
    },
  });
}

function feedFor(row: AccountRuleBindingRow, live: EaLiveInput, preferences = ALL) {
  const evaluation = evaluateForEa(row, account, live);
  return buildEaFeed({ binding: row, evaluation, live, account, preferences });
}

// Conta de 100k: dias anteriores somam +2.000 de lucro; hoje fechou -500 e está -300 flutuante.
const live: EaLiveInput = {
  balance: 101_500,
  equity: 101_200,
  now: NOW,
  days: [
    { date: '2026-11-10', pnl: 1_200, eodBalance: 101_200, traded: true },
    { date: '2026-11-11', pnl: 800, eodBalance: 102_000, traded: true },
    { date: '2026-11-12', pnl: -500, eodBalance: 101_500, traded: true },
  ],
};

test('perda diária vira equity mínima do dia: início do dia menos o limite', () => {
  const rule = feedFor(fullBinding(), live).rules.find((r) => r.key === 'daily_loss')!;
  assert.equal(rule.kind, 'floor');
  assert.equal(rule.limit, 5_000);
  // Começou o dia com 102.000; quebra em 97.000, medido sobre min(saldo, equity).
  assert.equal(rule.floor, 97_000);
  assert.equal(rule.metric, 'min');
});

test('dia no lucro: o piso diário continua sendo o início do dia menos o limite', () => {
  const winning: EaLiveInput = {
    ...live,
    balance: 103_000,
    equity: 103_400,
    days: [...live.days.slice(0, 2), { date: '2026-11-12', pnl: 1_000, eodBalance: 103_000, traded: true }],
  };
  const rule = feedFor(fullBinding(), winning).rules.find((r) => r.key === 'daily_loss')!;
  assert.equal(rule.floor, 97_000);
});

test('drawdown estático vira piso fixo no saldo inicial menos o limite', () => {
  const rule = feedFor(fullBinding(), live).rules.find((r) => r.key === 'max_drawdown')!;
  assert.equal(rule.floor, 90_000);
  assert.equal(rule.trailing, null);
});

test('drawdown trailing por equity avisa o EA para subir o piso com o pico', () => {
  const row = fullBinding({ drawdownType: 'trailing', drawdownCalculation: 'high-water mark de equity' });
  const rule = feedFor(row, live).rules.find((r) => r.key === 'max_drawdown')!;
  assert.equal(rule.trailing, 'equity');
  // Maior equity conhecida é 102.000 (fim de ontem): piso 92.000.
  assert.equal(rule.floor, 92_000);
});

test('meta de lucro devolve o saldo em que a fase é concluída', () => {
  const rule = feedFor(fullBinding(), live).rules.find((r) => r.key === 'profit_target')!;
  assert.equal(rule.kind, 'target');
  assert.equal(rule.targetBalance, 110_000);
});

test('consistência devolve o teto de lucro de hoje: c/(1-c) do lucro anterior', () => {
  const rule = feedFor(fullBinding(), live).rules.find((r) => r.key === 'consistency')!;
  assert.equal(rule.kind, 'daycap');
  assert.equal(rule.dayStartBalance, 102_000);
  // Lucro antes de hoje 2.000; 0,3/0,7 × 2.000 = 857,14.
  assert.equal(rule.todayCap, 857.14);
  // Melhor dia anterior 1.200 > 30% de 1.500 de lucro total: faltam 4.000 - 1.500.
  assert.equal(rule.regularizeProfit, 2_500);
});

test('consistência que o motor não sabe calcular não vai para o EA, nunca vira número chutado', () => {
  const row = fullBinding({ consistencyRule: 'Trade Value Score acima de 50%' });
  const rule = feedFor(row, live, { ...ALL, ruleKeys: ['consistency'] }).rules.find((r) => r.key === 'consistency');
  assert.equal(rule, undefined);
});

test('só manda as regras que o trader escolheu; notícias salvas antes são ignoradas', () => {
  const feed = feedFor(fullBinding(), live, { ruleKeys: ['consistency', 'news'] as any, stage: 'evaluation', warningPct: 60, criticalPct: 90 });
  assert.deepEqual(feed.rules.map((r) => r.key), ['consistency']);
  assert.equal(feed.warningPct, 60);
});

test('histórico do terminal é limpo: datas inválidas e duplicadas saem', () => {
  const days = sanitizeEaDays([
    { date: '2026-11-10', pnl: 10, eodBalance: 100, traded: true },
    { date: '2026-11-10', pnl: 20, eodBalance: 120, traded: true },
    { date: 'ontem', pnl: 5, eodBalance: 1 },
    { date: '2026-11-11', pnl: 'x', eodBalance: 1 },
  ]);
  assert.deepEqual(days, [{ date: '2026-11-10', pnl: 20, eodBalance: 120, traded: true }]);
});

test('formato para o EA: versionado, uma regra por linha, sem "|" solto no texto', () => {
  const row = fullBinding({ consistencyRule: 'Sem consistência na avaliação; 25% | no\nestágio funded' });
  const text = serializeEaFeed(feedFor(row, live, { ...ALL, stage: 'funded', ruleKeys: ['daily_loss', 'consistency'] }));
  const lines = text.trim().split('\n');
  assert.equal(lines[0], 'FORTIFY-EA|1');
  assert.match(lines[1], /^OK\|Firm\|2-Step\|\$100K\|USD\|/);
  assert.equal(lines.at(-1), 'END');
  for (const line of lines.filter((l) => l.startsWith('R|'))) assert.equal(line.split('|').length, 20);
  assert.match(serializeEaError('plan_inactive', 'Assinatura | inativa'), /^FORTIFY-EA\|1\nERR\|plan_inactive\|Assinatura inativa\nEND/);
});

test('fase funded: consistência do saque vira teto de hoje e a meta de lucro sai', () => {
  const row = fullBinding({ consistencyRule: 'Sem consistência na avaliação; 25% no estágio funded' });
  const evaluationFeed = feedFor(row, live);
  assert.equal(evaluationFeed.rules.some((r) => r.key === 'consistency'), false);
  const fundedFeed = feedFor(row, live, { ...ALL, stage: 'funded' });
  const consistency = fundedFeed.rules.find((r) => r.key === 'consistency')!;
  assert.equal(consistency.kind, 'daycap');
  // 0,25/0,75 × 2.000 de lucro antes de hoje.
  assert.equal(consistency.todayCap, 666.67);
  assert.equal(fundedFeed.rules.some((r) => r.key === 'profit_target'), false);
  assert.equal(fundedFeed.stage, 'funded');
});

test('inatividade conta os dias desde o último dia operado', () => {
  const row = fullBinding({ minTradingDays: '3 dias por fase; inatividade em 30 dias' });
  const quiet: EaLiveInput = {
    ...live,
    days: [
      { date: '2026-10-20', pnl: 300, eodBalance: 101_500, traded: true },
      { date: '2026-11-12', pnl: 0, eodBalance: 101_500, traded: false },
    ],
  };
  const rule = feedFor(row, quiet).rules.find((r) => r.key === 'inactivity')!;
  assert.equal(rule.kind, 'idle');
  assert.equal(rule.current, 23);
  assert.equal(rule.required, 30);
});

test('fechamento de sexta, lote máximo, perda flutuante e risco aberto viram regras ao vivo', () => {
  const row = fullBinding({
    weekendRule: 'Obrigatório fechar sexta-feira até 23:45 GMT+3',
    maxLots: '2,5 / 5 / 10 / 20 / 40 / 80 / 120 lotes',
    breachConditions: ['Perda flutuante máxima de 1,5%.', 'Risco aberto funded de 3%.'],
  });
  const feed = feedFor(row, live, { ...ALL, stage: 'funded' });
  const byKey = Object.fromEntries(feed.rules.map((r) => [r.key, r]));
  assert.equal(byKey.weekend.kind, 'close');
  assert.equal(byKey.weekend.param1, 20 * 60 + 45);
  assert.equal(byKey.weekend.metric, 'utc');
  assert.equal(byKey.max_lots.kind, 'lots');
  assert.equal(byKey.max_lots.limit, 40);
  assert.equal(byKey.floating_loss.limit, 1_500);
  assert.equal(byKey.open_risk.limit, 3_000);
  // Ordem do painel: o que zera a conta vem antes do que trava o saque.
  const groups = feed.rules.map((r) => r.group);
  assert.ok(groups.lastIndexOf('account') < groups.indexOf('payout'));
});

test('inatividade não depende da ordem do histórico', () => {
  const row = fullBinding({ minTradingDays: 'inatividade em 30 dias' });
  // Histórico em ordem crescente, como vem do terminal antes da limpeza.
  const rule = feedFor(row, live).rules.find((r) => r.key === 'inactivity')!;
  assert.equal(rule.current, 0);
});
