import { evaluateDailyLoss } from './dailyLossCalculations';
import { evaluateMaxDrawdown } from './drawdownCalculations';
import { evaluateProfitTarget } from './profitTargetCalculations';
import {
  finiteNumber,
  normalizeRuleText,
  notMonitorableRule,
  parseInitialBalance,
  type BoundAccountRuleEvaluation,
  type BoundRuleEvaluation,
  type BoundRuleKey,
  type EvaluateBoundAccountRulesInput,
  type RuleEvaluationStatus,
  type RuleMonitorability,
} from './ruleEngineTypes';

const emptySource = {
  bindingId: null,
  snapshotHash: null,
  ruleVersionId: null,
  officialSourceUrls: [] as string[],
};

const ruleLabels: Record<BoundRuleKey, string> = {
  daily_loss: 'Perda diária',
  max_drawdown: 'Drawdown máximo',
  profit_target: 'Meta de lucro',
};

const statusSeverity: Record<RuleEvaluationStatus, number> = {
  safe: 0,
  not_monitorable: 1,
  warning: 2,
  critical: 3,
  breached: 4,
  pending_binding: 5,
};

function containsAny(value: string, aliases: string[]) {
  const normalized = normalizeRuleText(value);
  return aliases.some((alias) => normalized.includes(normalizeRuleText(alias)));
}

function monitorabilityForRule(
  key: BoundRuleKey,
  automatic: string[],
  manual: string[],
  unsupported: string[],
): RuleMonitorability {
  const aliases: Record<BoundRuleKey, string[]> = {
    daily_loss: ['daily', 'diaria', 'dd diario', 'perda diaria'],
    max_drawdown: [
      'maximum loss',
      'max loss',
      'max drawdown',
      'perda maxima',
      'perda total',
      'maximum total loss',
      'eod movel',
    ],
    profit_target: ['meta', 'profit target', 'meta de lucro'],
  };
  const matches = (item: string) => {
    if (key === 'max_drawdown' && containsAny(item, ['daily', 'diaria', 'dd diario'])) {
      return containsAny(item, aliases[key].filter((alias) => !alias.includes('daily')));
    }
    return containsAny(item, aliases[key]);
  };

  if (automatic.some(matches)) return 'automatic_mt5';
  if (manual.some(matches)) return 'manual_check';
  if (unsupported.some(matches)) return 'not_supported_yet';
  return 'not_supported_yet';
}

function blockedRule(
  key: BoundRuleKey,
  sourceRule: string,
  currency: string,
  monitorability: RuleMonitorability,
  reason?: string,
) {
  const message =
    reason ??
    (monitorability === 'manual_check'
      ? 'Validação manual exigida pelo snapshot desta conta.'
      : 'Esta regra ainda não é suportada automaticamente.');
  return notMonitorableRule(
    key,
    ruleLabels[key],
    sourceRule,
    currency,
    message,
    monitorability,
  );
}

function worstStatus(evaluations: BoundRuleEvaluation[]) {
  return evaluations.reduce<RuleEvaluationStatus>(
    (worst, evaluation) =>
      statusSeverity[evaluation.status] > statusSeverity[worst]
        ? evaluation.status
        : worst,
    'safe',
  );
}

function overallMessage(status: RuleEvaluationStatus) {
  if (status === 'breached') return 'Há pelo menos um limite operacional violado.';
  if (status === 'critical') return 'Há uma regra crítica próxima do limite.';
  if (status === 'warning') return 'Há uma regra em zona de atenção.';
  if (status === 'not_monitorable') {
    return 'Parte das regras críticas ainda não pode ser monitorada com segurança.';
  }
  return 'As regras automáticas disponíveis estão dentro dos limites monitorados.';
}

