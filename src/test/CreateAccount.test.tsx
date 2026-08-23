import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CreateAccount, {
  initialBalanceValue,
  LibraryRuleSelectionNotice,
  parseLibraryRuleSelection,
} from '../pages/CreateAccount';
import { accountCurrencyValue, getOperationalRulePrograms } from '../lib/ruleBinding';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    session: { user: { id: 'user-1' }, access_token: 'token-1' },
  }),
}));

vi.mock('@/hooks/useSubscriptionPlan', () => ({
  useSubscriptionPlan: () => ({
    subscription: null,
    plans: [],
    accountLimit: 5,
    activeAccountCount: 0,
    remainingAccounts: 5,
    hasActivePlan: true,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

const GENERIC_FIRM = {
  id: 'firm-generic',
  name: 'Generic MT5 Broker',
  slug: 'generic-mt5-broker',
  logo_url: null,
  website: null,
  category: 'broker_only',
  status: 'active',
  color: null,
};

const GENERIC_PROGRAM = {
  id: 'program-generic',
  prop_firm_id: 'firm-generic',
  name: 'Broker-only / Custom $10k',
  account_type: 'broker_only',
  market_type: 'forex',
  account_size: 10000,
  notes: 'Generic risk-management template. Not a prop firm rule set.',
  review_status: 'active',
};

// The seeded generic template: the only rule_set_version with status 'active',
// declaring account_size 10000 and absolute (`value`) dollar limits.
let programRules: any = {
  version: {
    id: 'version-generic-10k',
    program_id: 'program-generic',
    name: 'Generic Broker-only $10k Risk Template',
    account_size: 10000,
    status: 'active',
    start_date: null,
    end_date: null,
    source_url: null,
  },
  rules: [
    {
      id: 'instance-1',
      rule_set_version_id: 'version-generic-10k',
      rule_definition_id: 'definition-1',
      mode: 'value',
      base_calculation: 'initial_balance',
      includes_floating: true,
      daily_reset: true,
      limit_value: 500,
      severity: 'hard',
      enabled: true,
      params: {},
      rule_definition: {
        id: 'definition-1',
        key: 'max_daily_loss',
        name: 'Perda Máx. Diária',
        description: null,
        category: 'risk',
      },
    },
  ],
};

vi.mock('@/hooks/usePropFirmLibrary', () => ({
  usePropFirms: () => ({ data: [GENERIC_FIRM], isLoading: false }),
  usePrograms: (firmId: string | null) => ({
    data: firmId ? [GENERIC_PROGRAM] : [],
    isLoading: false,
  }),
  useProgramRules: (programId: string | null) => ({
    data: programId ? programRules : undefined,
    isLoading: false,
  }),
}));

function renderWizard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/accounts/new']}>
        <Routes>
          <Route path="/accounts/new" element={<CreateAccount />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function startBalanceInput() {
  const input = screen.getByText('Saldo Inicial').parentElement?.querySelector('input');
  if (!input) throw new Error('Campo "Saldo Inicial" não encontrado');
  return input;
}

// Walks step 0: pick the firm, then the program whose active version is the
// $10k generic template, then advance to the account-info step. The await is
// required — steps are swapped by AnimatePresence mode="wait", so step 1 only
// mounts after step 0 finishes animating out.
async function selectGenericProgramAndAdvance() {
  fireEvent.click(screen.getByRole('button', { name: /Generic MT5 Broker/ }));
  fireEvent.click(screen.getByRole('button', { name: /Broker-only \/ Custom \$10k/ }));
  fireEvent.click(screen.getByRole('button', { name: /Próximo/ }));
  await screen.findByText('Informações da Conta');
}

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

describe('CreateAccount legacy rule-set size guard', () => {
  beforeEach(() => {
    programRules = {
      ...programRules,
      version: { ...programRules.version, account_size: 10000 },
    };
  });

  it('announces the size the selected template was built for', () => {
    renderWizard();

    fireEvent.click(screen.getByRole('button', { name: /Generic MT5 Broker/ }));
    fireEvent.click(screen.getByRole('button', { name: /Broker-only \/ Custom \$10k/ }));

    expect(
      screen.getByText(/Modelo dimensionado para contas de \$10,000/),
    ).toBeInTheDocument();
  });

  it('blocks advancing when the entered balance does not match the template size', async () => {
    renderWizard();
    await selectGenericProgramAndAdvance();

    // Step 1 opens with the default $100k balance against a $10k template.
    expect(startBalanceInput()).toHaveValue(100000);
    expect(screen.getByText('Modelo incompatível com o saldo informado')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Próximo/ })).toBeDisabled();
  });

  it('keeps blocking for a large mismatch such as a $200k account', async () => {
    renderWizard();
    await selectGenericProgramAndAdvance();

    fireEvent.change(startBalanceInput(), { target: { value: '200000' } });

    expect(screen.getByText('Modelo incompatível com o saldo informado')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Próximo/ })).toBeDisabled();
  });

  it('releases the wizard once the balance matches the template size', async () => {
    renderWizard();
    await selectGenericProgramAndAdvance();

    fireEvent.change(startBalanceInput(), { target: { value: '10000' } });

    expect(
      screen.queryByText('Modelo incompatível com o saldo informado'),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Próximo/ })).not.toBeDisabled();
  });

  it('accepts a balance inside the shared ±1000 tolerance band', async () => {
    renderWizard();
    await selectGenericProgramAndAdvance();

    fireEvent.change(startBalanceInput(), { target: { value: '10900' } });

    expect(
      screen.queryByText('Modelo incompatível com o saldo informado'),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Próximo/ })).not.toBeDisabled();
  });

  it('leaves programs whose version declares no size untouched', async () => {
    // Every real prop-firm version is seeded with a null account_size — those
    // flows must behave exactly as they did before the guard.
    programRules = { ...programRules, version: { ...programRules.version, account_size: null } };
    renderWizard();
    await selectGenericProgramAndAdvance();

    fireEvent.change(startBalanceInput(), { target: { value: '200000' } });

    expect(
      screen.queryByText('Modelo incompatível com o saldo informado'),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Próximo/ })).not.toBeDisabled();
  });
});
