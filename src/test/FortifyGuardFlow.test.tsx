import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import FortifyGuardPage from '@/pages/FortifyGuardPage';
import { GuardAccountSheet } from '@/components/library/GuardAccountSheet';
import { eaAccountStatus } from '@/lib/guardStatus';
import { propFirmRulePrograms } from '@/data/propFirmRules';

let mockHasActivePlan = true;
const createGuardAccount = vi.fn().mockResolvedValue({ tradingAccountId: 'account-new' });

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-a' }, session: { access_token: 'token-a' } }),
}));

vi.mock('@/hooks/useSubscriptionPlan', () => ({
  useSubscriptionPlan: () => ({ hasActivePlan: mockHasActivePlan, isLoading: false }),
}));

vi.mock('@/lib/guardAccount', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/guardAccount')>();
  return { ...actual, createGuardAccount: (...args: unknown[]) => createGuardAccount(...args) };
});

const tables: Record<string, any> = {
  trading_accounts: [
    { id: 'acc-1', nickname: 'Conta principal', mt5_login: '50123487', ea_status: 'linked', ea_last_seen_at: new Date().toISOString() },
    { id: 'acc-2', nickname: 'Conta funded', mt5_login: '', ea_status: 'pending', ea_last_seen_at: null },
  ],
  account_rule_bindings: [
    {
      trading_account_id: 'acc-1',
      rule_snapshot: { propFirm: { name: 'FTMO' }, program: { name: 'FTMO Challenge 2-Step' }, accountSize: { label: '$100K' } },
    },
  ],
  ea_access_tokens: null,
};

vi.mock('@/integrations/supabase/client', () => {
  const from = (table: string) => {
    const result = () => Promise.resolve({ data: tables[table], error: null });
    const chain: any = {
      select: () => chain,
      eq: () => chain,
      not: () => chain,
      is: () => chain,
      order: () => result(),
      maybeSingle: () => result(),
      then: (resolve: any, reject: any) => result().then(resolve, reject),
    };
    return chain;
  };
  return { supabase: { from } };
});

afterEach(() => {
  mockHasActivePlan = true;
  createGuardAccount.mockClear();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <FortifyGuardPage />
    </MemoryRouter>,
  );
}

describe('Fortify Guard: página do EA', () => {
  it('quem assina vê os 3 passos e o status de cada conta', async () => {
    renderPage();
    expect(screen.getByRole('button', { name: /Baixar para Windows/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Gerar minha chave/ })).toBeEnabled();
    await waitFor(() => expect(screen.getByText('Conta principal')).toBeInTheDocument());
    expect(screen.getByText('FTMO · FTMO Challenge 2-Step · $100K')).toBeInTheDocument();
    expect(screen.getByText('Conectado')).toBeInTheDocument();
    expect(screen.getByText('Aguardando o EA')).toBeInTheDocument();
  });

  it('sem plano, o download e a chave ficam bloqueados com o convite para assinar', async () => {
    mockHasActivePlan = false;
    renderPage();
    expect(screen.getByText('Disponível a partir do plano Beginner')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver planos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Baixar para Windows/, hidden: true })).toBeDisabled();
  });
});

describe('status do EA numa conta', () => {
  const now = Date.parse('2026-11-12T15:00:00Z');
  it('aguardando, conectado ou desligado pelo último sinal', () => {
    expect(eaAccountStatus({ ea_status: 'pending', ea_last_seen_at: null }, now).label).toBe('Aguardando o EA');
    expect(eaAccountStatus({ ea_status: 'linked', ea_last_seen_at: '2026-11-12T14:59:30Z' }, now).label).toBe('Conectado');
    expect(eaAccountStatus({ ea_status: 'linked', ea_last_seen_at: '2026-11-12T14:50:00Z' }, now).label).toBe('EA desligado');
  });
});

describe('Biblioteca: usar este modelo', () => {
  const ftmo = propFirmRulePrograms.find((program) => program.firmSlug === 'ftmo' && program.accountLevelRules?.length);

  it('o aceite das regras oficiais começa desmarcado e trava o botão até o trader marcar', async () => {
    expect(ftmo).toBeTruthy();
    render(
      <MemoryRouter>
        <GuardAccountSheet open onOpenChange={() => {}} program={ftmo!} />
      </MemoryRouter>,
    );
    const checkbox = await screen.findByRole('checkbox', { name: 'Li as regras oficiais desta mesa' });
    const create = screen.getByRole('button', { name: 'Criar conta e conectar pelo Fortify Guard' });
    expect(checkbox).toHaveAttribute('data-state', 'unchecked');
    expect(create).toBeDisabled();

    fireEvent.click(checkbox);
    expect(create).toBeEnabled();
    fireEvent.click(create);
    await waitFor(() => expect(createGuardAccount).toHaveBeenCalledTimes(1));
    expect(createGuardAccount.mock.calls[0][0]).toMatchObject({ userId: 'user-a', acknowledged: true });
  });
});
