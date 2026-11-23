import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildEaFeed,
  evaluateForEa,
  sanitizeEaDays,
  serializeEaError,
  serializeEaFeed,
  sanitizeEaRuleKeys,
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

test('só manda as regras que o trader escolheu; regra de texto vai como lembrete na aba Regras', () => {
  const row = fullBinding();
  row.rule_snapshot.criticalRules.newsRule = 'Proibido operar 2 minutos antes e depois de notícia';
  const feed = feedFor(row, live, { ruleKeys: ['consistency', 'news'], stage: 'evaluation', warningPct: 60, criticalPct: 90 });
  assert.deepEqual(feed.rules.map((r) => r.key), ['consistency', 'news']);
  const news = feed.rules.find((r) => r.key === 'news')!;
  assert.equal(news.kind, 'note');
  assert.equal(news.group, 'rules');
  assert.equal(news.message, 'Proibido operar 2 minutos antes e depois de notícia');
  assert.equal(feed.warningPct, 60);
});

test('sem escolha salva, regra de texto não aparece no EA', () => {
  const row = fullBinding();
  row.rule_snapshot.criticalRules.newsRule = 'Proibido operar 2 minutos antes e depois de notícia';
  const feed = feedFor(row, live, { ruleKeys: null, stage: 'evaluation', warningPct: 70, criticalPct: 85 });
  assert.ok(!feed.rules.some((r) => r.group === 'rules'));
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

test('aba Configurações do EA: manda todas as regras da mesa, marcando as ligadas', () => {
  const feed = feedFor(fullBinding(), live, { ...ALL, ruleKeys: ['daily_loss', 'news'] });
  const news = feed.options.find((o) => o.key === 'news')!;
  assert.equal(news.on, true);
  assert.equal(news.live, false);
  assert.equal(news.group, 'rules');
  assert.equal(feed.options.find((o) => o.key === 'max_drawdown')!.on, false);
  assert.deepEqual(feed.rules.map((r) => r.key), ['daily_loss', 'news']);
  const text = serializeEaFeed({ ...feed, notice: 'Aviso | curto' });
  const optionLines = text.split('\n').filter((l) => l.startsWith('O|'));
  assert.equal(optionLines.length, feed.options.length);
  assert.ok(optionLines.includes('O|news|Notícias|rules|0|1|Proibido operar 2 minutos antes e depois de notícias de alto impacto'));
  assert.ok(optionLines.includes('O|max_drawdown|Drawdown máximo|account|1|0|10% ($10.000)'));
  assert.match(text, /\nN\|Aviso curto\nEND\n$/);
});

test('aba Configurações do EA: cada regra traz o percentual e o valor já calculados', () => {
  // Vale também para regra desligada: o trader vê o número antes de decidir ligar.
  const feed = feedFor(fullBinding({ dailyLoss: '6%' }), live, { ...ALL, ruleKeys: ['news'] });
  const detail = (key: string) => feed.options.find((o) => o.key === key)?.detail;
  assert.equal(detail('daily_loss'), '6% ($6.000)');
  assert.equal(detail('max_drawdown'), '10% ($10.000)');
  assert.equal(detail('profit_target'), '10% ($10.000)');
  assert.equal(detail('consistency'), 'Maior dia até 30% do lucro total');
});

test('aba Configurações do EA: limite em dinheiro também vira percentual da conta', () => {
  const feed = feedFor(fullBinding({ dailyLoss: '$2.500' }), live);
  assert.equal(feed.options.find((o) => o.key === 'daily_loss')?.detail, '2,5% ($2.500)');
});

test('escolha vinda do EA: só chaves conhecidas, sem repetir', () => {
  assert.equal(sanitizeEaRuleKeys(undefined), null);
  assert.equal(sanitizeEaRuleKeys('daily_loss'), null);
  assert.deepEqual(sanitizeEaRuleKeys(['daily_loss', 'news', 'daily_loss', 'drop table', 7]), ['daily_loss', 'news']);
  assert.deepEqual(sanitizeEaRuleKeys([]), []);
});

// ---- Correções da auditoria de 18/11/2026 ----

function firmBinding(slug: string, overrides: Partial<AccountRuleBindingRow['rule_snapshot']['criticalRules']> = {}) {
  const base = fullBinding(overrides);
  return binding({
    rule_snapshot: { ...base.rule_snapshot, propFirm: { ...base.rule_snapshot.propFirm, slug } },
  });
}

const E8_PRO = { drawdownType: 'Static', drawdownCalculation: 'Piso fixo; após o primeiro payout, o loss level move para o saldo inicial.', maxLoss: '8% estático' };
const FUNDED: EaPreferences = { ...ALL, stage: 'funded' };
const fundedAccount = { ...account, stage: 'funded' as const };

function fundedFeed(row: AccountRuleBindingRow, input: EaLiveInput) {
  const evaluation = evaluateForEa(row, fundedAccount, input);
  return buildEaFeed({ binding: row, evaluation, live: input, account: fundedAccount, preferences: FUNDED });
}

test('E8 Pro: antes do saque o piso é o saldo inicial menos 8%', () => {
  const rule = fundedFeed(firmBinding('e8-markets', E8_PRO), { ...live, payouts: 0 }).rules.find((r) => r.key === 'max_drawdown')!;
  assert.equal(rule.kind, 'floor');
  assert.equal(rule.floor, 92_000);
});

test('E8 Pro: depois do primeiro saque o piso sobe para o saldo inicial', () => {
  const rule = fundedFeed(firmBinding('e8-markets', E8_PRO), { ...live, payouts: 1, lastPayoutDate: '2026-11-11' }).rules.find((r) => r.key === 'max_drawdown')!;
  assert.equal(rule.kind, 'floor');
  assert.equal(rule.floor, 100_000);
});

test('E8 Pro: EA antigo em conta funded não mostra piso que pode estar errado', () => {
  const rule = fundedFeed(firmBinding('e8-markets', E8_PRO), live).rules.find((r) => r.key === 'max_drawdown')!;
  assert.equal(rule.kind, 'note');
});

test('NP Future: o piso trava em saldo inicial + $100, não no saldo inicial', () => {
  const row = firmBinding('np-future', {
    drawdownType: 'EOD',
    drawdownCalculation: 'EOD móvel pelo maior fechamento diário; trava definitivamente em saldo inicial + $100.',
    maxLoss: '$3,000',
  });
  const peak: EaLiveInput = {
    ...live,
    balance: 110_000,
    equity: 110_000,
    days: [{ date: '2026-11-11', pnl: 10_000, eodBalance: 110_000, traded: true }],
  };
  const rule = feedFor(row, peak).rules.find((r) => r.key === 'max_drawdown')!;
  assert.equal(rule.floor, 100_100);
});

test('NP Future Standard: o texto que nega a trava não trava o piso', () => {
  const row = firmBinding('np-future', {
    drawdownType: 'Static',
    drawdownCalculation: 'A avaliação usa Max Loss por plano e não usa a trava EOD de saldo inicial + $100 aplicada à Funded.',
    maxLoss: '$3,000',
  });
  assert.equal(feedFor(row, live).rules.find((r) => r.key === 'max_drawdown')!.floor, 97_000);
});

test('FTMO: às 23h30 UTC a mesa já está no dia seguinte e a perda de ontem não conta', () => {
  const late = new Date('2026-11-12T23:30:00Z');
  const firmDay: EaLiveInput = {
    balance: 99_000,
    equity: 99_000,
    now: late,
    dayBasis: 'Europe/Prague+0',
    dayToday: '2026-11-13',
    days: [{ date: '2026-11-12', pnl: -1_000, eodBalance: 99_000, traded: true }],
  };
  const rule = feedFor(firmBinding('ftmo'), firmDay).rules.find((r) => r.key === 'daily_loss')!;
  // O dia da mesa começou agora com 99.000: quebra 5.000 abaixo.
  assert.equal(rule.floor, 94_000);
  assert.equal(rule.status, 'safe');
});

test('EA antigo continua em UTC mesmo em mesa com horário próprio', () => {
  const rule = feedFor(firmBinding('ftmo'), live).rules.find((r) => r.key === 'daily_loss')!;
  assert.equal(rule.floor, 97_000);
  assert.equal(rule.status, 'partial');
});

test('o gateway manda ao EA a hora em que a mesa vira o dia', () => {
  const text = serializeEaFeed(feedFor(firmBinding('ftmo'), live));
  const line = text.split('\n').find((item) => item.startsWith('D|'))!;
  const [, token, reset, exact, steps] = line.split('|');
  assert.equal(token, 'Europe/Prague+0');
  assert.equal(reset, '0');
  assert.equal(exact, '1');
  // Novembro em Praga é UTC+1.
  assert.equal(steps.split(',').at(-1)!.split(':')[1], '60');
});

test('mesa sem horário publicado fica em UTC e o painel avisa', () => {
  const feed = feedFor(firmBinding('asap-funding-prop'), live);
  assert.equal(feed.dayBoundary?.token, 'utc');
  assert.match(feed.rules.find((r) => r.key === 'daily_loss')!.message, /não publica/);
});

test('dias lucrativos: só conta o dia que fechou com o lucro mínimo', () => {
  const row = firmBinding('the-trading-pit', { minTradingDays: '3 dias lucrativos de pelo menos 0,5% do saldo inicial' });
  const history: EaLiveInput = {
    ...live,
    days: [
      { date: '2026-11-09', pnl: 500, eodBalance: 100_500, traded: true },
      { date: '2026-11-10', pnl: 499, eodBalance: 100_999, traded: true },
      { date: '2026-11-11', pnl: 800, eodBalance: 101_799, traded: true },
      { date: '2026-11-12', pnl: 900, eodBalance: 102_699, traded: true },
    ],
  };
  const feed = feedFor(row, history);
  const rule = feed.rules.find((r) => r.key === 'min_trading_days')!;
  assert.equal(rule.kind, 'counter');
  assert.equal(rule.mode, 'profitable');
  // $499 fica abaixo dos $500 e hoje ainda não fechou.
  assert.equal(rule.current, 2);
  assert.equal(rule.required, 3);
  assert.equal(rule.param1, 500);
  assert.equal(feed.options.find((o) => o.key === 'min_trading_days')!.detail, '3 dias com lucro de $500 ou mais');
});

test('dias positivos por ciclo: recomeça depois do último saque', () => {
  const row = firmBinding('asap-funding-prop', { minTradingDays: '7 dias positivos por ciclo, cada um com lucro de ao menos 0,1% do saldo' });
  const rule = feedFor(row, { ...live, lastPayoutDate: '2026-11-10' }).rules.find((r) => r.key === 'min_trading_days')!;
  assert.equal(rule.current, 1);
});

test('NP Future Funded: o lucro mínimo do dia vem da tabela do plano', () => {
  const row = firmBinding('np-future', { minTradingDays: '5 dias positivos por ciclo, com lucro mínimo diário por plano' });
  const rule = feedFor(row, live).rules.find((r) => r.key === 'min_trading_days')!;
  assert.equal(rule.param1, 250);
  assert.equal(rule.current, 2);
});
