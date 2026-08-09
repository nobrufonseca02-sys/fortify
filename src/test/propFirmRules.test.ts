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
  const sprint3Firms = ['FXIFY', 'E8 Markets', 'BrightFunded', 'Alpha Capital Group'];
  const sprint3Programs = propFirmRulePrograms.filter((program) => sprint3Firms.includes(program.firm));

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

  it('publishes every Sprint 3 firm with unique ids and official evidence', () => {
    expect(new Set(sprint3Programs.map((program) => program.firm))).toEqual(new Set(sprint3Firms));
    expect(sprint3Programs).toHaveLength(26);
    expect(propFirmRulePrograms).toHaveLength(52);
    expect(new Set(propFirmRulePrograms.map((program) => program.id)).size).toBe(propFirmRulePrograms.length);

    for (const program of sprint3Programs) {
      expect(program.firmSlug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(program.officialSources?.length).toBeGreaterThan(0);
      expect(program.officialSources?.every((source) => source.url.startsWith('https://'))).toBe(true);
      expect(program.evidenceStatus).toMatch(/^(verified|official_source_unavailable)$/);
      expect(program.criticalRules.length).toBeGreaterThan(0);
      if (program.evidenceStatus === 'verified') {
        expect(program.monitorability).toBeDefined();
        expect(program.prohibitedPractices?.length).toBeGreaterThan(0);
      }
    }
  });

  it('keeps unavailable official catalogs explicit instead of inventing rules', () => {
    const unavailablePrograms = sprint3Programs.filter(
      (program) => program.evidenceStatus === 'official_source_unavailable',
    );
    const unavailablePattern = /indisponível|unavailable|unknown/i;

    expect(unavailablePrograms.map((program) => program.firm)).toEqual([]);
    for (const program of unavailablePrograms) {
      expect(program.profitTarget).toMatch(unavailablePattern);
      expect(program.dailyLoss).toMatch(unavailablePattern);
      expect(program.maxLoss).toMatch(unavailablePattern);
      expect(program.minTradingDays).toMatch(unavailablePattern);
      expect(program.consistencyRule).toMatch(unavailablePattern);
      expect(program.newsRule).toMatch(unavailablePattern);
      expect(program.weekendRule).toMatch(unavailablePattern);
      expect(program.payout).toMatch(unavailablePattern);
    }
  });

  it('keeps Sprint 3 programs compatible with search and derived filters', () => {
    const search = (term: string) => {
      const normalizedTerm = term.toLocaleLowerCase('pt-BR');
      return propFirmRulePrograms.filter((program) =>
        [program.firm, program.programName, program.programType, program.market]
          .join(' ')
          .toLocaleLowerCase('pt-BR')
          .includes(normalizedTerm),
      );
    };

    expect(search('FXIFY').length).toBe(8);
    expect(search('E8 Zero')).toHaveLength(2);
    expect(search('Alpha Three').map((program) => program.id)).toEqual(['alpha-capital-three-2026']);
    expect(new Set(propFirmFilterOptions.firms)).toEqual(new Set(propFirmRulePrograms.map((program) => program.firm)));
    expect(propFirmFilterOptions.programTypes).toContain('3-Step');
    expect(sprint2Programs.some((program) => program.criticalRules.length === 0)).toBe(false);
  });

  it('publishes explicit account-level rules for every active program', () => {
    const activePrograms = propFirmRulePrograms.filter(
      (program) => program.evidenceStatus !== 'official_source_unavailable',
    );
    const accountRules = activePrograms.flatMap((program) => program.accountLevelRules);

    expect(activePrograms).toHaveLength(52);
    expect(accountRules).toHaveLength(255);
    expect(new Set(accountRules.map((account) => account.id)).size).toBe(accountRules.length);

    for (const program of activePrograms) {
      expect(program.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(program.firmSlug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(program.programSlug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(program.programName.trim()).not.toBe('');
      expect(program.programType).toBeTruthy();
      expect(program.market).toBeTruthy();
      expect(program.platforms.length).toBeGreaterThan(0);
      expect(program.lastReviewedAt).toBeTruthy();
      expect(program.confidence).toMatch(/^(high|medium|low)$/);
      expect(program.dataCompleteness).toMatch(/^(complete|partial|legacy)$/);
      expect(program.officialSources?.length).toBeGreaterThan(0);
      expect(program.officialSourceUrls.length).toBeGreaterThan(0);
      expect(program.officialSourceUrls.every((url) => url.startsWith('https://'))).toBe(true);
      expect(program.monitorability).toEqual({
        automatic_mt5: expect.any(Array),
        manual_check: expect.any(Array),
        not_supported_yet: expect.any(Array),
      });
      expect(program.accountLevelRules.length).toBeGreaterThan(0);
    }

    expect(new Set(activePrograms.map((program) => program.programSlug)).size).toBe(activePrograms.length);
  });

  it('keeps every account critical field explicit and officially sourced', () => {
    const accountRules = propFirmRulePrograms.flatMap((program) => program.accountLevelRules);

    for (const account of accountRules) {
      expect(account.label.trim()).not.toBe('');
      expect(account.initialBalance.trim()).not.toBe('');
      expect(account.platforms.length).toBeGreaterThan(0);
      expect(account.phases.length).toBeGreaterThan(0);
      expect(account.phases.every((phase) => phase.profitTarget.trim().length > 0)).toBe(true);
      expect(account.dailyLoss.trim()).not.toBe('');
      expect(account.maxLoss.trim()).not.toBe('');
      expect(account.drawdownCalculation.trim()).not.toBe('');
      expect(account.payoutSplit.trim()).not.toBe('');
      expect(account.sourceRefs.length).toBeGreaterThan(0);
      expect(account.sourceRefs.every((url) => url.startsWith('https://'))).toBe(true);
      expect(account.lastReviewedAt).toBe('2026-07-17');
      expect(account.confidence).toMatch(/^(high|medium|low)$/);
      expect(account.dataCompleteness).toMatch(/^(complete|partial|legacy)$/);
      expect(account.versions.length).toBeGreaterThan(0);
      expect(account.versions.every((version) => version.id.trim().length > 0)).toBe(true);
      expect(new Set(account.versions.map((version) => version.id)).size).toBe(account.versions.length);
    }
  });

  it('standardizes unknown critical values and keeps account labels unique per program', () => {
    const invalidUnknown = /^(?:N\/A|-|TBD|undefined|null)$/i;

    for (const program of propFirmRulePrograms) {
      const labels = program.accountLevelRules.map((account) => account.label.toLocaleLowerCase('pt-BR'));
      expect(new Set(labels).size).toBe(labels.length);

      for (const account of program.accountLevelRules) {
        const criticalValues = [
          account.label,
          account.initialBalance,
          account.dailyLoss,
          account.maxLoss,
          account.drawdownCalculation,
          account.payoutSplit,
          ...account.phases.map((phase) => phase.profitTarget),
        ];

        expect(criticalValues.every((value) => value.trim().length > 0)).toBe(true);
        expect(criticalValues.some((value) => invalidUnknown.test(value.trim()))).toBe(false);
      }
    }
  });

  it('does not classify futures or BlackArrow programs as automatic MT5 monitoring', () => {
    const externallyConnectedPrograms = propFirmRulePrograms.filter(
      (program) =>
        program.evidenceStatus !== 'official_source_unavailable' &&
        (program.market === 'Futures' || program.platforms.some((platform) => /BlackArrow/i.test(platform))),
    );

    expect(externallyConnectedPrograms.length).toBeGreaterThan(0);
    for (const program of externallyConnectedPrograms) {
      expect(program.monitorability?.automatic_mt5).toEqual([]);
      expect(program.monitorability?.manual_check.length).toBeGreaterThan(0);
      expect(program.monitorability?.not_supported_yet.length).toBeGreaterThan(0);
    }
  });

  it('does not create fake operational accounts for unavailable firms', () => {
    const unavailablePrograms = propFirmRulePrograms.filter(
      (program) => program.evidenceStatus === 'official_source_unavailable',
    );

    expect(unavailablePrograms.map((program) => program.firm)).toEqual([]);
    expect(unavailablePrograms.every((program) => program.accountLevelRules.length === 0)).toBe(true);
  });

  it('keeps account-level official price and version evidence searchable', () => {
    const searchNested = (term: string) => {
      const query = term.toLocaleLowerCase('pt-BR');
      return propFirmRulePrograms.filter((program) =>
        program.accountLevelRules
          .flatMap((account) => [
            account.label,
            account.price,
            account.dailyLoss,
            account.maxLoss,
            account.consistencyRule,
            ...account.versions.flatMap((version) => [
              version.label,
              version.effectiveFrom ?? '',
              version.effectiveTo ?? '',
              version.condition ?? '',
            ]),
          ])
          .join(' ')
          .toLocaleLowerCase('pt-BR')
          .includes(query),
      );
    };

    expect(searchNested('US$95/mês').map((program) => program.id)).toEqual([
      'topstep-trading-combine-2026',
    ]);
    expect(searchNested('2026-06-27').map((program) => program.firm)).toEqual([
      'FundingPips',
      'FundingPips',
    ]);
  });
});
