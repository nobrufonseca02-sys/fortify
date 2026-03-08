import { RuleType } from '@/types/fortify';

export interface TemplateRule {
  type: RuleType;
  name: string;
  severity: 'hard' | 'soft';
  defaultValue: number;
  unit: '%' | '$' | 'days' | 'min';
  editable: boolean;
  enabled: boolean;
}

export interface FirmTemplate {
  id: string;
  name: string;
  logo: string;
  color: string;
  description: string;
  accountTypes: string[];
  rules: TemplateRule[];
}

export const FIRM_TEMPLATES: FirmTemplate[] = [
  {
    id: 'ftmo', name: 'FTMO', logo: 'F', color: 'hsl(var(--primary))',
    description: 'A prop firm mais popular do mundo. Regras rígidas e consistentes.',
    accountTypes: ['Challenge Phase 1', 'Challenge Phase 2', 'Funded'],
    rules: [
      { type: 'MAX_DAILY_LOSS', name: 'Perda Diária Máxima', severity: 'hard', defaultValue: 5, unit: '%', editable: true, enabled: true },
      { type: 'MAX_TOTAL_LOSS', name: 'Perda Total Máxima', severity: 'hard', defaultValue: 10, unit: '%', editable: true, enabled: true },
      { type: 'PROFIT_TARGET', name: 'Meta de Lucro', severity: 'hard', defaultValue: 10, unit: '%', editable: true, enabled: true },
      { type: 'MIN_TRADING_DAYS', name: 'Dias Mínimos de Trading', severity: 'hard', defaultValue: 4, unit: 'days', editable: true, enabled: true },
      { type: 'NEWS_RESTRICTION_WINDOW', name: 'Restrição de Notícias', severity: 'soft', defaultValue: 0, unit: 'min', editable: false, enabled: false },
      { type: 'SCALPING_RULE', name: 'Regra de Scalping', severity: 'soft', defaultValue: 0, unit: 'min', editable: false, enabled: false },
    ],
  },
  {
    id: 'fundingpips', name: 'FundingPips', logo: 'FP', color: 'hsl(160, 70%, 45%)',
    description: 'Sem limite de tempo, regras simples e payouts rápidos.',
    accountTypes: ['Evaluation Phase 1', 'Evaluation Phase 2', 'Funded'],
    rules: [
      { type: 'MAX_DAILY_LOSS', name: 'Perda Diária Máxima', severity: 'hard', defaultValue: 5, unit: '%', editable: true, enabled: true },
      { type: 'MAX_TOTAL_LOSS', name: 'Perda Total Máxima', severity: 'hard', defaultValue: 10, unit: '%', editable: true, enabled: true },
      { type: 'PROFIT_TARGET', name: 'Meta de Lucro', severity: 'hard', defaultValue: 8, unit: '%', editable: true, enabled: true },
      { type: 'MIN_TRADING_DAYS', name: 'Dias Mínimos', severity: 'hard', defaultValue: 3, unit: 'days', editable: true, enabled: true },
      { type: 'NEWS_RESTRICTION_WINDOW', name: 'Restrição de Notícias', severity: 'soft', defaultValue: 5, unit: 'min', editable: true, enabled: true },
    ],
  },
  {
    id: 'fxify', name: 'FXIFY', logo: 'FX', color: 'hsl(200, 80%, 50%)',
    description: 'Prop firm inovadora com modelo de 1, 2 ou 3 fases.',
    accountTypes: ['1-Phase', '2-Phase', '3-Phase', 'Funded'],
    rules: [
      { type: 'MAX_DAILY_LOSS', name: 'Perda Diária Máxima', severity: 'hard', defaultValue: 5, unit: '%', editable: true, enabled: true },
      { type: 'MAX_TOTAL_LOSS', name: 'Perda Total Máxima', severity: 'hard', defaultValue: 10, unit: '%', editable: true, enabled: true },
      { type: 'PROFIT_TARGET', name: 'Meta de Lucro', severity: 'hard', defaultValue: 10, unit: '%', editable: true, enabled: true },
      { type: 'MIN_TRADING_DAYS', name: 'Dias Mínimos', severity: 'hard', defaultValue: 5, unit: 'days', editable: true, enabled: true },
      { type: 'CONSISTENCY_BEST_DAY_CAP', name: 'Consistência', severity: 'soft', defaultValue: 0, unit: '%', editable: true, enabled: false },
    ],
  },
  {
    id: 'tradingpit', name: 'The Trading Pit', logo: 'TP', color: 'hsl(280, 65%, 55%)',
    description: 'Prop firm europeia com foco em futuros e forex.',
    accountTypes: ['Challenge', 'Funded'],
    rules: [
      { type: 'MAX_DAILY_LOSS', name: 'Perda Diária Máxima', severity: 'hard', defaultValue: 5, unit: '%', editable: true, enabled: true },
      { type: 'MAX_TOTAL_LOSS', name: 'Perda Total Máxima', severity: 'hard', defaultValue: 10, unit: '%', editable: true, enabled: true },
      { type: 'PROFIT_TARGET', name: 'Meta de Lucro', severity: 'hard', defaultValue: 8, unit: '%', editable: true, enabled: true },
      { type: 'MIN_TRADING_DAYS', name: 'Dias Mínimos', severity: 'hard', defaultValue: 3, unit: 'days', editable: true, enabled: true },
      { type: 'PROFIT_CAP_PAYOUT', name: 'Teto de Payout', severity: 'soft', defaultValue: 5, unit: '%', editable: true, enabled: true },
    ],
  },
  {
    id: 'e8markets', name: 'E8 Markets', logo: 'E8', color: 'hsl(220, 75%, 55%)',
    description: 'Regras claras com trailing drawdown e desafio em 1 ou 2 fases.',
    accountTypes: ['E8 Track', 'ELEV8', 'Funded'],
    rules: [
      { type: 'MAX_DAILY_LOSS', name: 'Perda Diária Máxima', severity: 'hard', defaultValue: 5, unit: '%', editable: true, enabled: true },
      { type: 'TRAILING_MAX_LOSS', name: 'Trailing Drawdown', severity: 'hard', defaultValue: 8, unit: '%', editable: true, enabled: true },
      { type: 'PROFIT_TARGET', name: 'Meta de Lucro', severity: 'hard', defaultValue: 8, unit: '%', editable: true, enabled: true },
      { type: 'MIN_TRADING_DAYS', name: 'Dias Mínimos', severity: 'hard', defaultValue: 5, unit: 'days', editable: true, enabled: true },
      { type: 'NEWS_RESTRICTION_WINDOW', name: 'Restrição de Notícias', severity: 'soft', defaultValue: 2, unit: 'min', editable: true, enabled: true },
    ],
  },
  {
    id: 'fundednext', name: 'FundedNext', logo: 'FN', color: 'hsl(38, 92%, 50%)',
    description: 'Crescimento de conta com plano de escalonamento. Regras amigáveis.',
    accountTypes: ['Evaluation', 'Express', 'Funded'],
    rules: [
      { type: 'MAX_DAILY_LOSS', name: 'Perda Diária Máxima', severity: 'hard', defaultValue: 5, unit: '%', editable: true, enabled: true },
      { type: 'MAX_TOTAL_LOSS', name: 'Perda Total Máxima', severity: 'hard', defaultValue: 10, unit: '%', editable: true, enabled: true },
      { type: 'PROFIT_TARGET', name: 'Meta de Lucro', severity: 'hard', defaultValue: 10, unit: '%', editable: true, enabled: true },
      { type: 'MIN_TRADING_DAYS', name: 'Dias Mínimos', severity: 'hard', defaultValue: 5, unit: 'days', editable: true, enabled: true },
      { type: 'CONSISTENCY_BEST_DAY_CAP', name: 'Consistência (Best Day)', severity: 'soft', defaultValue: 0, unit: '%', editable: true, enabled: false },
      { type: 'NEWS_RESTRICTION_WINDOW', name: 'Restrição de Notícias', severity: 'soft', defaultValue: 0, unit: 'min', editable: true, enabled: false },
    ],
  },
  {
    id: 'the5ers', name: 'The5ers', logo: '5', color: 'hsl(145, 65%, 45%)',
    description: 'Programa de crescimento com escalonamento real e foco em consistência.',
    accountTypes: ['Hyper Growth', 'High Stakes', 'Funded'],
    rules: [
      { type: 'MAX_DAILY_LOSS', name: 'Perda Diária Máxima', severity: 'hard', defaultValue: 3, unit: '%', editable: true, enabled: true },
      { type: 'MAX_TOTAL_LOSS', name: 'Perda Total Máxima', severity: 'hard', defaultValue: 6, unit: '%', editable: true, enabled: true },
      { type: 'PROFIT_TARGET', name: 'Meta de Lucro', severity: 'hard', defaultValue: 8, unit: '%', editable: true, enabled: true },
      { type: 'MIN_TRADING_DAYS', name: 'Dias Mínimos', severity: 'hard', defaultValue: 3, unit: 'days', editable: true, enabled: true },
      { type: 'CONSISTENCY_BEST_DAY_CAP', name: 'Consistência', severity: 'soft', defaultValue: 0, unit: '%', editable: true, enabled: false },
      { type: 'SCALPING_RULE', name: 'Anti-Scalping', severity: 'soft', defaultValue: 0, unit: 'min', editable: true, enabled: false },
    ],
  },
  {
    id: 'brightfunded', name: 'BrightFunded', logo: 'BF', color: 'hsl(50, 90%, 50%)',
    description: 'Prop firm com regras transparentes e avaliação em 2 fases.',
    accountTypes: ['Phase 1', 'Phase 2', 'Funded'],
    rules: [
      { type: 'MAX_DAILY_LOSS', name: 'Perda Diária Máxima', severity: 'hard', defaultValue: 5, unit: '%', editable: true, enabled: true },
      { type: 'MAX_TOTAL_LOSS', name: 'Perda Total Máxima', severity: 'hard', defaultValue: 10, unit: '%', editable: true, enabled: true },
      { type: 'PROFIT_TARGET', name: 'Meta de Lucro', severity: 'hard', defaultValue: 8, unit: '%', editable: true, enabled: true },
      { type: 'MIN_TRADING_DAYS', name: 'Dias Mínimos', severity: 'hard', defaultValue: 5, unit: 'days', editable: true, enabled: true },
      { type: 'INACTIVITY_LIMIT', name: 'Limite de Inatividade', severity: 'soft', defaultValue: 30, unit: 'days', editable: true, enabled: true },
    ],
  },
  {
    id: 'apex', name: 'Apex Trader Funding', logo: 'AT', color: 'hsl(15, 85%, 55%)',
    description: 'Focada em futuros. Trailing drawdown com regras simples.',
    accountTypes: ['Evaluation', 'PA (Performance Account)'],
    rules: [
      { type: 'MAX_DAILY_LOSS', name: 'Perda Diária Máxima', severity: 'hard', defaultValue: 0, unit: '$', editable: true, enabled: false },
      { type: 'TRAILING_MAX_LOSS', name: 'Trailing Drawdown', severity: 'hard', defaultValue: 2500, unit: '$', editable: true, enabled: true },
      { type: 'PROFIT_TARGET', name: 'Meta de Lucro', severity: 'hard', defaultValue: 6000, unit: '$', editable: true, enabled: true },
      { type: 'MIN_TRADING_DAYS', name: 'Dias Mínimos', severity: 'hard', defaultValue: 7, unit: 'days', editable: true, enabled: true },
      { type: 'PROFIT_CAP_PAYOUT', name: 'Teto de Payout', severity: 'soft', defaultValue: 0, unit: '$', editable: true, enabled: false },
    ],
  },
  {
    id: 'topstep', name: 'Topstep', logo: 'T', color: 'hsl(var(--warning))',
    description: 'Focada em futuros. Trailing drawdown e regra de consistência.',
    accountTypes: ['Combine', 'Funded'],
    rules: [
      { type: 'MAX_DAILY_LOSS', name: 'Limite de Perda Diária', severity: 'hard', defaultValue: 2000, unit: '$', editable: true, enabled: true },
      { type: 'TRAILING_MAX_LOSS', name: 'Trailing Drawdown', severity: 'hard', defaultValue: 3000, unit: '$', editable: true, enabled: true },
      { type: 'PROFIT_TARGET', name: 'Meta de Lucro', severity: 'hard', defaultValue: 6000, unit: '$', editable: true, enabled: true },
      { type: 'CONSISTENCY_BEST_DAY_CAP', name: 'Consistência (Best Day)', severity: 'soft', defaultValue: 50, unit: '%', editable: true, enabled: true },
    ],
  },
  {
    id: 'hantec', name: 'Hantec', logo: 'H', color: 'hsl(var(--success))',
    description: 'Trader sem limites de tempo. Regras flexíveis com foco em consistência.',
    accountTypes: ['Challenge', 'Funded'],
    rules: [
      { type: 'MAX_DAILY_LOSS', name: 'Perda Diária Máxima', severity: 'hard', defaultValue: 5, unit: '%', editable: true, enabled: true },
      { type: 'MAX_TOTAL_LOSS', name: 'Perda Total Máxima', severity: 'hard', defaultValue: 10, unit: '%', editable: true, enabled: true },
      { type: 'PROFIT_TARGET', name: 'Meta de Lucro', severity: 'hard', defaultValue: 8, unit: '%', editable: true, enabled: true },
      { type: 'NEWS_RESTRICTION_WINDOW', name: 'Restrição de Notícias', severity: 'soft', defaultValue: 3, unit: 'min', editable: true, enabled: true },
      { type: 'SCALPING_RULE', name: 'Anti-Scalping', severity: 'soft', defaultValue: 3, unit: 'min', editable: true, enabled: true },
    ],
  },
  {
    id: 'fundscap', name: 'Fundscap', logo: 'FC', color: 'hsl(190, 70%, 50%)',
    description: 'Prop firm com avaliação rápida e regras competitivas.',
    accountTypes: ['Challenge', 'Funded'],
    rules: [
      { type: 'MAX_DAILY_LOSS', name: 'Perda Diária Máxima', severity: 'hard', defaultValue: 5, unit: '%', editable: true, enabled: true },
      { type: 'MAX_TOTAL_LOSS', name: 'Perda Total Máxima', severity: 'hard', defaultValue: 10, unit: '%', editable: true, enabled: true },
      { type: 'PROFIT_TARGET', name: 'Meta de Lucro', severity: 'hard', defaultValue: 10, unit: '%', editable: true, enabled: true },
      { type: 'MIN_TRADING_DAYS', name: 'Dias Mínimos', severity: 'hard', defaultValue: 5, unit: 'days', editable: true, enabled: true },
      { type: 'INACTIVITY_LIMIT', name: 'Limite de Inatividade', severity: 'soft', defaultValue: 30, unit: 'days', editable: true, enabled: true },
    ],
  },
  {
    id: 'custom', name: 'Custom', logo: 'C', color: 'hsl(var(--muted-foreground))',
    description: 'Configure suas próprias regras do zero para qualquer prop firm.',
    accountTypes: ['Challenge', 'Funded', 'Instant'],
    rules: [
      { type: 'MAX_DAILY_LOSS', name: 'Perda Diária Máxima', severity: 'hard', defaultValue: 5, unit: '%', editable: true, enabled: true },
      { type: 'MAX_TOTAL_LOSS', name: 'Perda Total Máxima', severity: 'hard', defaultValue: 10, unit: '%', editable: true, enabled: true },
      { type: 'TRAILING_MAX_LOSS', name: 'Trailing Drawdown', severity: 'hard', defaultValue: 0, unit: '%', editable: true, enabled: false },
      { type: 'PROFIT_TARGET', name: 'Meta de Lucro', severity: 'hard', defaultValue: 10, unit: '%', editable: true, enabled: true },
      { type: 'MIN_TRADING_DAYS', name: 'Dias Mínimos', severity: 'hard', defaultValue: 0, unit: 'days', editable: true, enabled: false },
      { type: 'CONSISTENCY_BEST_DAY_CAP', name: 'Consistência', severity: 'soft', defaultValue: 0, unit: '%', editable: true, enabled: false },
      { type: 'NEWS_RESTRICTION_WINDOW', name: 'Restrição de Notícias', severity: 'soft', defaultValue: 0, unit: 'min', editable: true, enabled: false },
      { type: 'SCALPING_RULE', name: 'Regra de Scalping', severity: 'soft', defaultValue: 0, unit: 'min', editable: true, enabled: false },
      { type: 'MAX_STACKING_TRADES', name: 'Max Trades Simultâneos', severity: 'soft', defaultValue: 0, unit: 'days', editable: true, enabled: false },
      { type: 'INACTIVITY_LIMIT', name: 'Limite de Inatividade', severity: 'soft', defaultValue: 0, unit: 'days', editable: true, enabled: false },
      { type: 'PROFIT_CAP_PAYOUT', name: 'Teto de Payout', severity: 'soft', defaultValue: 0, unit: '%', editable: true, enabled: false },
    ],
  },
];
