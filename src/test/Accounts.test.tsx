import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Accounts from '../pages/Accounts';
import { getOperationalRulePrograms, initialBalanceValue } from '../lib/ruleBinding';

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

// Mutable so individual tests can put accounts / evaluations on the page.
let mockAccounts: any[] = [];
let mockRuleRows: any[] = [];

vi.mock('@/hooks/useAccountsStore', () => ({
  useAccountsStore: () => ({ accounts: mockAccounts, removeAccount: vi.fn() }),
}));

vi.mock('@/hooks/useRuleEvaluations', () => ({
  useAllRuleEvaluations: () => ({ data: mockRuleRows }),
}));

let mockCanonicalByAccount: Record<string, any> = {};
vi.mock('@/hooks/useCanonicalRuleEvaluations', () => ({
  useLatestCanonicalEvaluations: () => ({ data: mockCanonicalByAccount }),
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

// Fast-connect (no resolved binding) looks up an existing trading_accounts
// row for the same login+server before inserting — mock the chain resolving
// to "nothing found" so the reuse check falls through to the insert above.
const tradingAccountsSelect = {
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
};

const ruleBindingsInsert = {
  select: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: { id: 'binding-1' }, error: null }),
};

// Wrappers so tests can assert on the actual row payloads written to each
// table — the point of the library-path test is that the two must agree.
const tradingAccountsInsertFn = vi.fn((_payload?: any) => tradingAccountsInsert);
const ruleBindingsInsertFn = vi.fn((_payload?: any) => ruleBindingsInsert);

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'mt5_connections') {
        return { select: () => mt5ConnectionsSelect };
      }
      if (table === 'account_rule_bindings') {
        return { select: () => ruleBindingsSelect, insert: ruleBindingsInsertFn };
      }
      if (table === 'trading_accounts') {
        return { insert: tradingAccountsInsertFn, select: () => tradingAccountsSelect };
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

// A fast-connected account as it exists right after /metaapi/connect: no rule
// binding yet, and (on the gateway's early-return failure paths) no
// mt5_connections row either.
function fastConnectedAccount(overrides: Record<string, unknown> = {}) {
  return {
    id: 'account-1',
    nickname: 'Conta MT5 12345',
    startBalance: 0,
    currentBalance: 0,
    currentEquity: 0,
    baseCurrency: 'USD',
    ...overrides,
  };
}

function activeBindingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'binding-1',
    trading_account_id: 'account-1',
    binding_status: 'active',
    rule_snapshot_hash: 'sha256:abc',
    rule_snapshot: { propFirm: { slug: 'ftmo', name: 'FTMO' } },
    ...overrides,
  };
}

function canonicalRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'canonical-1',
    user_id: 'user-1',
    trading_account_id: 'account-1',
    binding_id: 'binding-1',
    rule_snapshot_hash: 'sha256:abc',
    rule_version_id: 'version-1',
    engine_version: 'fortify.rule-engine.v1',
    overall_status: 'safe',
    overall_message: '',
    automatic_rules: [],
    manual_rules: [],
    unsupported_rules: [],
    not_calculated_rules: [],
    alerts: [],
    input_summary: {},
    evaluated_at: new Date().toISOString(),
    ...overrides,
  };
}

function connectionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'connection-1',
    trading_account_id: 'account-1',
    connection_status: 'connected',
    sync_status: 'success',
    sync_error: null,
    last_sync_at: new Date(Date.now() - 5 * 60_000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 60_000).toISOString(),
    ...overrides,
  };
}

function safeEvaluationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'eval-1',
    trading_account_id: 'account-1',
    rule_instance_id: 'rule-1',
    status: 'SAFE',
    progress_pct: 10,
    current_value: 100,
    limit_value: 1000,
    computed_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('Accounts', () => {
  afterEach(() => {
    vi.clearAllMocks();
    mockAccounts = [];
    mockRuleRows = [];
    mockCanonicalByAccount = {};
    tradingAccountsInsertFn.mockReturnValue(tradingAccountsInsert);
    ruleBindingsInsertFn.mockReturnValue(ruleBindingsInsert);
    mt5ConnectionsSelect.eq.mockReturnThis();
    mt5ConnectionsSelect.order.mockResolvedValue({ data: [], error: null });
    ruleBindingsSelect.eq.mockReturnThis();
    ruleBindingsSelect.order.mockResolvedValue({ data: [], error: null });
    tradingAccountsInsert.select.mockReturnThis();
    tradingAccountsInsert.single.mockResolvedValue({ data: { id: 'account-1' }, error: null });
    tradingAccountsSelect.eq.mockReturnThis();
    tradingAccountsSelect.order.mockReturnThis();
    tradingAccountsSelect.limit.mockReturnThis();
    tradingAccountsSelect.maybeSingle.mockResolvedValue({ data: null, error: null });
    ruleBindingsInsert.select.mockReturnThis();
    ruleBindingsInsert.single.mockResolvedValue({ data: { id: 'binding-1' }, error: null });
  });

  it('keeps the connect form closed by default with no library selection', async () => {
    renderAt('/accounts');

    await waitFor(() => expect(mt5ConnectionsSelect.order).toHaveBeenCalled());
    expect(screen.queryByText('Conectar conta MT5')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Conectar conta/ }).length).toBeGreaterThan(0);
  });

  it('fast-connects with only name/login/server/password when there is no library selection, deferring the rule binding', async () => {
    renderAt('/accounts');

    await waitFor(() => expect(mt5ConnectionsSelect.order).toHaveBeenCalled());
    fireEvent.click(screen.getAllByRole('button', { name: /Conectar conta/ })[0]);

    expect(screen.getByText('Conectar conta MT5')).toBeInTheDocument();
    // The audited rule-binding selector never appears on the fast-connect path.
    expect(screen.queryByLabelText('Mesa proprietária')).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Ex.: 100k Challenge Express'), { target: { value: '100k Challenge Express' } });
    fireEvent.change(screen.getByPlaceholderText('Ex.: 12345678'), { target: { value: '12345' } });
    fireEvent.change(screen.getByPlaceholderText('Ex.: ICMarketsSC-Live'), { target: { value: 'Server-1' } });
    fireEvent.change(screen.getByPlaceholderText('Digite a senha MT5'), { target: { value: 'pass-1' } });

    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ connection: { id: 'connection-1' } }),
    } as Response);

    fireEvent.click(screen.getByRole('button', { name: 'Conectar' }));

    await waitFor(() => expect(screen.queryByText('Conectar conta MT5')).not.toBeInTheDocument());
    // No binding data was submitted — the audited binding save must not fire.
    expect(ruleBindingsInsert.select).not.toHaveBeenCalled();
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
    expect(screen.getByPlaceholderText('Ex.: 100k Challenge Express')).toHaveValue(`${program.firm} ${accountSize.label}`);
  });

  it('shows a warning when the library selection cannot be resolved', async () => {
    renderAt('/accounts?propFirmSlug=unknown-firm');

    await waitFor(() => expect(mt5ConnectionsSelect.order).toHaveBeenCalled());
    expect(screen.getByText(/Não foi possível carregar a regra enviada pela Biblioteca/)).toBeInTheDocument();
    // The selector is hidden on this page when nothing resolved, so the notice
    // must point at the deferred step instead of telling the trader to pick a
    // rule that is not rendered anywhere on screen.
    expect(screen.queryByLabelText('Mesa proprietária')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('vincule a regra da mesa logo em seguida');
    expect(screen.queryByText(/O vínculo com a regra da mesa fica pra logo em seguida/)).not.toBeInTheDocument();
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
    fireEvent.change(screen.getByPlaceholderText('Digite a senha MT5'), { target: { value: 'wrong-pass' } });
    fireEvent.click(screen.getByLabelText('Aceitar regras manuais'));

    fireEvent.click(screen.getByRole('button', { name: 'Conectar' }));

    await waitFor(() => expect(screen.queryByText('Conectar conta MT5')).not.toBeInTheDocument());
    // Still on the Accounts page — never navigated away, unlike the old MT5Connections page.
    expect(screen.getByRole('heading', { name: 'Contas' })).toBeInTheDocument();
  });

  it('keeps the binding prompt when the gateway only guessed the prop firm from the server name', async () => {
    // detected_prop_firm is a medium-confidence substring match, not an
    // audited binding — it must never stand in for one.
    mockAccounts = [fastConnectedAccount({ detectedPropFirm: 'FTMO' })];
    renderAt('/accounts');

    await waitFor(() => expect(ruleBindingsSelect.order).toHaveBeenCalled());

    expect(await screen.findByRole('button', { name: /Vincular regra agora/ })).toBeInTheDocument();
    // The guess is shown, but explicitly labelled as a guess...
    expect(screen.getByText('FTMO (detectado, não vinculado)')).toBeInTheDocument();
    // ...and never rendered like a confirmed binding.
    expect(screen.queryByText('FTMO')).not.toBeInTheDocument();
  });

  it('drops the binding prompt only when a real account_rule_bindings row exists', async () => {
    mockAccounts = [fastConnectedAccount({ detectedPropFirm: 'FTMO' })];
    ruleBindingsSelect.order.mockResolvedValue({ data: [activeBindingRow()], error: null });

    renderAt('/accounts');

    await waitFor(() => expect(screen.getByText('FTMO')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /Vincular regra/ })).not.toBeInTheDocument();
    expect(screen.queryByText('FTMO (detectado, não vinculado)')).not.toBeInTheDocument();
  });

  it('shows a no-data state instead of SEGURO for an unmonitored account', async () => {
    // No mt5_connections row and no evaluations: this is the default state of
    // every fast-connected account before its binding is completed.
    mockAccounts = [fastConnectedAccount({ detectedPropFirm: 'FTMO' })];
    renderAt('/accounts');

    await waitFor(() => expect(mt5ConnectionsSelect.order).toHaveBeenCalled());

    // Badge and connection strip both name the missing connection.
    expect((await screen.findAllByText('Sem conexão MT5')).length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText('Seguro')).not.toBeInTheDocument();
    // ...and the header must not claim compliance over an unmonitored account.
    expect(screen.getByText(/1 conta sem confirmação de segurança/)).toBeInTheDocument();
    expect(screen.queryByText('Tudo dentro dos limites')).not.toBeInTheDocument();
  });

  it('says server-side monitoring is not active for an account bound only through account_rule_bindings', async () => {
    // Real, audited binding — but rule_set_id is not a usable UUID, so the
    // gateway's evaluator has no rule set version to resolve and never writes
    // rule_evaluations for this account.
    mockAccounts = [fastConnectedAccount({ ruleSetId: '' })];
    ruleBindingsSelect.order.mockResolvedValue({ data: [activeBindingRow()], error: null });

    renderAt('/accounts');

    await waitFor(() => expect(screen.getByText('FTMO')).toBeInTheDocument());
    // The specific, known cause is named instead of only the generic no-data badge.
    expect(screen.getByText('Aguardando avaliação no servidor')).toBeInTheDocument();
    expect(screen.queryByText('Seguro')).not.toBeInTheDocument();
  });

  it('uses the canonical server evaluation for a bound account', async () => {
    mockAccounts = [fastConnectedAccount()];
    ruleBindingsSelect.order.mockResolvedValue({ data: [activeBindingRow()], error: null });
    mt5ConnectionsSelect.order.mockResolvedValue({ data: [connectionRow()], error: null });
    mockCanonicalByAccount = { 'account-1': canonicalRow({ overall_status: 'warning' }) };

    renderAt('/accounts');

    expect(await screen.findByText('Atenção')).toBeInTheDocument();
    expect(screen.queryByText('Aguardando avaliação no servidor')).not.toBeInTheDocument();
  });

  it('ignores legacy evaluations for a bound account without a canonical evaluation', async () => {
    mockAccounts = [fastConnectedAccount()];
    ruleBindingsSelect.order.mockResolvedValue({ data: [activeBindingRow()], error: null });
    mt5ConnectionsSelect.order.mockResolvedValue({ data: [connectionRow()], error: null });
    mockRuleRows = [safeEvaluationRow()];

    renderAt('/accounts');

    expect(await screen.findByText('Sem dados')).toBeInTheDocument();
    expect(screen.queryByText('Seguro')).not.toBeInTheDocument();
  });

  it('does not reuse an evaluation computed with a superseded binding', async () => {
    mockAccounts = [fastConnectedAccount()];
    ruleBindingsSelect.order.mockResolvedValue({ data: [activeBindingRow({ id: 'binding-2' })], error: null });
    mt5ConnectionsSelect.order.mockResolvedValue({ data: [connectionRow()], error: null });
    mockCanonicalByAccount = { 'account-1': canonicalRow({ binding_id: 'binding-1', overall_status: 'safe' }) };

    renderAt('/accounts');

    expect(await screen.findByText('Sem dados')).toBeInTheDocument();
    expect(screen.getByText('Aguardando avaliação no servidor')).toBeInTheDocument();
    expect(screen.queryByText('Seguro')).not.toBeInTheDocument();
  });

  it('does not claim a monitoring gap for an account with no binding at all', async () => {
    // Without a binding this is just the ordinary "vincule a regra" prompt —
    // the gap message would be noise on top of it.
    mockAccounts = [fastConnectedAccount({ ruleSetId: '' })];

    renderAt('/accounts');

    await waitFor(() => expect(ruleBindingsSelect.order).toHaveBeenCalled());
    expect(await screen.findByRole('button', { name: /Vincular regra agora/ })).toBeInTheDocument();
    expect(screen.queryByText('Sem monitoramento automático no servidor')).not.toBeInTheDocument();
  });

  it('still reports Seguro for a recently synced account with passing evaluations', async () => {
    mockAccounts = [fastConnectedAccount()];
    mockRuleRows = [safeEvaluationRow()];
    mt5ConnectionsSelect.order.mockResolvedValue({ data: [connectionRow()], error: null });

    renderAt('/accounts');

    expect(await screen.findByText('Seguro')).toBeInTheDocument();
    expect(screen.queryByText('Sem dados')).not.toBeInTheDocument();
    expect(screen.getByText('Tudo dentro dos limites')).toBeInTheDocument();
  });

  it('never shows Seguro when the MT5 connection has an auth error', async () => {
    mockAccounts = [fastConnectedAccount()];
    mockRuleRows = [safeEvaluationRow()];
    mt5ConnectionsSelect.order.mockResolvedValue({
      data: [connectionRow({ connection_status: 'auth_error', sync_status: 'error' })],
      error: null,
    });

    renderAt('/accounts');

    expect(await screen.findByText('Conexão com erro')).toBeInTheDocument();
    expect(screen.queryByText('Seguro')).not.toBeInTheDocument();
    expect(screen.queryByText('Tudo dentro dos limites')).not.toBeInTheDocument();
  });

  it('opens the credential fix dialog from ?fixConnection without prefilling a password', async () => {
    mockAccounts = [fastConnectedAccount()];
    mt5ConnectionsSelect.order.mockResolvedValue({
      data: [connectionRow({ connection_status: 'auth_error', sync_status: 'error', mt5_login: '12345678', mt5_server: 'Broker-Server01' })],
      error: null,
    });

    renderAt('/accounts?fixConnection=account-1');

    expect(await screen.findByRole('heading', { name: 'Corrigir conexão MT5' })).toBeInTheDocument();
    expect(screen.getByText('Broker-Server01')).toBeInTheDocument();
    const password = screen.getByLabelText('Senha MT5') as HTMLInputElement;
    expect(password.type).toBe('password');
    expect(password.value).toBe('');
    expect(screen.getByRole('button', { name: /Reconectar/ })).toBeDisabled();
  });

  it('shows Sync atrasado instead of Seguro when the last sync is older than 6 hours', async () => {
    mockAccounts = [fastConnectedAccount()];
    mockRuleRows = [safeEvaluationRow()];
    mt5ConnectionsSelect.order.mockResolvedValue({
      data: [connectionRow({ last_sync_at: new Date(Date.now() - 7 * 60 * 60_000).toISOString() })],
      error: null,
    });

    renderAt('/accounts');

    expect(await screen.findByText('Sync atrasado')).toBeInTheDocument();
    expect(screen.queryByText('Seguro')).not.toBeInTheDocument();
  });

  it('shows Sem dados for a connection that never finished a sync', async () => {
    mockAccounts = [fastConnectedAccount({ mt5LastSyncAt: null })];
    mockRuleRows = [safeEvaluationRow()];
    mt5ConnectionsSelect.order.mockResolvedValue({ data: [connectionRow({ last_sync_at: null })], error: null });

    renderAt('/accounts');

    expect(await screen.findByText('Sem dados')).toBeInTheDocument();
    expect(screen.queryByText('Seguro')).not.toBeInTheDocument();
  });

  it('writes the edited selector choice — not the stale library link — to both tables', async () => {
    const { program, accountSize, search } = ftmoLibraryParams();
    const editedSize = program.accountLevelRules.find(
      (item) =>
        item.id !== accountSize.id &&
        item.platforms.some((platform) => /mt5/i.test(platform)) &&
        initialBalanceValue(item.initialBalance) !== initialBalanceValue(accountSize.initialBalance),
    )!;
    expect(editedSize).toBeDefined();

    renderAt(`/accounts?${search}`);
    await waitFor(() => expect(screen.getByLabelText('Tamanho ou variante')).toHaveValue(accountSize.id));

    // The trader edits the pre-filled selection after arriving from the Library.
    fireEvent.change(screen.getByLabelText('Tamanho ou variante'), { target: { value: editedSize.id } });
    // Editing clears platform/version AND the manual acknowledgement — the
    // acknowledgement is never carried over or auto-checked.
    expect(screen.getByLabelText('Aceitar regras manuais')).not.toBeChecked();
    fireEvent.change(screen.getByLabelText('Plataforma'), { target: { value: 'MT5' } });
    fireEvent.change(screen.getByLabelText('Versão da regra'), { target: { value: editedSize.versions[0].id } });
    fireEvent.click(screen.getByLabelText('Aceitar regras manuais'));

    fireEvent.change(screen.getByPlaceholderText('Ex.: 12345678'), { target: { value: '12345' } });
    fireEvent.change(screen.getByPlaceholderText('Ex.: ICMarketsSC-Live'), { target: { value: 'Server-1' } });
    fireEvent.change(screen.getByPlaceholderText('Digite a senha MT5'), { target: { value: 'pass-1' } });

    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ connection: { id: 'connection-1' } }),
    } as Response);

    fireEvent.click(screen.getByRole('button', { name: 'Conectar' }));

    await waitFor(() => expect(ruleBindingsInsertFn).toHaveBeenCalled());
    expect(tradingAccountsInsertFn).toHaveBeenCalled();

    const accountRow: any = tradingAccountsInsertFn.mock.calls[0][0];
    const bindingRow: any = ruleBindingsInsertFn.mock.calls[0][0];

    // The audited binding records what the trader actually submitted...
    expect(bindingRow.account_size_id).toBe(editedSize.id);
    expect(bindingRow.rule_snapshot.accountSize.initialBalance).toBe(editedSize.initialBalance);
    // ...and the trading_accounts row agrees with it, instead of keeping the
    // stale size that came in on the URL.
    expect(accountRow.start_balance).toBe(Number(initialBalanceValue(editedSize.initialBalance)));
    expect(accountRow.start_balance).not.toBe(Number(initialBalanceValue(accountSize.initialBalance)));
    expect(String(accountRow.start_balance)).toBe(
      initialBalanceValue(bindingRow.rule_snapshot.accountSize.initialBalance),
    );
    expect(accountRow.prop_firm).toBe(program.firm);
    expect(accountRow.program).toBe(program.programName);
    expect(accountRow.account_type).toBe(program.programType);
    expect(accountRow.base_currency).toBe(bindingRow.rule_snapshot.accountSize.currency);
  });
});
