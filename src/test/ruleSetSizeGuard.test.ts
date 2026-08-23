import { describe, expect, it } from 'vitest';
import {
  isRuleSetSizeCompatible,
  resolveAccountSizeForRuleSet,
  RULE_SET_SIZE_TOLERANCE_USD,
} from '../lib/ruleSetSizeGuard';

describe('isRuleSetSizeCompatible', () => {
  it('rejects the seeded $10k generic template on a $200k account', () => {
    // The exact production bug: max_daily_loss = $500 (mode value, hard) applied
    // verbatim to a $200k account fails it after a $501 down day.
    expect(isRuleSetSizeCompatible(10000, 200000)).toBe(false);
  });

  it('accepts an exact size match', () => {
    expect(isRuleSetSizeCompatible(10000, 10000)).toBe(true);
    expect(isRuleSetSizeCompatible(200000, 200000)).toBe(true);
  });

  it('keeps the tolerance band the suggestions list already used', () => {
    expect(RULE_SET_SIZE_TOLERANCE_USD).toBe(1000);
    expect(isRuleSetSizeCompatible(10000, 10000 + RULE_SET_SIZE_TOLERANCE_USD)).toBe(true);
    expect(isRuleSetSizeCompatible(10000, 10000 - RULE_SET_SIZE_TOLERANCE_USD)).toBe(true);
    expect(isRuleSetSizeCompatible(10000, 10000 + RULE_SET_SIZE_TOLERANCE_USD + 1)).toBe(false);
    expect(isRuleSetSizeCompatible(10000, 10000 - RULE_SET_SIZE_TOLERANCE_USD - 1)).toBe(false);
  });

  it('does not block when either side declares no size', () => {
    // Every seeded prop-firm version has a null account_size — those flows must
    // keep working exactly as before.
    expect(isRuleSetSizeCompatible(null, 200000)).toBe(true);
    expect(isRuleSetSizeCompatible(undefined, 200000)).toBe(true);
    expect(isRuleSetSizeCompatible(0, 200000)).toBe(true);
    expect(isRuleSetSizeCompatible(10000, null)).toBe(true);
    expect(isRuleSetSizeCompatible(10000, 0)).toBe(true);
  });

  it('treats unparseable sizes as unknown rather than as a mismatch', () => {
    expect(isRuleSetSizeCompatible('nao-numerico', 200000)).toBe(true);
    expect(isRuleSetSizeCompatible(10000, 'nao-numerico')).toBe(true);
  });

  it('accepts numeric strings, as Supabase returns for numeric columns', () => {
    expect(isRuleSetSizeCompatible('10000', '10000')).toBe(true);
    expect(isRuleSetSizeCompatible('10000', '200000')).toBe(false);
  });
});

describe('resolveAccountSizeForRuleSet', () => {
  it('prefers account_size, then start_balance, then current_balance', () => {
    expect(
      resolveAccountSizeForRuleSet({ account_size: 50000, start_balance: 100000, current_balance: 99000 }),
    ).toBe(50000);
    expect(resolveAccountSizeForRuleSet({ start_balance: 100000, current_balance: 99000 })).toBe(100000);
    expect(resolveAccountSizeForRuleSet({ current_balance: 99000 })).toBe(99000);
  });

  it('falls back to 0 for an unknown account', () => {
    expect(resolveAccountSizeForRuleSet(null)).toBe(0);
    expect(resolveAccountSizeForRuleSet({})).toBe(0);
  });
});
