import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Dashboard from '../pages/Dashboard';
import type { TradingAccount } from '../types/fortify';

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
    activeAccountCount: 2,
    remainingAccounts: 3,
    hasActivePlan: true,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

const defaultMockAccounts: TradingAccount[] = [
  {
    id: 'acc-safe',
    userId: 'user-1',
    nickname: 'Conta Segura',
    broker: 'Mesa Teste',
    baseCurrency: 'USD',
    startBalance: 100_000,
    currentBalance: 101_000,
    currentEquity: 101_000,
    highestEquityAllTime: 101_000,
    status: 'active',
    ruleSetId: '',
    createdAt: '2026-07-01T00:00:00.000Z',
  },
  {
    id: 'acc-risky',
    userId: 'user-1',
    nickname: 'Conta Arriscada',
    broker: 'Mesa Teste',
    baseCurrency: 'USD',
    startBalance: 100_000,
    currentBalance: 110_000,
    currentEquity: 110_000,
    highestEquityAllTime: 110_000,
    status: 'active',
    ruleSetId: '',
    createdAt: '2026-07-01T00:00:00.000Z',
  },
] as TradingAccount[];

let mockAccounts: TradingAccount[] = defaultMockAccounts;

vi.mock('@/hooks/useAccountsStore', () => ({
  useAccountsStore: () => ({ accounts: mockAccounts, removeAccount: vi.fn() }),
}));

vi.mock('@/hooks/useRuleEvaluations', () => ({
  useAllRuleEvaluations: () => ({ data: [] }),
}));

function rule(overrides: Record<string, unknown> & { key: string }) {
  return {
    label: '',
    status: 'safe',
    monitorability: 'automatic_mt5',
    sourceRule: '',
    currentValue: null,
    limitValue: null,
    remainingValue: null,
    percentage: null,
    currency: 'USD',
    message: '',
    ...overrides,
  };
}

const mockCanonicalByAccount: Record<string, any> = {
  'acc-safe': {
    id: 'row-safe',
    user_id: 'user-1',
    trading_account_id: 'acc-safe',
    mt5_connection_id: null,
    binding_id: 'binding-safe',
    rule_snapshot_hash: 'sha256:safe',
    rule_version_id: 'rules-v1',
    engine_version: 'v1',
    overall_status: 'safe',
    overall_message: '',
    automatic_rules: [
      rule({ key: 'daily_loss', label: 'Perda diária', status: 'safe', currentValue: 1_000, limitValue: 10_000, remainingValue: 9_000, percentage: 10 }),
      rule({ key: 'max_drawdown', label: 'Drawdown máximo', status: 'safe', currentValue: 500, limitValue: 10_000, remainingValue: 9_500, percentage: 5 }),
      rule({ key: 'profit_target', label: 'Meta de lucro', status: 'safe', currentValue: 2_000, limitValue: 10_000 }),
      rule({ key: 'consistency', label: 'Consistência', status: 'not_monitorable' }),
      rule({ key: 'min_trading_days', label: 'Dias mínimos', status: 'not_monitorable' }),
    ],
    manual_rules: [],
    unsupported_rules: [],
    not_calculated_rules: [],
    alerts: [],
    input_summary: {},
    evaluated_at: '2026-07-18T15:00:00.000Z',
  },
  'acc-risky': {
    id: 'row-risky',
    user_id: 'user-1',
    trading_account_id: 'acc-risky',
    mt5_connection_id: null,
    binding_id: 'binding-risky',
    rule_snapshot_hash: 'sha256:risky',
    rule_version_id: 'rules-v1',
    engine_version: 'v1',
    overall_status: 'critical',
    overall_message: '',
    automatic_rules: [
      rule({ key: 'daily_loss', label: 'Perda diária', status: 'critical', currentValue: 9_200, limitValue: 10_000, remainingValue: 800, percentage: 92 }),
      rule({ key: 'max_drawdown', label: 'Drawdown máximo', status: 'safe', currentValue: 5_000, limitValue: 10_000, remainingValue: 5_000, percentage: 50 }),
      rule({ key: 'profit_target', label: 'Meta de lucro', status: 'safe', currentValue: 10_000, limitValue: 10_000 }),
      rule({ key: 'consistency', label: 'Consistência', status: 'not_monitorable' }),
      rule({ key: 'min_trading_days', label: 'Dias mínimos', status: 'safe', currentValue: 4, limitValue: 4 }),
    ],
    manual_rules: [],
    unsupported_rules: [],
    not_calculated_rules: [],
    alerts: [],
    input_summary: {},
    evaluated_at: '2026-07-18T15:00:00.000Z',
  },
};

