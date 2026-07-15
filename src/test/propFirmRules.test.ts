import { describe, expect, it } from 'vitest';
import { propFirmFilterOptions, propFirmRulePrograms } from '../data/propFirmRules';

describe('prop firm rules dataset', () => {
  const asapPrograms = propFirmRulePrograms.filter((program) => program.firm === 'ASAP Funding Prop');
  const npFuturePrograms = propFirmRulePrograms.filter((program) => program.firm === 'NP Future');
  const sprint2Firms = [
    'FTMO',
    'Apex Trader Funding',
    'Hantec Trader',
    'Topstep',
    'The Trading Pit',
    'FundingPips',
    'FundedNext',
    'The5ers',
  ];
  const sprint2Programs = propFirmRulePrograms.filter((program) => sprint2Firms.includes(program.firm));

  it('publishes the required ASAP and NP Future programs with unique ids', () => {
    expect(asapPrograms.map((program) => program.programName)).toEqual([
      'Challenge Express',
      'Funded Express',
      'Instant Account',
    ]);
    expect(npFuturePrograms).toHaveLength(6);
    expect(new Set(propFirmRulePrograms.map((program) => program.id)).size).toBe(propFirmRulePrograms.length);
  });

  it('keeps official evidence and monitorability on every new program', () => {
    for (const program of [...asapPrograms, ...npFuturePrograms]) {
      expect(program.confidence).toBeDefined();
      expect(program.completeness).toBeDefined();
      expect(program.officialSources?.length).toBeGreaterThan(0);
      expect(program.officialSources?.[0].url).toMatch(/^https:\/\//);
      expect(program.monitorability).toBeDefined();
    }
  });

  it('uses the NP Future regulation value for the 200K daily loss conflict', () => {
    const standardMt5 = npFuturePrograms.find((program) => program.id === 'npfuture-standard-mt5');
    const flashMt5 = npFuturePrograms.find((program) => program.id === 'npfuture-flash-mt5');

    expect(standardMt5?.accountSizeRows.find((row) => row.label.includes('$200K'))?.dailyLoss).toBe('$3,600');
    expect(flashMt5?.accountSizeRows.find((row) => row.label.includes('$200K'))?.dailyLoss).toBe('$3,600');
    expect(standardMt5?.conflicts?.some((conflict) => conflict.preferredValue === '$3,600')).toBe(true);
  });

  it('publishes every Sprint 2 firm with normalized official evidence', () => {
    expect(new Set(sprint2Programs.map((program) => program.firm))).toEqual(new Set(sprint2Firms));

    for (const program of sprint2Programs) {
      expect(program.firmSlug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(program.evidenceStatus).toBe('verified');
      expect(program.dataCompleteness).toBeDefined();
      expect(program.officialSources?.length).toBeGreaterThan(0);
      expect(program.officialSources?.every((source) => source.url.startsWith('https://'))).toBe(true);
      expect(program.monitorability).toBeDefined();
      expect(program.prohibitedPractices?.length).toBeGreaterThan(0);
    }
  });

  it('keeps one canonical slug per firm and derives filters from published firms', () => {
    const slugsByFirm = new Map<string, Set<string>>();

    for (const program of sprint2Programs) {
      const slugs = slugsByFirm.get(program.firm) ?? new Set<string>();
      slugs.add(program.firmSlug!);
      slugsByFirm.set(program.firm, slugs);
    }

    expect([...slugsByFirm.values()].every((slugs) => slugs.size === 1)).toBe(true);
    expect(new Set([...slugsByFirm.values()].map((slugs) => [...slugs][0])).size).toBe(slugsByFirm.size);
    expect(new Set(propFirmFilterOptions.firms)).toEqual(new Set(propFirmRulePrograms.map((program) => program.firm)));
  });

  it('does not publish backlog firms without reviewed official programs', () => {
    const backlogFirms = ['FXIFY', 'E8 Markets', 'BrightFunded', 'Alpha Capital Group', 'MyFundedFX', 'Fundscap'];

    expect(propFirmRulePrograms.some((program) => backlogFirms.includes(program.firm))).toBe(false);
    expect(sprint2Programs.some((program) => program.criticalRules.length === 0)).toBe(false);
  });
});
