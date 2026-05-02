import { TradingAccount, RuleSet, Rule, RuleEvaluation } from '@/types/fortify';

// === Rule Set Templates ===
export const RULE_SET_TEMPLATES: RuleSet[] = [
  { id: 'tpl-ftmo', name: 'FTMO Challenge', origin: 'template', firmName: 'FTMO', version: 1 },
  { id: 'tpl-topstep', name: 'Topstep Combine', origin: 'template', firmName: 'Topstep', version: 1 },
  { id: 'tpl-hantec', name: 'Hantec Trader', origin: 'template', firmName: 'Hantec', version: 1 },
];

export const TEMPLATE_RULES: Rule[] = [
  // FTMO
  { id: 'r1', ruleSetId: 'tpl-ftmo', type: 'MAX_DAILY_LOSS', name: 'Perda Diária Máx. 5%', severity: 'hard', params: { percentOrAmount: 5, basis: 'initialBalance', measure: 'equity', hardStop: true }, enabled: true, evaluationScope: 'daily' },
  { id: 'r2', ruleSetId: 'tpl-ftmo', type: 'MAX_TOTAL_LOSS', name: 'Perda Total Máx. 10%', severity: 'hard', params: { percentOrAmount: 10, basis: 'initialBalance', measure: 'equity' }, enabled: true, evaluationScope: 'total' },
  { id: 'r3', ruleSetId: 'tpl-ftmo', type: 'PROFIT_TARGET', name: 'Meta de Lucro 10%', severity: 'hard', params: { percentOrAmount: 10, basis: 'initialBalance', calculation: 'closedPnLOnly', phaseId: 'evaluation' }, enabled: true, evaluationScope: 'phase' },
  { id: 'r4', ruleSetId: 'tpl-ftmo', type: 'MIN_TRADING_DAYS', name: 'Mínimo 4 Dias', severity: 'hard', params: { minDays: 4, definition: 'daysWithTrade' }, enabled: true, evaluationScope: 'phase' },
  // Topstep
  { id: 'r5', ruleSetId: 'tpl-topstep', type: 'MAX_DAILY_LOSS', name: 'Daily Loss Limit', severity: 'hard', params: { percentOrAmount: 2000, basis: 'startOfDayBalance', measure: 'balance', hardStop: true }, enabled: true, evaluationScope: 'daily' },
  { id: 'r6', ruleSetId: 'tpl-topstep', type: 'TRAILING_MAX_LOSS', name: 'Trailing Drawdown', severity: 'hard', params: { trailPercentOrAmount: 3000, anchor: 'highestEODBalance', measure: 'balance' }, enabled: true, evaluationScope: 'total' },
  { id: 'r7', ruleSetId: 'tpl-topstep', type: 'CONSISTENCY_BEST_DAY_CAP', name: 'Consistência 50%', severity: 'soft', params: { capPercent: 50, basis: 'totalNetProfitInWindow', window: 'payoutWindow' }, enabled: true, evaluationScope: 'payoutWindow' },
  { id: 'r8', ruleSetId: 'tpl-topstep', type: 'PROFIT_TARGET', name: 'Meta $6,000', severity: 'hard', params: { percentOrAmount: 6000, basis: 'initialBalance', calculation: 'closedPnLOnly' }, enabled: true, evaluationScope: 'phase' },
  // Hantec
  { id: 'r9', ruleSetId: 'tpl-hantec', type: 'MAX_DAILY_LOSS', name: 'Perda Diária 5%', severity: 'hard', params: { percentOrAmount: 5, basis: 'startOfDayEquity', measure: 'equity', hardStop: true }, enabled: true, evaluationScope: 'daily' },
  { id: 'r10', ruleSetId: 'tpl-hantec', type: 'MAX_TOTAL_LOSS', name: 'Perda Total 10%', severity: 'hard', params: { percentOrAmount: 10, basis: 'initialBalance', measure: 'equity' }, enabled: true, evaluationScope: 'total' },
  { id: 'r11', ruleSetId: 'tpl-hantec', type: 'PROFIT_TARGET', name: 'Meta de Lucro 8%', severity: 'hard', params: { percentOrAmount: 8, basis: 'initialBalance', calculation: 'closedPnLOnly' }, enabled: true, evaluationScope: 'phase' },
  { id: 'r12', ruleSetId: 'tpl-hantec', type: 'NEWS_RESTRICTION_WINDOW', name: 'Restrição de Notícias', severity: 'soft', params: { minutesBefore: 3, minutesAfter: 3, calendarSourceText: 'Forex Factory', enforcement: 'informational' }, enabled: true, evaluationScope: 'daily' },
  { id: 'r13', ruleSetId: 'tpl-hantec', type: 'SCALPING_RULE', name: 'Anti-Scalping', severity: 'soft', params: { definition: 'tradesUnder3Min', maxScalpedProfitSharePercent: 10 }, enabled: true, evaluationScope: 'total' },
];

