// === Fortify Types ===

export type UserRole = 'user' | 'admin';

export type RuleType =
  | 'MAX_DAILY_LOSS'
  | 'MAX_TOTAL_LOSS'
  | 'TRAILING_MAX_LOSS'
  | 'PROFIT_TARGET'
  | 'MIN_TRADING_DAYS'
  | 'CONSISTENCY_BEST_DAY_CAP'
  | 'INACTIVITY_LIMIT'
  | 'NEWS_RESTRICTION_WINDOW'
  | 'SCALPING_RULE'
  | 'MAX_STACKING_TRADES'
  | 'PROFIT_CAP_PAYOUT';

export type RuleSeverity = 'hard' | 'soft';
export type EvaluationScope = 'daily' | 'total' | 'phase' | 'payoutWindow';
export type RuleStatus = 'APPROVING' | 'WARNING' | 'VIOLATED' | 'NOT_MET';
export type RuleSetOrigin = 'template' | 'custom';
export type AccountStatus = 'active' | 'violated' | 'passed';

export interface TradingAccount {
  id: string;
  userId: string;
  nickname: string;
  broker: string;
  baseCurrency: string;
  startBalance: number;
  currentBalance: number;
  currentEquity: number;
  highestEquityAllTime: number;
  status: AccountStatus;
  ruleSetId: string;
  createdAt: string;
}

export interface RuleSet {
  id: string;
  name: string;
  origin: RuleSetOrigin;
  firmName?: string;
  version: number;
}

export interface Rule {
  id: string;
  ruleSetId: string;
  type: RuleType;
  name: string;
  severity: RuleSeverity;
  params: Record<string, unknown>;
  enabled: boolean;
  evaluationScope: EvaluationScope;
}

export interface RuleEvaluation {
  id: string;
  tradingAccountId: string;
  ruleId: string;
  rule: Rule;
  status: RuleStatus;
  progressPct: number;
  currentValue: number;
  limitValue: number;
  message: string;
  computedAt: string;
}

export interface DailySnapshot {
  id: string;
  tradingAccountId: string;
  date: string;
  startOfDayBalance: number;
  startOfDayEquity: number;
  endOfDayBalance: number;
  endOfDayEquity: number;
  intradayHighEquity: number;
  intradayLowEquity: number;
  closedPnLToday: number;
  openFloatingPnL: number;
  tradesCountToday: number;
}

export const RULE_TYPE_LABELS: Record<RuleType, string> = {
  MAX_DAILY_LOSS: 'Perda Diária Máxima',
  MAX_TOTAL_LOSS: 'Perda Total Máxima',
  TRAILING_MAX_LOSS: 'Trailing Max Loss',
  PROFIT_TARGET: 'Meta de Lucro',
  MIN_TRADING_DAYS: 'Dias Mínimos de Trading',
  CONSISTENCY_BEST_DAY_CAP: 'Consistência (Best Day Cap)',
  INACTIVITY_LIMIT: 'Limite de Inatividade',
  NEWS_RESTRICTION_WINDOW: 'Restrição de Notícias',
  SCALPING_RULE: 'Regra de Scalping',
  MAX_STACKING_TRADES: 'Max Trades Simultâneos',
  PROFIT_CAP_PAYOUT: 'Teto de Lucro/Payout',
};

export const RULE_TYPE_DESCRIPTIONS: Record<RuleType, string> = {
  MAX_DAILY_LOSS: 'Limita a perda máxima permitida em um único dia de negociação.',
  MAX_TOTAL_LOSS: 'Limita a perda total acumulada desde o início da conta.',
  TRAILING_MAX_LOSS: 'Limite de perda que acompanha o maior equity já atingido (high-water mark).',
  PROFIT_TARGET: 'Meta de lucro que deve ser atingida para aprovação na fase.',
  MIN_TRADING_DAYS: 'Número mínimo de dias com operações para cumprir o desafio.',
  CONSISTENCY_BEST_DAY_CAP: 'O lucro do melhor dia não pode exceder X% do lucro total.',
  INACTIVITY_LIMIT: 'Máximo de dias consecutivos sem operar.',
  NEWS_RESTRICTION_WINDOW: 'Restrição de operação em janela de notícias de alto impacto.',
  SCALPING_RULE: 'Restrições sobre trades de curta duração (scalping).',
  MAX_STACKING_TRADES: 'Limite de posições abertas simultâneas no mesmo símbolo.',
  PROFIT_CAP_PAYOUT: 'Teto máximo de lucro por ciclo de saque.',
};

export const STATUS_CONFIG: Record<RuleStatus, { label: string; color: string; bgClass: string; textClass: string }> = {
  APPROVING: { label: 'Aprovando', color: 'success', bgClass: 'bg-success/15', textClass: 'text-success' },
  WARNING: { label: 'Atenção', color: 'warning', bgClass: 'bg-warning/15', textClass: 'text-warning' },
  VIOLATED: { label: 'Violado', color: 'destructive', bgClass: 'bg-destructive/15', textClass: 'text-destructive' },
  NOT_MET: { label: 'Não Alcançado', color: 'muted', bgClass: 'bg-muted', textClass: 'text-muted-foreground' },
};