export function evaluateBoundAccountRules(
  input: EvaluateBoundAccountRulesInput,
): BoundAccountRuleEvaluation {
  const binding = input.binding;
  if (!binding || binding.binding_status !== 'active') {
    return {
      overallStatus: 'pending_binding',
      overallMessage: 'Regra pendente de vínculo.',
      missingBinding: true,
      automaticRules: [],
      manualRules: [],
      unsupportedRules: [],
      alerts: ['Vincule uma versão oficial de regras antes de ativar cálculos automáticos.'],
      source: emptySource,
    };
  }

  const snapshot = binding.rule_snapshot;
  const account = input.account ?? {};
  const snapshots = input.snapshots ?? [];
  const trades = input.trades ?? [];
  const positions = input.positions ?? [];
  const now = input.now instanceof Date ? input.now : new Date(input.now ?? Date.now());
  const currency = snapshot.accountSize.currency || 'USD';
  const initialBalance =
    parseInitialBalance(snapshot.accountSize.initialBalance) ??
    finiteNumber(account.startBalance);
  const currentBalance =
    finiteNumber(snapshots[0]?.balance) ?? finiteNumber(account.currentBalance);
  const currentEquity =
    finiteNumber(snapshots[0]?.equity) ?? finiteNumber(account.currentEquity);
  const isMt5 =
    normalizeRuleText(snapshot.platform).includes('mt5') &&
    normalizeRuleText(snapshot.program.market) !== 'futures';
  const isBlackArrow =
    normalizeRuleText(snapshot.platform).includes('blackarrow') ||
    normalizeRuleText(snapshot.platform).includes('black arrow');
  const globallyUnsupported = !isMt5 || isBlackArrow || !binding.automatic_monitoring_enabled;

  const automatic = snapshot.monitorability.automaticMt5;
  const manual = snapshot.monitorability.manualCheck;
  const unsupported = snapshot.monitorability.notSupportedYet;
  const dailyMonitorability = monitorabilityForRule(
    'daily_loss',
    automatic,
    manual,
    unsupported,
  );
  const drawdownMonitorability = monitorabilityForRule(
    'max_drawdown',
    automatic,
    manual,
    unsupported,
  );
  const targetMonitorability = monitorabilityForRule(
    'profit_target',
    automatic,
    manual,
    unsupported,
  );
  const unsupportedReason = globallyUnsupported
    ? 'Futures, BlackArrow ou plataforma sem conector MT5 não recebem cálculo automático.'
    : undefined;

  const daily =
    globallyUnsupported || dailyMonitorability !== 'automatic_mt5'
      ? blockedRule(
          'daily_loss',
          snapshot.criticalRules.dailyLoss,
          currency,
          globallyUnsupported ? 'not_supported_yet' : dailyMonitorability,
          unsupportedReason,
        )
      : evaluateDailyLoss({
          ruleText: snapshot.criticalRules.dailyLoss,
          initialBalance,
          currency,
          dailyLossUsed: account.dailyLossUsed,
          dailyLossResetDate: account.dailyLossResetDate,
          snapshots,
          trades,
          positions,
          context: input.dailyRuleContext,
          now,
        });

  const drawdown =
    globallyUnsupported || drawdownMonitorability !== 'automatic_mt5'
      ? blockedRule(
          'max_drawdown',
          snapshot.criticalRules.maxLoss,
          currency,
          globallyUnsupported ? 'not_supported_yet' : drawdownMonitorability,
          unsupportedReason,
        )
      : evaluateMaxDrawdown({
          ruleText: snapshot.criticalRules.maxLoss,
          drawdownType: snapshot.criticalRules.drawdownType,
          drawdownCalculation: snapshot.criticalRules.drawdownCalculation,
          initialBalance,
          currentBalance,
          currentEquity,
          highestEquity: finiteNumber(account.highestEquity),
          snapshots,
          currency,
        });

  const target =
    globallyUnsupported || targetMonitorability !== 'automatic_mt5'
      ? blockedRule(
          'profit_target',
          snapshot.criticalRules.phases.map((phase) => phase.profitTarget).join(' / '),
          currency,
          globallyUnsupported ? 'not_supported_yet' : targetMonitorability,
          unsupportedReason,
        )
      : evaluateProfitTarget({
          phases: snapshot.criticalRules.phases,
          currentPhase: account.phase,
          initialBalance,
          currentBalance,
          currency,
        });

  const automaticRules = [daily, drawdown, target];
  const overallStatus = worstStatus(automaticRules);
  const alerts = automaticRules
    .filter((evaluation) =>
      ['warning', 'critical', 'breached', 'not_monitorable'].includes(
        evaluation.status,
      ),
    )
    .map((evaluation) => `${evaluation.label}: ${evaluation.message}`);

  return {
    overallStatus,
    overallMessage: overallMessage(overallStatus),
    missingBinding: false,
    automaticRules,
    manualRules: manual.map((label) => ({
      label,
      status: 'manual_check',
      message: 'Validação manual',
    })),
    unsupportedRules: unsupported.map((label) => ({
      label,
      status: 'not_supported_yet',
      message: 'Ainda não suportado',
    })),
    alerts,
    source: {
      bindingId: binding.id,
      snapshotHash: binding.rule_snapshot_hash,
      ruleVersionId: binding.rule_version_id,
      officialSourceUrls: [...snapshot.evidence.officialSourceUrls],
    },
  };
}
