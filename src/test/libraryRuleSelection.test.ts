import { describe, expect, it } from 'vitest';
import { parseLibraryRuleSelection } from '@/lib/libraryRuleSelection';
import { getOperationalRulePrograms } from '@/lib/ruleBinding';

function ftmo2Step() {
  return getOperationalRulePrograms('MT5').find(
    (item) => item.firmSlug === 'ftmo' && item.programType === '2-Step',
  )!;
}

describe('parseLibraryRuleSelection', () => {
  it('sem parâmetros relevantes, não há seleção', () => {
    expect(parseLibraryRuleSelection('')).toEqual({ status: 'none' });
    expect(parseLibraryRuleSelection('?foo=bar')).toEqual({ status: 'none' });
  });

  it('autoDetectSize=1 com mesa/programa reais resolve para auto_detect', () => {
    const program = ftmo2Step();
    const result = parseLibraryRuleSelection(
      `?propFirmSlug=${program.firmSlug}&programSlug=${program.programSlug}&autoDetectSize=1`,
    );
    expect(result.status).toBe('auto_detect');
    expect(result.status === 'auto_detect' && result.program).toBe(program);
  });

  it('autoDetectSize=1 com slugs inexistentes é inválido', () => {
    const result = parseLibraryRuleSelection('?propFirmSlug=inexistente&programSlug=x&autoDetectSize=1');
    expect(result.status).toBe('invalid');
  });

  it('seleção completa (5 params) continua resolvendo como valid, sem autoDetectSize', () => {
    const program = ftmo2Step();
    const accountSize = program.accountLevelRules.find((a) => a.label === '$100K')!;
    const platform = accountSize.platforms.find((p) => p === 'MT5')!;
    const result = parseLibraryRuleSelection(
      `?propFirmSlug=${program.firmSlug}&programSlug=${program.programSlug}&accountSizeId=${accountSize.id}&platform=${platform}&ruleVersionId=${accountSize.versions[0].id}`,
    );
    expect(result.status).toBe('valid');
  });
});
