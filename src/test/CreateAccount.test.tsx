import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  accountCurrencyValue,
  initialBalanceValue,
  LibraryRuleSelectionNotice,
  parseLibraryRuleSelection,
} from '../pages/CreateAccount';
import { getOperationalRulePrograms } from '../lib/ruleBinding';

function validSelection() {
  const program = getOperationalRulePrograms().find((item) => item.firmSlug === 'ftmo')!;
  const account = program.accountLevelRules.find((item) => item.platforms.includes('MT5'))!;
  const platform = account.platforms.find((item) => item === 'MT5')!;
  const version = account.versions[0];
  const params = new URLSearchParams({
    propFirmSlug: program.firmSlug,
    programSlug: program.programSlug,
    accountSizeId: account.id,
    platform,
    ruleVersionId: version.id,
  });
  return { program, account, platform, version, search: `?${params.toString()}` };
}

describe('CreateAccount library preselection', () => {
  it('validates and resolves all identifiers sent by the library', () => {
    const selection = validSelection();
    const result = parseLibraryRuleSelection(selection.search);

    expect(result.status).toBe('valid');
    if (result.status !== 'valid') throw new Error('Expected valid library selection');
    expect(result.resolved.program.id).toBe(selection.program.id);
    expect(result.resolved.accountSize.id).toBe(selection.account.id);
    expect(result.resolved.version.id).toBe(selection.version.id);
    expect(result.initialSelection.platform).toBe(selection.platform);
  });

  it('converts the selected account size into its operational USD balance', () => {
    expect(initialBalanceValue('$100K')).toBe('100000');
    expect(initialBalanceValue('$2.5K')).toBe('2500');
    expect(accountCurrencyValue('$100K', 'EUR')).toBe('USD');
  });

  it('preserves the normal flow when no query parameters are present', () => {
    expect(parseLibraryRuleSelection('')).toEqual({ status: 'none' });
  });

  it.each([
    ['missing parameter', (params: URLSearchParams) => params.delete('ruleVersionId')],
    ['wrong program', (params: URLSearchParams) => params.set('programSlug', 'apex-evaluation')],
    ['wrong account', (params: URLSearchParams) => params.set('accountSizeId', 'another-account')],
    ['wrong platform', (params: URLSearchParams) => params.set('platform', 'UNKNOWN')],
    ['wrong version', (params: URLSearchParams) => params.set('ruleVersionId', 'unknown-version')],
    ['blocked firm Fundscap', (params: URLSearchParams) => params.set('propFirmSlug', 'fundscap')],
    ['blocked firm MyFundedFX', (params: URLSearchParams) => params.set('propFirmSlug', 'myfundedfx')],
  ])('rejects %s without producing a binding', (_label, mutate) => {
    const params = new URLSearchParams(validSelection().search);
    mutate(params);
    expect(parseLibraryRuleSelection(`?${params.toString()}`)).toEqual({ status: 'invalid' });
  });

  it('renders the valid library notice without implying acknowledgement', () => {
    render(<LibraryRuleSelectionNotice status="valid" />);
    expect(screen.getByText(/Regra pré-selecionada a partir da Biblioteca/)).toBeInTheDocument();
    expect(screen.getByText(/Revise os dados antes de conectar sua conta/)).toBeInTheDocument();
  });

  it('renders a discreet recovery message for invalid links', () => {
    render(<LibraryRuleSelectionNotice status="invalid" />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Não foi possível carregar a regra enviada pela Biblioteca. Selecione manualmente.',
    );
  });
});