vi.mock('@/hooks/useCanonicalRuleEvaluations', () => ({
  useLatestCanonicalEvaluations: () => ({ data: mockCanonicalByAccount }),
}));

const defaultMockActiveBindings = [
  { id: 'binding-safe', trading_account_id: 'acc-safe', rule_snapshot: { propFirm: { name: 'FTMO' } } },
  { id: 'binding-risky', trading_account_id: 'acc-risky', rule_snapshot: { propFirm: { name: 'Hantec Trader' } } },
];

let mockActiveBindings: any[] = defaultMockActiveBindings;

vi.mock('@/lib/ruleBinding', () => ({
  fetchActiveRuleBindings: () => Promise.resolve(mockActiveBindings),
}));

afterEach(() => {
  mockAccounts = defaultMockAccounts;
  mockActiveBindings = defaultMockActiveBindings;
});

// `order()` precisa ser awaitable diretamente (mt5_connections/positions/
// snapshots) E aceitar um `.limit()` encadeado depois (account_rule_
// evaluations) — um Promise resolvido com `.limit` anexado cobre os dois
// formatos de chamada com um único mock genérico.
function emptyResult() {
  return Object.assign(Promise.resolve({ data: [], error: null }), {
    limit: () => Promise.resolve({ data: [], error: null }),
  });
}

const supabaseChain = {
  eq: () => supabaseChain,
  in: () => supabaseChain,
  gte: () => supabaseChain,
  order: () => emptyResult(),
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({ select: () => supabaseChain }),
  },
}));

