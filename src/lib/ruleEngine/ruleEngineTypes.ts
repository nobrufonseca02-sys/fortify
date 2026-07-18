import type { AccountRuleBindingRow } from '@/lib/ruleBinding';

export type RuleEvaluationStatus =
  | 'safe'
  | 'warning'
  | 'critical'
  | 'breached'
  | 'not_monitorable'
  | 'pending_binding';

export type BoundRuleKey = 'daily_loss' | 'max_drawdown' | 'profit_target';

export type RuleMonitorability =
  | 'automatic_mt5'
  | 'manual_check'
  | 'not_supported_yet';

export interface BoundRuleEvaluation {
  key: BoundRuleKey;
  label: string;
  status: RuleEvaluationStatus;
  monitorability: RuleMonitorability;
  sourceRule: string;
  currentValue: number | null;
  limitValue: number | null;
  remainingValue: number | null;
  percentage: number | null;
  currency: string;
  message: string;
  detail?: string;
  phaseLabel?: string;
}

export interface BoundRuleListItem {
  label: string;
  status: 'manual_check' | 'not_supported_yet';
  message: string;
}

export interface RuleEngineAccountInput {
  startBalance?: number | null;
  currentBalance?: number | null;
  currentEquity?: number | null;
  highestEquity?: number | null;
  dailyLossUsed?: number | null;
  dailyLossResetDate?: string | null;
  phase?: string | null;
}

export interface RuleEngineSnapshotInput {
  balance?: number | null;
  equity?: number | null;
  dailyPnl?: number | null;
  floatingPnl?: number | null;
  maxBalance?: number | null;
  date?: string | null;
  createdAt?: string | null;
}

export interface RuleEngineTradeInput {
  profit?: number | null;
  commission?: number | null;
  swap?: number | null;
  closeTime?: string | null;
}

export interface RuleEnginePositionInput {
  floatingPnl?: number | null;
}

export interface EvaluateBoundAccountRulesInput {
  binding?: AccountRuleBindingRow | null;
  account?: RuleEngineAccountInput | null;
  snapshots?: RuleEngineSnapshotInput[] | null;
  trades?: RuleEngineTradeInput[] | null;
  positions?: RuleEnginePositionInput[] | null;
  now?: Date | string;
}

export interface BoundAccountRuleEvaluation {
  overallStatus: RuleEvaluationStatus;
  overallMessage: string;
  missingBinding: boolean;
  automaticRules: BoundRuleEvaluation[];
  manualRules: BoundRuleListItem[];
  unsupportedRules: BoundRuleListItem[];
  alerts: string[];
  source: {
    bindingId: string | null;
    snapshotHash: string | null;
    ruleVersionId: string | null;
    officialSourceUrls: string[];
  };
}

const unknownRuleMarkers = [
  'unavailable',
  'unknown',
  'partial',
  'nao informado',
  'não informado',
  'nao aplicavel',
  'não aplicável',
  'indisponivel',
  'indisponível',
  'verificar no site oficial',
  'confirmar no',
  'a confirmar',
  'dados pendentes',
  'sem catalogo',
  'sem catálogo',
];

export function normalizeRuleText(value: string | null | undefined) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isExplicitRuleValue(value: string | null | undefined) {
  const normalized = normalizeRuleText(value);
  if (!normalized) return false;
  return !unknownRuleMarkers.some((marker) =>
    normalized.includes(normalizeRuleText(marker)),
  );
}

export function finiteNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseLocalizedNumber(value: string) {
  const compact = value.replace(/\s/g, '');
  const hasComma = compact.includes(',');
  const hasDot = compact.includes('.');
  let normalized = compact;

  if (hasComma && hasDot) {
    const decimalSeparator =
      compact.lastIndexOf(',') > compact.lastIndexOf('.') ? ',' : '.';
    const thousandsSeparator = decimalSeparator === ',' ? '.' : ',';
    normalized = compact
      .replace(new RegExp(`\\${thousandsSeparator}`, 'g'), '')
      .replace(decimalSeparator, '.');
  } else if (hasComma) {
    const parts = compact.split(',');
    normalized =
      parts.length > 2 || parts.at(-1)?.length === 3
        ? parts.join('')
        : compact.replace(',', '.');
  } else if (hasDot) {
    const parts = compact.split('.');
    normalized =
      parts.length > 2 || parts.at(-1)?.length === 3 ? parts.join('') : compact;
  }

  return finiteNumber(normalized);
}

export function parseInitialBalance(value: string | null | undefined) {
  if (!isExplicitRuleValue(value)) return null;
  const match = String(value).match(/([\d.,]+)\s*([kKmM])?/);
  if (!match) return null;
  const parsed = parseLocalizedNumber(match[1]);
  if (parsed === null) return null;
  const multiplier =
    match[2]?.toLocaleLowerCase('pt-BR') === 'k'
      ? 1_000
      : match[2]?.toLocaleLowerCase('pt-BR') === 'm'
        ? 1_000_000
        : 1;
  return parsed * multiplier;
}

export interface ParsedRuleLimit {
  amount: number;
  kind: 'percent' | 'fixed';
  sourceValue: number;
}

export function parseRuleLimit(
  value: string | null | undefined,
  baseAmount: number | null,
): ParsedRuleLimit | null {
  if (!isExplicitRuleValue(value)) return null;
  const text = String(value);
  const percentMatch = text.match(/(\d+(?:[.,]\d+)?)\s*%/);
  if (percentMatch) {
    const percentage = parseLocalizedNumber(percentMatch[1]);
    if (percentage === null || percentage <= 0 || !baseAmount || baseAmount <= 0) {
      return null;
    }
    return {
      amount: (baseAmount * percentage) / 100,
      kind: 'percent',
      sourceValue: percentage,
    };
  }

  const fixedMatch = text.match(
    /(?:US\$|USD|R\$|BRL|EUR|€|\$)\s*([\d.,]+)/i,
  );
  if (!fixedMatch) return null;
  const amount = parseLocalizedNumber(fixedMatch[1]);
  if (amount === null || amount <= 0) return null;
  return { amount, kind: 'fixed', sourceValue: amount };
}

export function classifyLimitConsumption(
  currentValue: number,
  limitValue: number,
): Exclude<RuleEvaluationStatus, 'not_monitorable' | 'pending_binding'> {
  const consumption = limitValue > 0 ? currentValue / limitValue : 1;
  if (consumption >= 1) return 'breached';
  if (consumption >= 0.85) return 'critical';
  if (consumption >= 0.7) return 'warning';
  return 'safe';
}

export function notMonitorableRule(
  key: BoundRuleKey,
  label: string,
  sourceRule: string,
  currency: string,
  message: string,
  monitorability: RuleMonitorability = 'automatic_mt5',
): BoundRuleEvaluation {
  return {
    key,
    label,
    status: 'not_monitorable',
    monitorability,
    sourceRule,
    currentValue: null,
    limitValue: null,
    remainingValue: null,
    percentage: null,
    currency,
    message,
  };
}