// === Mock Accounts ===
export const MOCK_ACCOUNTS: TradingAccount[] = [
  {
    id: 'acc-1',
    userId: 'u1',
    nickname: 'FTMO 100k Challenge',
    broker: 'MT5 - FTMO',
    baseCurrency: 'USD',
    startBalance: 100000,
    currentBalance: 103450,
    currentEquity: 103200,
    highestEquityAllTime: 104800,
    status: 'active',
    ruleSetId: 'tpl-ftmo',
    createdAt: '2026-02-15',
  },
  {
    id: 'acc-2',
    userId: 'u1',
    nickname: 'Topstep 150k Combine',
    broker: 'MT5 - Topstep',
    baseCurrency: 'USD',
    startBalance: 150000,
    currentBalance: 152800,
    currentEquity: 152500,
    highestEquityAllTime: 153200,
    status: 'active',
    ruleSetId: 'tpl-topstep',
    createdAt: '2026-02-20',
  },
  {
    id: 'acc-3',
    userId: 'u1',
    nickname: 'Hantec 50k Funded',
    broker: 'MT5 - Hantec',
    baseCurrency: 'USD',
    startBalance: 50000,
    currentBalance: 48200,
    currentEquity: 47900,
    highestEquityAllTime: 51500,
    status: 'active',
    ruleSetId: 'tpl-hantec',
    createdAt: '2026-01-10',
  },
];

// === Mock Evaluations ===
export const MOCK_EVALUATIONS: RuleEvaluation[] = [
  // FTMO acc-1
  { id: 'ev1', tradingAccountId: 'acc-1', ruleId: 'r1', rule: TEMPLATE_RULES[0], status: 'APPROVING', progressPct: 28, currentValue: 1400, limitValue: 5000, message: 'Perda do dia: $1,400 de $5,000 permitidos', computedAt: '2026-03-03T10:00:00Z' },
  { id: 'ev2', tradingAccountId: 'acc-1', ruleId: 'r2', rule: TEMPLATE_RULES[1], status: 'APPROVING', progressPct: 15, currentValue: 1500, limitValue: 10000, message: 'Drawdown total: $1,500 de $10,000 permitidos', computedAt: '2026-03-03T10:00:00Z' },
  { id: 'ev3', tradingAccountId: 'acc-1', ruleId: 'r3', rule: TEMPLATE_RULES[2], status: 'WARNING', progressPct: 65, currentValue: 6500, limitValue: 10000, message: 'Lucro acumulado: $6,500 de $10,000 necessários', computedAt: '2026-03-03T10:00:00Z' },
  { id: 'ev4', tradingAccountId: 'acc-1', ruleId: 'r4', rule: TEMPLATE_RULES[3], status: 'NOT_MET', progressPct: 50, currentValue: 2, limitValue: 4, message: '2 de 4 dias mínimos completados', computedAt: '2026-03-03T10:00:00Z' },
  // Topstep acc-2
  { id: 'ev5', tradingAccountId: 'acc-2', ruleId: 'r5', rule: TEMPLATE_RULES[4], status: 'APPROVING', progressPct: 10, currentValue: 200, limitValue: 2000, message: 'Perda do dia: $200 de $2,000 permitidos', computedAt: '2026-03-03T10:00:00Z' },
  { id: 'ev6', tradingAccountId: 'acc-2', ruleId: 'r6', rule: TEMPLATE_RULES[5], status: 'APPROVING', progressPct: 23, currentValue: 700, limitValue: 3000, message: 'Trailing drawdown: $700 de $3,000', computedAt: '2026-03-03T10:00:00Z' },
  { id: 'ev7', tradingAccountId: 'acc-2', ruleId: 'r7', rule: TEMPLATE_RULES[6], status: 'APPROVING', progressPct: 38, currentValue: 38, limitValue: 50, message: 'Melhor dia = 38% do lucro total (máx 50%)', computedAt: '2026-03-03T10:00:00Z' },
  { id: 'ev8', tradingAccountId: 'acc-2', ruleId: 'r8', rule: TEMPLATE_RULES[7], status: 'NOT_MET', progressPct: 47, currentValue: 2800, limitValue: 6000, message: 'Lucro: $2,800 de $6,000 necessários', computedAt: '2026-03-03T10:00:00Z' },
  // Hantec acc-3
  { id: 'ev9', tradingAccountId: 'acc-3', ruleId: 'r9', rule: TEMPLATE_RULES[8], status: 'WARNING', progressPct: 72, currentValue: 1800, limitValue: 2500, message: 'Perda do dia: $1,800 de $2,500 — Atenção!', computedAt: '2026-03-03T10:00:00Z' },
  { id: 'ev10', tradingAccountId: 'acc-3', ruleId: 'r10', rule: TEMPLATE_RULES[9], status: 'WARNING', progressPct: 56, currentValue: 2800, limitValue: 5000, message: 'Drawdown total: $2,800 de $5,000', computedAt: '2026-03-03T10:00:00Z' },
  { id: 'ev11', tradingAccountId: 'acc-3', ruleId: 'r11', rule: TEMPLATE_RULES[10], status: 'NOT_MET', progressPct: 0, currentValue: -1800, limitValue: 4000, message: 'Lucro negativo — meta não atingida', computedAt: '2026-03-03T10:00:00Z' },
  { id: 'ev12', tradingAccountId: 'acc-3', ruleId: 'r12', rule: TEMPLATE_RULES[11], status: 'APPROVING', progressPct: 100, currentValue: 0, limitValue: 0, message: 'Nenhuma violação de notícias detectada', computedAt: '2026-03-03T10:00:00Z' },
  { id: 'ev13', tradingAccountId: 'acc-3', ruleId: 'r13', rule: TEMPLATE_RULES[12], status: 'APPROVING', progressPct: 100, currentValue: 3, limitValue: 10, message: 'Scalping share: 3% (máx 10%)', computedAt: '2026-03-03T10:00:00Z' },
];