function renderDashboard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/']}>
        <Dashboard />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Dashboard account bubbles', () => {
  it('sorts bubbles with the riskiest account (smallest buffer) first', async () => {
    renderDashboard();
    const riskyHeading = await screen.findByText('Conta Arriscada');
    const safeHeading = screen.getByText('Conta Segura');
    expect(riskyHeading.compareDocumentPosition(safeHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('renders a proportional urgency bar for a rule with a known percentage', async () => {
    renderDashboard();
    const riskyCard = (await screen.findByText('Conta Arriscada')).closest('div.rounded-xl') as HTMLElement;
    const dailyRow = within(riskyCard).getByText('Drawdown diário restante');
    const bar = dailyRow.closest('.space-y-1')?.querySelector('div[style]') as HTMLElement | null;
    expect(bar).not.toBeNull();
    expect(bar?.style.width).toBe('92%');
  });

  it('never renders an urgency bar for Perda flutuante (no independent limit)', async () => {
    renderDashboard();
    const riskyCard = (await screen.findByText('Conta Arriscada')).closest('div.rounded-xl') as HTMLElement;
    const floatRow = within(riskyCard).getByText('Perda flutuante');
    const bar = floatRow.closest('.space-y-1')?.querySelector('div[style]');
    expect(bar).toBeFalsy();
  });

  it('shows the payout eligibility composite, honestly distinguishing eligible from not-determinable', async () => {
    renderDashboard();
    const riskyCard = (await screen.findByText('Conta Arriscada')).closest('div.rounded-xl') as HTMLElement;
    const safeCard = screen.getByText('Conta Segura').closest('div.rounded-xl') as HTMLElement;
    // acc-risky: meta e dias mínimos cumpridos, nada violado alem da perda
    // diária crítica (que não bloqueia a elegibilidade de saque) — elegível.
    expect(within(riskyCard).getByText('Elegível para saque')).toBeInTheDocument();
    // acc-safe: dias mínimos not_monitorable — não pode assumir "cumprido".
    expect(within(safeCard).getByText('Não verificável')).toBeInTheDocument();
  });
});

describe('Dashboard daily risk budget', () => {
  it('headlines the tightest loss rule for each account', async () => {
    renderDashboard();
    const riskyCard = (await screen.findByText('Conta Arriscada')).closest('div.rounded-xl') as HTMLElement;
    // acc-risky: dailyRemaining=800 é mais apertado que drawdownRemaining=5000.
    expect(
      within(riskyCard).getByText((_, element) => {
        const text = element?.textContent || '';
        return element?.tagName === 'P' && text.includes('Resta') && text.includes('800') && text.includes('Perda diária');
      }),
    ).toBeInTheDocument();

    const safeCard = screen.getByText('Conta Segura').closest('div.rounded-xl') as HTMLElement;
    // acc-safe: dailyRemaining=9000 é mais apertado que drawdownRemaining=9500.
    expect(
      within(safeCard).getByText((_, element) => {
        const text = element?.textContent || '';
        return element?.tagName === 'P' && text.includes('Resta') && text.includes('9.000') && text.includes('Perda diária');
      }),
    ).toBeInTheDocument();
  });
});

describe('Dashboard per-firm aggregation', () => {
  it('shows a tab per distinct firm and filters the bubble grid on click', async () => {
    renderDashboard();
    await screen.findByText('Conta Arriscada');
    expect(screen.getByRole('button', { name: 'Todas as mesas' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'FTMO' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hantec Trader' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'FTMO' }));

    expect(screen.getByText('Conta Segura')).toBeInTheDocument();
    expect(screen.queryByText('Conta Arriscada')).not.toBeInTheDocument();
  });

  it('detects the firm from account text when there is no rule binding yet (regression: fast-connect accounts)', async () => {
    // Reproduz o bug real: conta conectada pelo fluxo rápido, sem vínculo de
    // regra ainda — nem rule_snapshot.propFirm, nem detectedPropFirm (o
    // detector do gateway só cobre 4 mesas por substring). O único sinal
    // disponível é o texto que o trader já digitou (apelido/corretora).
    mockActiveBindings = [];
    mockAccounts = [
      {
        id: 'acc-ftmo-fast',
        userId: 'user-1',
        nickname: 'FTMO Challenge 100K',
        broker: '',
        baseCurrency: 'USD',
        startBalance: 100_000,
        currentBalance: 101_000,
        currentEquity: 101_000,
        highestEquityAllTime: 101_000,
        status: 'active',
        ruleSetId: '',
        createdAt: '2026-07-01T00:00:00.000Z',
      },
      {
        id: 'acc-hantec-fast',
        userId: 'user-1',
        nickname: 'Hantec Express Financiada',
        broker: '',
        baseCurrency: 'USD',
        startBalance: 50_000,
        currentBalance: 50_500,
        currentEquity: 50_500,
        highestEquityAllTime: 50_500,
        status: 'active',
        ruleSetId: '',
        createdAt: '2026-07-01T00:00:00.000Z',
      },
    ] as TradingAccount[];

    renderDashboard();
    await screen.findByText('FTMO Challenge 100K');

    expect(screen.getByRole('button', { name: 'FTMO' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hantec Trader' })).toBeInTheDocument();
  });
});

describe('Dashboard account detail disclosure', () => {
  it('toggles open to reveal the heatmap, ETA projection and audit history sections', async () => {
    renderDashboard();
    const safeCard = (await screen.findByText('Conta Segura')).closest('div.rounded-xl') as HTMLElement;
    const toggle = within(safeCard).getByRole('button', { name: /Ver detalhes/ });
    fireEvent.click(toggle);

    await within(safeCard).findByText('Dias operados (12 semanas)');
    // Sem conexão MT5 mockada: honesto em dizer que não dá pra calcular, em
    // vez de desenhar um heatmap vazio como se fosse dado real.
    expect(within(safeCard).getByText('Sem conexão MT5 ativa para calcular dias operados.')).toBeInTheDocument();
    // Meta não atingida (2.000 de 10.000) e sem trades no mock: insuficiente
    // pra estimar, nunca um "~0 dias" fabricado.
    expect(within(safeCard).getByText(/Histórico recente insuficiente para estimar/)).toBeInTheDocument();
    // Vinculada ao catálogo oficial, mas sem avaliação histórica no mock.
    expect(within(safeCard).getByText('Nenhuma avaliação registrada ainda.')).toBeInTheDocument();
  });
});
