import { describe, expect, it } from 'vitest';
import {
  buildRuleSnapshot,
  emptyRuleBindingDraft,
  getAccountRuleBindingStatus,
  getOperationalRulePrograms,
  hashRuleSnapshot,
  isRuleBindingDraftComplete,
  prepareRuleBinding,
  resolveRuleBinding,
  type RuleBindingDraft,
} from '../lib/ruleBinding';

function firstMt5Draft(): RuleBindingDraft {
  const program = getOperationalRulePrograms('MT5')[0];
  const accountSize = program.accountLevelRules.find((account) =>
    account.platforms.some((platform) => /mt5/i.test(platform)),
  )!;
  const platform = accountSize.platforms.find((item) => /mt5/i.test(item))!;
  const version = accountSize.versions[0];

  return {
    propFirmSlug: program.firmSlug,
    programSlug: program.programSlug,
    accountSizeId: accountSize.id,
    platform,
    ruleVersionId: version.id,
    manualRuleAcknowledgement: true,
  };
}

describe('versioned account rule binding', () => {
  it('publishes only operational firms and excludes unavailable catalogs', () => {
    const firms = new Set(getOperationalRulePrograms().map((program) => program.firm));

    expect(firms.has('Fundscap')).toBe(false);
    expect(firms.has('MyFundedFX')).toBe(false);
    expect(firms.size).toBe(14);
  });

  it('resolves the complete selection by stable identifiers', () => {
    const draft = firstMt5Draft();
    const resolved = resolveRuleBinding(draft);

    expect(resolved?.program.firmSlug).toBe(draft.propFirmSlug);
    expect(resolved?.program.programSlug).toBe(draft.programSlug);
    expect(resolved?.accountSize.id).toBe(draft.accountSizeId);
    expect(resolved?.version.id).toBe(draft.ruleVersionId);
  });

  it('requires a complete selection and manual acknowledgement', () => {
    const draft = firstMt5Draft();

    expect(isRuleBindingDraftComplete(draft)).toBe(true);
    expect(isRuleBindingDraftComplete({ ...draft, manualRuleAcknowledgement: false })).toBe(false);
    expect(isRuleBindingDraftComplete(emptyRuleBindingDraft())).toBe(false);
  });

  it('builds an auditable snapshot with critical rules and evidence', () => {
    const snapshot = buildRuleSnapshot(firstMt5Draft());

    expect(snapshot.schemaVersion).toBe('fortify.rule-binding.v1');
    expect(snapshot.criticalRules.dailyLoss).toBeTruthy();
    expect(snapshot.criticalRules.maxLoss).toBeTruthy();
    expect(snapshot.criticalRules.phases.length).toBeGreaterThan(0);
    expect(snapshot.monitorability.automaticMt5).toEqual(expect.any(Array));
    expect(snapshot.monitorability.manualCheck).toEqual(expect.any(Array));
    expect(snapshot.evidence.officialSourceUrls.length).toBeGreaterThan(0);
    expect(snapshot.evidence.officialSourceUrls.every((url) => url.startsWith('https://'))).toBe(true);
  });

  it('generates a stable signature and changes it when a critical rule changes', async () => {
    const snapshot = buildRuleSnapshot(firstMt5Draft());
    const firstHash = await hashRuleSnapshot(snapshot);
    const secondHash = await hashRuleSnapshot(buildRuleSnapshot(firstMt5Draft()));
    const changedHash = await hashRuleSnapshot({
      ...snapshot,
      criticalRules: {
        ...snapshot.criticalRules,
        dailyLoss: `${snapshot.criticalRules.dailyLoss} alterado`,
      },
    });

    expect(firstHash).toBe(secondHash);
    expect(firstHash).not.toBe(changedHash);
    expect(firstHash).toMatch(/^(sha256|fnv1a64):[a-f0-9]+$/);
  });

  it('enables automatic monitoring only for compatible MT5 rules', async () => {
    const prepared = await prepareRuleBinding(firstMt5Draft());
    const hasAutomaticRules =
      prepared.resolved.accountSize.monitorability.automatic_mt5.length > 0;

    expect(prepared.automaticMonitoringEnabled).toBe(hasAutomaticRules);
    expect(prepared.ruleProfileId).toContain(prepared.resolved.program.programSlug);
  });

  it('marks legacy accounts without a binding as pending', () => {
    expect(getAccountRuleBindingStatus(null)).toEqual({
      code: 'pending',
      label: 'Regra pendente de vínculo',
      actionLabel: 'Vincular regra agora',
    });
  });
});
