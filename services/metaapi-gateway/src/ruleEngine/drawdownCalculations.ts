import {
  classifyLimitConsumption,
  finiteNumber,
  normalizeRuleText,
  notMonitorableRule,
  parseRuleLimit,
  type BoundRuleEvaluation,
  type RuleEngineSnapshotInput,
} from './ruleEngineTypes';

interface DrawdownCalculationInput {
  ruleText: string;
  drawdownType: string;
  drawdownCalculation: string;
  initialBalance: number | null;
  currentBalance: number | null;
  currentEquity: number | null;
  highestEquity: number | null;
  snapshots: RuleEngineSnapshotInput[];
  currency: string;
}

function highestSnapshotReference(
  snapshots: RuleEngineSnapshotInput[],
  useEquity: boolean,
) {
  const candidates = snapshots.flatMap((snapshot) => {
    const primary = finiteNumber(useEquity ? snapshot.equity : snapshot.balance);
    const recordedMaximum = finiteNumber(snapshot.maxBalance);
    return [primary, recordedMaximum].filter(
      (value): value is number => value !== null && value > 0,
    );
  });
  return candidates.length > 0 ? Math.max(...candidates) : null;
}

export function evaluateMaxDrawdown(
  input: DrawdownCalculationInput,
): BoundRuleEvaluation {
  const limit = parseRuleLimit(input.ruleText, input.initialBalance);
  if (!limit) {
    return notMonitorableRule(
      'max_drawdown',
      'Drawdown máximo',
      input.ruleText,
      input.currency,
      'O snapshot não informa um limite máximo numérico confiável.',
    );
  }

  const type = normalizeRuleText(input.drawdownType);
  const calculation = normalizeRuleText(input.drawdownCalculation);
  const currentMetricCandidates = [
    finiteNumber(input.currentBalance),
    finiteNumber(input.currentEquity),
  ].filter((value): value is number => value !== null);
  if (currentMetricCandidates.length === 0) {
    return notMonitorableRule(
      'max_drawdown',
      'Drawdown máximo',
      input.ruleText,
      input.currency,
      'Saldo e equity atuais não estão disponíveis.',
    );
  }

  const currentMetric = Math.min(...currentMetricCandidates);
  let reference: number | null = null;
  let detail = '';

  if (type === 'static' || type === 'estatico') {
    if (calculation.includes('payout')) {
      return notMonitorableRule(
        'max_drawdown',
        'Drawdown máximo',
        input.ruleText,
        input.currency,
        'A base do drawdown muda após payout, mas o estado do payout não está disponível.',
      );
    }
    reference = input.initialBalance;
    detail = 'Referência estática no saldo inicial; usa o menor valor entre saldo e equity atuais.';
  } else if (type === 'eod') {
    reference = highestSnapshotReference(input.snapshots, false);
    detail = 'Referência EOD obtida do maior saldo registrado nos snapshots disponíveis.';
  } else if (
    type === 'trailing' ||
    type === 'intraday' ||
    calculation.includes('high-water') ||
    calculation.includes('high water')
  ) {
    const useEquity =
      type === 'intraday' ||
      calculation.includes('equity') ||
      calculation.includes('intraday');
    reference = useEquity
      ? finiteNumber(input.highestEquity) ??
        highestSnapshotReference(input.snapshots, true)
      : highestSnapshotReference(input.snapshots, false);
    detail = useEquity
      ? 'Referência trailing/intraday obtida do maior equity sincronizado.'
      : 'Referência trailing obtida do maior saldo sincronizado.';
  } else {
    return notMonitorableRule(
      'max_drawdown',
      'Drawdown máximo',
      input.ruleText,
      input.currency,
      'O tipo ou a base de cálculo do drawdown está ambíguo no snapshot.',
    );
  }

  if (reference === null || reference <= 0) {
    return notMonitorableRule(
      'max_drawdown',
      'Drawdown máximo',
      input.ruleText,
      input.currency,
      'Falta histórico confiável para formar a referência do drawdown.',
    );
  }

  if (
    input.initialBalance !== null &&
    calculation.includes('trava') &&
    calculation.includes('saldo inicial')
  ) {
    reference = Math.min(reference, input.initialBalance + limit.amount);
    detail += ' A trava explícita no saldo inicial foi aplicada.';
  }

  const currentValue = Math.max(0, reference - currentMetric);
  const consumption = classifyLimitConsumption(currentValue, limit.amount);
  // Em trailing/EOD/intraday o pico só é observado nos momentos de sincronização:
  // um pico entre dois syncs subestima o consumo. Alertas continuam valendo, mas
  // "seguro" só é concluído para a referência estática.
  const referenceIsSampled = !(type === 'static' || type === 'estatico');
  const status = consumption === 'safe' && referenceIsSampled ? 'partial' : consumption;
  if (referenceIsSampled) {
    detail += ' Pico medido apenas nos momentos de sincronização.';
  }
  const percentage = (currentValue / limit.amount) * 100;
  return {
    key: 'max_drawdown',
    label: 'Drawdown máximo',
    status,
    monitorability: 'automatic_mt5',
    sourceRule: input.ruleText,
    currentValue,
    limitValue: limit.amount,
    remainingValue: Math.max(0, limit.amount - currentValue),
    percentage,
    currency: input.currency,
    message:
      status === 'breached'
        ? 'O limite máximo de perda foi atingido ou ultrapassado.'
        : status === 'partial'
          ? `Verificação parcial: ${percentage.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% do limite máximo consumido. Não confirma conta segura.`
          : `${percentage.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% do limite máximo consumido.`,
    detail,
  };
}
