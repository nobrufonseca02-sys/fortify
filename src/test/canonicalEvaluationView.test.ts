import { describe, expect, it } from 'vitest';
import {
  currentCanonicalEvaluation,
  summarizeCanonicalEvaluation,
  type CanonicalRuleEvaluationRow,
} from '@/lib/canonicalEvaluationView';

const row = (overrides: Partial<CanonicalRuleEvaluationRow> = {}): CanonicalRuleEvaluationRow => ({
  id: 'e1',
  user_id: 'u1',
  trading_account_id: 'a1',
  mt5_connection_id: null,
  binding_id: 'b1',
  rule_snapshot_hash: 'sha256:1',
  rule_version_id: 'v1',
  engine_version: 'fortify.rule-engine.v1',
  overall_status: 'partial',
  overall_message: '',
  automatic_rules: [
    { key: 'daily_loss', label: 'Perda diária', status: 'partial', monitorability: 'automatic_mt5', sourceRule: '5%', currentValue: 1000, limitValue: 5000, remainingValue: 4000, percentage: 20, currency: 'USD', message: '' },
    { key: 'max_drawdown', label: 'Drawdown máximo', status: 'warning', monitorability: 'automatic_mt5', sourceRule: '10%', currentValue: 7500, limitValue: 10000, remainingValue: 2500, percentage: 75, currency: 'USD', message: '' },
  ],
  manual_rules: [],
  unsupported_rules: [],
  not_calculated_rules: [],
  alerts: [],
  input_summary: {},
  evaluated_at: '2026-09-30T12:00:00Z',
  ...overrides,
});

describe('canonicalEvaluationView', () => {
  it('só aceita a avaliação feita com o binding ativo', () => {
    expect(currentCanonicalEvaluation(row(), 'b1')).not.toBeNull();
    expect(currentCanonicalEvaluation(row(), 'b2')).toBeNull();
    expect(currentCanonicalEvaluation(row(), null)).toBeNull();
    expect(currentCanonicalEvaluation(null, 'b1')).toBeNull();
  });

  it('resume limites e o maior consumo de perda', () => {
    const summary = summarizeCanonicalEvaluation(row());
    expect(summary.dailyLoss?.remainingValue).toBe(4000);
    expect(summary.maxDrawdown?.limitValue).toBe(10000);
    expect(summary.profitTarget).toBeNull();
    expect(summary.worstLossPercentage).toBe(75);
  });

  it('sem regras calculadas não inventa consumo', () => {
    expect(summarizeCanonicalEvaluation(row({ automatic_rules: [] })).worstLossPercentage).toBeNull();
  });
});
