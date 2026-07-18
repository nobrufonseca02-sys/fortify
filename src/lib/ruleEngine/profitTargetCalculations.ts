import {
  finiteNumber,
  normalizeRuleText,
  notMonitorableRule,
  parseRuleLimit,
  type BoundRuleEvaluation,
} from './ruleEngineTypes';
import type { RuleBindingSnapshot } from '@/lib/ruleBinding';

interface ProfitTargetCalculationInput {
  phases: RuleBindingSnapshot['criticalRules']['phases'];
  currentPhase?: string | null;
  initialBalance: number | null;
  currentBalance: number | null;
  currency: string;
}

function phaseNumber(value: string) {
  return normalizeRuleText(value).match(/\d+/)?.[0] ?? null;
}

function resolvePhase(input: ProfitTargetCalculationInput) {
  if (input.phases.length === 1) return input.phases[0];
  if (!input.currentPhase) return null;

  const normalizedCurrent = normalizeRuleText(input.currentPhase);
  return (
    input.phases.find(
      (phase) =>
        normalizeRuleText(phase.id) === normalizedCurrent ||
        normalizeRuleText(phase.label) === normalizedCurrent,
    ) ??
    input.phases.find(
      (phase) =>
        phaseNumber(phase.id) !== null &&
        phaseNumber(phase.id) === phaseNumber(input.currentPhase ?? ''),
    ) ??
    null
  );
}

export function evaluateProfitTarget(
  input: ProfitTargetCalculationInput,
): BoundRuleEvaluation {
  const sourceRule = input.phases.map((phase) => phase.profitTarget).join(' / ');
  const phase = resolvePhase(input);
  if (!phase) {
    return notMonitorableRule(
      'profit_target',
      'Meta de lucro',
      sourceRule,
      input.currency,
      'Fase da conta não informada.',
    );
  }

  const limit = parseRuleLimit(phase.profitTarget, input.initialBalance);
  if (!limit) {
    return notMonitorableRule(
      'profit_target',
      'Meta de lucro',
      phase.profitTarget,
      input.currency,
      'O snapshot não informa uma meta de lucro numérica confiável para a fase.',
    );
  }

  const currentBalance = finiteNumber(input.currentBalance);
  if (currentBalance === null || input.initialBalance === null) {
    return notMonitorableRule(
      'profit_target',
      'Meta de lucro',
      phase.profitTarget,
      input.currency,
      'Saldo inicial ou saldo atual não está disponível.',
    );
  }

  const currentValue = Math.max(0, currentBalance - input.initialBalance);
  const percentage = (currentValue / limit.amount) * 100;
  const attained = currentValue >= limit.amount;
  return {
    key: 'profit_target',
    label: 'Meta de lucro',
    status: 'safe',
    monitorability: 'automatic_mt5',
    sourceRule: phase.profitTarget,
    currentValue,
    limitValue: limit.amount,
    remainingValue: Math.max(0, limit.amount - currentValue),
    percentage,
    currency: input.currency,
    phaseLabel: phase.label,
    message: attained
      ? 'Meta de lucro atingida para a fase informada.'
      : `${Math.max(0, percentage).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% da meta da fase concluída.`,
  };
}
