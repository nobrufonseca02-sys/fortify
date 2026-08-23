/**
 * Size-compatibility guard for the legacy UUID rule catalog
 * (`rule_set_versions` → `trading_accounts.rule_set_id`).
 *
 * Rule instances in that catalog may carry absolute dollar limits
 * (`mode = 'value'`), and the gateway's evaluator applies them verbatim — it
 * never rescales them against the account that was actually connected. The
 * seeded "Generic Broker-only $10k Risk Template" is the live example: it is
 * the only seeded version with `status = 'active'`, and it declares
 * `max_daily_loss = 500` / `max_total_loss = 1000` as hard `value` rules. Bind a
 * $200k account to it and a $501 down day evaluates to VIOLATED, which the
 * gateway then persists as `trading_accounts.status = 'violated'` — wrong data
 * on a real account.
 *
 * The guard belongs in the pickers, not in the evaluator: absolute limits are
 * legitimate on a correctly sized template, so rescaling them generically would
 * corrupt real prop-firm rule sets. Nothing here adjusts, scales or rewrites a
 * limit — a version whose declared `account_size` materially mismatches the
 * account simply must never get selected.
 *
 * The tolerance is the one `AccountRuleManagement`'s `suggestedRuleSets` has
 * always used for the same question. It is deliberately kept identical so the
 * "close enough" band is defined in exactly one place.
 */
export const RULE_SET_SIZE_TOLERANCE_USD = 1000;

type MaybeNumeric = number | string | null | undefined;

/**
 * True when a `rule_set_versions` row may govern an account of this size.
 *
 * An unknown size on either side is *not* treated as a mismatch: most seeded
 * versions declare no `account_size` at all, and an account with no balance yet
 * has nothing to compare against. Blocking those would break flows that are
 * working correctly today.
 */
export function isRuleSetSizeCompatible(
  ruleSetAccountSize: MaybeNumeric,
  accountSize: MaybeNumeric,
): boolean {
  const versionSize = Number(ruleSetAccountSize ?? 0);
  const target = Number(accountSize ?? 0);

  if (!Number.isFinite(versionSize) || !Number.isFinite(target)) return true;
  if (!versionSize || !target) return true;

  return Math.abs(versionSize - target) <= RULE_SET_SIZE_TOLERANCE_USD;
}

/**
 * The account size a legacy rule set has to be compared against. Mirrors the
 * fallback chain the account-rules screen already used for its suggestions.
 */
export function resolveAccountSizeForRuleSet(account: {
  account_size?: MaybeNumeric;
  start_balance?: MaybeNumeric;
  current_balance?: MaybeNumeric;
} | null | undefined): number {
  const size = Number(
    account?.account_size ?? account?.start_balance ?? account?.current_balance ?? 0,
  );
  return Number.isFinite(size) ? size : 0;
}
