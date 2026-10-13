import { describe, expect, it } from 'vitest';
import {
  summarizeCanonicalEvaluation,
  type CanonicalRuleEvaluationRow,
} from '../lib/canonicalEvaluationView';
import type { BoundRuleEvaluation, RuleEvaluationStatus } from '../lib/ruleEngine/ruleEngineTypes';

function rule(overrides: Partial<BoundRuleEvaluation> & Pick<BoundRuleEvaluation, 'key'>): BoundRuleEvaluation {
  return {
    label: overrides.key,
    status: 'safe',
    monitorability: 'automatic_mt5',
    sourceRule: '',
    currentValue: null,
    limitValue: null,
    remainingValue: null,
    percentage: null,
    currency: 'USD',
    message: '',
    ...overrides,
  };
}

function row(overallStatus: RuleEvaluationStatus, automaticRules: BoundRuleEvaluation[]): CanonicalRuleEvaluationRow {
  return {
    id: 'row-1',
    user_id: 'user-1',
    trading_account_id: 'account-1',
    mt5_connection_id: 'connection-1',
    binding_id: 'binding-1',
    rule_snapshot_hash: 'sha256:abc',
    rule_version_id: 'rules-v1',
    engine_version: 'v1',
    overall_status: overallStatus,
    overall_message: '',
    automatic_rules: automaticRules,
    manual_rules: [],
    unsupported_rules: [],
    not_calculated_rules: [],
    alerts: [],
    input_summary: {},
    evaluated_at: '2026-07-18T15:00:00.000Z',
  };
}

const metProfitTarget = rule({
  key: 'profit_target',
  status: 'safe',
  currentValue: 10_000,
  limitValue: 10_000,
});
const unmetProfitTarget = rule({
  key: 'profit_target',
  status: 'safe',
  currentValue: 4_000,
  limitValue: 10_000,
});
const metMinDays = rule({
  key: 'min_trading_days',
  status: 'safe',
  currentValue: 4,
  limitValue: 4,
});
const unmetMinDays = rule({
  key: 'min_trading_days',
  status: 'safe',
  currentValue: 1,
  limitValue: 4,
});
const notMonitorableMinDays = rule({ key: 'min_trading_days', status: 'not_monitorable' });
const notMonitorableConsistency = rule({ key: 'consistency', status: 'not_monitorable' });
const breachedConsistency = rule({ key: 'consistency', status: 'breached' });
const safeDaily = rule({ key: 'daily_loss', status: 'safe' });
const breachedDaily = rule({ key: 'daily_loss', status: 'breached' });
const safeDrawdown = rule({ key: 'max_drawdown', status: 'safe' });

describe('payout eligibility composite', () => {
  it('is eligible when profit target and min trading days are met and nothing is breached', () => {
    const summary = summarizeCanonicalEvaluation(
      row('safe', [safeDaily, safeDrawdown, metProfitTarget, notMonitorableConsistency, metMinDays]),
    );
    expect(summary.payoutEligibility.status).toBe('eligible');
    expect(summary.payoutEligibility.blockingRule).toBeNull();
    // Consistência not_monitorable é o caso comum e não bloqueia — vira aviso.
    expect(summary.payoutEligibility.caveats.length).toBeGreaterThan(0);
  });

  it('is not eligible when the account has an active breach', () => {
    const summary = summarizeCanonicalEvaluation(
      row('breached', [breachedDaily, safeDrawdown, metProfitTarget, notMonitorableConsistency, metMinDays]),
    );
    expect(summary.payoutEligibility.status).toBe('not_eligible');
    expect(summary.payoutEligibility.blockingRule).toBe('daily_loss');
  });

  it('is not eligible when consistency itself is breached, even if nothing else is', () => {
    const summary = summarizeCanonicalEvaluation(
      row('safe', [safeDaily, safeDrawdown, metProfitTarget, breachedConsistency, metMinDays]),
    );
    expect(summary.payoutEligibility.status).toBe('not_eligible');
    expect(summary.payoutEligibility.blockingRule).toBe('consistency');
  });

  it('is not determinable when min trading days cannot be computed — never assumes it was met', () => {
    const summary = summarizeCanonicalEvaluation(
      row('safe', [safeDaily, safeDrawdown, metProfitTarget, notMonitorableConsistency, notMonitorableMinDays]),
    );
    expect(summary.payoutEligibility.status).toBe('not_determinable');
    expect(summary.payoutEligibility.blockingRule).toBe('min_trading_days');
  });

  it('is not eligible when min trading days is computable but not yet reached', () => {
    const summary = summarizeCanonicalEvaluation(
      row('safe', [safeDaily, safeDrawdown, metProfitTarget, notMonitorableConsistency, unmetMinDays]),
    );
    expect(summary.payoutEligibility.status).toBe('not_eligible');
    expect(summary.payoutEligibility.blockingRule).toBe('min_trading_days');
  });

  it('is not eligible when profit target has not been reached yet', () => {
    const summary = summarizeCanonicalEvaluation(
      row('safe', [safeDaily, safeDrawdown, unmetProfitTarget, notMonitorableConsistency, metMinDays]),
    );
    expect(summary.payoutEligibility.status).toBe('not_eligible');
    expect(summary.payoutEligibility.blockingRule).toBe('profit_target');
  });

  it('is not determinable when the account has no active binding at all', () => {
    const summary = summarizeCanonicalEvaluation(row('pending_binding', []));
    expect(summary.payoutEligibility.status).toBe('not_determinable');
    expect(summary.payoutEligibility.blockingRule).toBe('overall');
  });
});
