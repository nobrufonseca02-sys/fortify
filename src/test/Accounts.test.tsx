import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Accounts from '../pages/Accounts';
import { getOperationalRulePrograms } from '../lib/ruleBinding';

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

vi.mock('@/hooks/useAccountsStore', () => ({
  useAccountsStore: () => ({ accounts: [], removeAccount: vi.fn() }),
}));

vi.mock('@/hooks/useRuleEvaluations', () => ({
  useAllRuleEvaluations: () => ({ data: [] }),
}));

const mt5ConnectionsSelect = {
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockResolvedValue({ data: [], error: null }),
};

const ruleBindingsSelect = {
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockResolvedValue({ data: [], error: null }),
};

const tradingAccountsInsert = {
  select: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: { id: 'account-1' }, error: null }),
};

const ruleBindingsInsert = {
  select: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: { id: 'binding-1' }, error: null }),
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'mt5_connections') {
        return { select: () => mt5ConnectionsSelect };
      }
      if (table === 'account_rule_bindings') {
        return { select: () => ruleBindingsSelect, insert: () => ruleBindingsInsert };
      }
      if (table === 'trading_accounts') {
        return { insert: () => tradingAccountsInsert };
      }
      throw new Error(`Unexpected table in test: ${table}`);
    },
  },
}));

function renderAt(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/accounts" element={<Accounts />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function ftmoLibraryParams() {
  const program = getOperationalRulePrograms('MT5').find((item) => item.firmSlug === 'ftmo')!;
  const accountSize = program.accountLevelRules.find((account) =>
    account.platforms.some((platform) => /mt5/i.test(platform)),
  )!;
  const platform = accountSize.platforms.find((item) => /mt5/i.test(item))!;
  const version = accountSize.versions[0];

  return {
    program,
    accountSize,
    search: new URLSearchParams({
      propFirmSlug: program.firmSlug,
      programSlug: program.programSlug,
      accountSizeId: accountSize.id,
      platform,
      ruleVersionId: version.id,
    }).toString(),
  };
}

describe('Accounts', () => {
  afterEach(() => {
    vi.clearAllMocks();
    mt5ConnectionsSelect.eq.mockReturnThis();
    mt5ConnectionsSelect.order.mockResolvedValue({ data: [], error: null });
    ruleBindingsSelect.eq.mockReturnThis();
    ruleBindingsSelect.order.mockResolvedValue({ data: [], error: null });
    tradingAccountsInsert.select.mockReturnThis();
    tradingAccountsInsert.single.mockResolvedValue({ data: { id: 'account-1' }, error: null });
    ruleBindingsInsert.select.mockReturnThis();
    ruleBindingsInsert.single.mockResolvedValue({ data: { id: 'binding-1' }, error: null });
  });

  it('keeps the connect form closed by default with no library selection', async () => {
    renderAt('/accounts');

    await waitFor(() => expect(mt5ConnectionsSelect.order).toHaveBeenCalled());
    expect(screen.queryByText('Conectar conta MT5')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Conectar Conta/ }).length).toBeGreaterThan(0);
  });

  it('auto-opens the connect form pre-filled when arriving with a valid library selection', async () => {
    const { program, accountSize, search } = ftmoLibraryParams();
    renderAt(`/accounts?${search}`);

    await waitFor(() => expect(mt5ConnectionsSelect.order).toHaveBeenCalled());
    expect(screen.getByText('Conectar conta MT5')).toBeInTheDocument();
    expect(screen.getByText(/Regra pré-selecionada a partir da Biblioteca/)).toBeInTheDocument();

    await waitFor(() => expect(screen.getByLabelText('Mesa proprietária')).toHaveValue(program.firmSlug));
    expect(screen.getByLabelText('Programa')).toHaveValue(program.programSlug);
    expect(screen.getByLabelText('Tamanho ou variante')).toHaveValue(accountSize.id);
    expect(screen.getByLabelText('Aceitar regras manuais')).not.toBeChecked();
    expect(screen.getByPlaceholderText('Ex.: FTMO 100k')).toHaveValue(`${program.firm} ${accountSize.label}`);
  });

  it('shows a warning when the library selection cannot be resolved', async () => {
    renderAt('/accounts?propFirmSlug=unknown-firm');

    await waitFor(() => expect(mt5ConnectionsSelect.order).toHaveBeenCalled());
    expect(screen.getByText(/Não foi possível carregar a regra enviada pela Biblioteca/)).toBeInTheDocument();
  });

  it('closes the form and stays on /accounts even when the MetaApi gateway call fails (no dead end)', async () => {
    const { search } = ftmoLibraryParams();
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'wrong_mt5_credentials' }),
    } as Response);

    renderAt(`/accounts?${search}`);
    await waitFor(() => expect(screen.getByLabelText('Mesa proprietária')).not.toHaveValue(''));

    fireEvent.change(screen.getByPlaceholderText('Ex.: 12345678'), { target: { value: '12345' } });
    fireEvent.change(screen.getByPlaceholderText('Ex.: ICMarketsSC-Live'), { target: { value: 'Server-1' } });
    fireEvent.change(screen.getByPlaceholderText('Ex.: IC Markets'), { target: { value: 'IC Markets' } });
    fireEvent.change(screen.getByPlaceholderText('Digite a senha MT5'), { target: { value: 'wrong-pass' } });
    fireEvent.click(screen.getByLabelText('Aceitar regras manuais'));

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(screen.queryByText('Conectar conta MT5')).not.toBeInTheDocument());
    // Still on the Accounts page — never navigated away, unlike the old MT5Connections page.
    expect(screen.getByRole('heading', { name: /Minhas.*Contas/ })).toBeInTheDocument();
  });
});
