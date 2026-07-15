import { describe, expect, it } from 'vitest';
import { propFirmRulePrograms } from '../data/propFirmRules';

describe('prop firm rules dataset', () => {
  const asapPrograms = propFirmRulePrograms.filter((program) => program.firm === 'ASAP Funding Prop');
  const npFuturePrograms = propFirmRulePrograms.filter((program) => program.firm === 'NP Future');

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
});
