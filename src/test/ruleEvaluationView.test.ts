import { describe, expect, it } from 'vitest';
import type { RuleEvaluationRow } from '@/hooks/useRuleEvaluations';
import type { TradingAccount } from '@/types/fortify';
import {
  getAccountEvaluationSummary,
  isRecognizedRuleType,
  mapRuleEvaluationRow,
  mapRowsForAccount,
} from '@/lib/ruleEvaluationView';

function evaluationRow(overrides: Partial<RuleEvaluationRow> & { ruleKey?: string | null } = {}): RuleEvaluationRow {
  const { ruleKey, ...rest } = overrides;
  return {
    id: 'eval-1',
    trading_account_id: 'account-1',
    rule_instance_id: 'rule-1',
    connection_id: 'connection-1',
    status: 'APPROVING',
    current_value: 400,
    limit_value: 500,
    progress_pct: 80,
    message: null,
    computation_window: 'daily',
    reference_date: '2026-08-20',
    computed_at: '2026-08-20T12:00:00.000Z',
    rule_instances:
      ruleKey === null
        ? null
        : {
            rule_set_version_id: 'version-1',
            severity: 'hard',
            enabled: true,
            params: {},
            rule_definitions: { key: ruleKey ?? 'max_daily_loss', name: 'Regra' },
          },
    ...rest,
  } as RuleEvaluationRow;
}

const account = {
  id: 'account-1',
  startBalance: 100_000,
  currentBalance: 100_000,
  currentEquity: 100_000,
} as TradingAccount;

describe('mapRuleEvaluationRow', () => {
  it('maps a known rule key to its real rule type', () => {
    const mapped = mapRuleEvaluationRow(evaluationRow({ ruleKey: 'trailing_drawdown' }));

    expect(mapped.rule.type).toBe('TRAILING_MAX_LOSS');
    expect(mapped.ruleKey).toBe('trailing_drawdown');
    expect(isRecognizedRuleType(mapped.rule.type)).toBe(true);
  });

  it('marks an unrecognized rule key as UNKNOWN instead of silently calling it a daily-loss rule', () => {
    const mapped = mapRuleEvaluationRow(evaluationRow({ ruleKey: 'some_future_binding_rule' }));

    expect(mapped.rule.type).toBe('UNKNOWN');
    expect(mapped.rule.type).not.toBe('MAX_DAILY_LOSS');
    expect(isRecognizedRuleType(mapped.rule.type)).toBe(false);
    // The raw key is preserved so the UI can name what it could not classify.
    expect(mapped.ruleKey).toBe('some_future_binding_rule');
  });

  it('marks a row with no rule_instances join as UNKNOWN', () => {
    // This is exactly the shape a binding-derived row has: no rule_instances
    // record to key off, which used to resolve to MAX_DAILY_LOSS.
    const mapped = mapRuleEvaluationRow(evaluationRow({ ruleKey: null }));

    expect(mapped.rule.type).toBe('UNKNOWN');
    expect(mapped.ruleKey).toBe('');
  });

  it('keeps the row itself — an unknown type must not hide the evaluation', () => {
    const rows = [evaluationRow({ ruleKey: 'unmapped_key', status: 'VIOLATED' })];

    expect(mapRowsForAccount(rows, 'account-1')).toHaveLength(1);
  });
});

describe('getAccountEvaluationSummary', () => {
  it('does not attribute an unknown rule\'s numbers to daily loss or drawdown', () => {
    const summary = getAccountEvaluationSummary(account, [
      evaluationRow({ ruleKey: 'unmapped_key', current_value: 9_000, limit_value: 10_000 }),
    ]);

    // Previously this row became a MAX_DAILY_LOSS eval and produced a confident
    // "R$ 1.000 restantes" for a rule Fortify never actually identified.
    expect(summary.dailyLoss).toBeUndefined();
    expect(summary.totalLoss).toBeUndefined();
    expect(summary.profitTarget).toBeUndefined();
    expect(summary.dailyRemaining).toBe(0);
    expect(summary.maxLossRemaining).toBe(0);
    // ...and it does not distort the risk aggregate either.
    expect(summary.closestRule).toBeNull();
    expect(summary.avgRisk).toBe(0);
    expect(summary.healthScore).toBe(100);
    // But it is reported, not silently dropped.
    expect(summary.unrecognizedEvals).toHaveLength(1);
  });

  it('still lets an unknown rule raise the account status when it is violated', () => {
    const summary = getAccountEvaluationSummary(account, [
      evaluationRow({ ruleKey: 'unmapped_key', status: 'VIOLATED' }),
    ]);

    expect(summary.status).toBe('VIOLATED');
  });

  it('still resolves recognized rules normally', () => {
    const summary = getAccountEvaluationSummary(account, [
      evaluationRow({ id: 'eval-1', rule_instance_id: 'rule-1', ruleKey: 'max_daily_loss', current_value: 400, limit_value: 500 }),
      evaluationRow({ id: 'eval-2', rule_instance_id: 'rule-2', ruleKey: 'max_total_loss', current_value: 2_000, limit_value: 10_000, progress_pct: 20 }),
    ]);

    expect(summary.dailyLoss?.rule.type).toBe('MAX_DAILY_LOSS');
    expect(summary.dailyRemaining).toBe(100);
    expect(summary.totalLoss?.rule.type).toBe('MAX_TOTAL_LOSS');
    expect(summary.maxLossRemaining).toBe(8_000);
    expect(summary.unrecognizedEvals).toHaveLength(0);
  });
});
