import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PricingPage from '../pages/PricingPage';

// Sessão trocada por teste: é ela que decide se /pricing é uma página pública
// (com navbar e rodapé) ou uma tela do produto dentro do AppLayout.
let mockSession: unknown = null;

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockSession ? { id: 'user-1' } : null, session: mockSession }),
}));

const PLANS = [
  {
    id: 'beginner_monthly',
    slug: 'beginner_monthly',
    name: 'Beginner',
    price_amount: 9700,
    currency: 'brl',
    billing_interval: 'month',
    account_limit: 1,
    support_tier: 'basic',
    stripe_price_id: 'price_beginner',
    plan_features: ['1 conta MT5', 'painel de risco'],
  },
  {
    id: 'pro_monthly',
    slug: 'pro_monthly',
    name: 'Pro',
    price_amount: 49700,
    currency: 'brl',
    billing_interval: 'month',
    account_limit: 5,
    support_tier: 'priority',
    stripe_price_id: 'price_pro',
    highlighted: true,
    recommended_badge: 'Mais escolhido',
    plan_features: ['ate 5 contas MT5', 'insights avancados'],
  },
];

vi.mock('@/hooks/useSubscriptionPlan', () => ({
  useSubscriptionPlan: () => ({
    plans: PLANS,
    subscription: null,
    isLoading: false,
    extraAccountQuantity: 0,
    accountLimit: 0,
    activeAccountCount: 0,
    hasActivePlan: false,
  }),
}));

vi.mock('@/lib/billing', () => ({
  createCheckoutSession: vi.fn(),
  createAddonCheckoutSession: vi.fn(),
  isBillingEnabled: () => true,
}));

afterEach(() => {
  mockSession = null;
});

function renderPricing(props?: { variant?: 'auto' | 'public' }) {
  return render(
    <MemoryRouter>
      <PricingPage {...props} />
    </MemoryRouter>,
  );
}

describe('PricingPage', () => {
  it('mostra o preço e o limite de contas vindos do catálogo, sem valores fixos no código', () => {
    renderPricing();

    // R$ 97 e R$ 497 chegam de price_amount (centavos), não de um texto escrito à mão.
    expect(screen.getByText(/R\$\s?97/)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?497/)).toBeInTheDocument();

    expect(screen.getByText('conta MT5 monitorada')).toBeInTheDocument();
    expect(screen.getByText('contas MT5 monitoradas')).toBeInTheDocument();
    expect(screen.getByText('Mais escolhido')).toBeInTheDocument();
  });

  it('não repete o limite de contas nem o suporte na lista secundária do card', () => {
    renderPricing();

    // 'ate 5 contas MT5' e '1 conta MT5' já aparecem no bloco de limite; a lista
    // de baixo deve mostrar só o que é novo.
    expect(screen.queryByText('ate 5 contas MT5')).not.toBeInTheDocument();
    expect(screen.queryByText('1 conta MT5')).not.toBeInTheDocument();
    expect(screen.getByText('insights avancados')).toBeInTheDocument();
    expect(screen.getByText('painel de risco')).toBeInTheDocument();
  });

  it('deslogado, ganha a casca pública com navegação e rodapé', () => {
    renderPricing();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    // um link de navegação pública que só existe dentro do PublicShell
    expect(
      screen.getAllByRole('link').some((l) => l.getAttribute('href') === '/vendas/como-funciona'),
    ).toBe(true);
  });

  it('variant=public mantém a casca pública mesmo com sessão ativa', () => {
    // É o que separa /vendas/planos de /pricing: clicar em Planos no menu do
    // site não pode jogar o visitante logado para dentro do produto.
    mockSession = { user: { id: 'user-1' }, access_token: 'token-1' };
    renderPricing({ variant: 'public' });
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(
      screen.getAllByRole('link').some((l) => l.getAttribute('href') === '/vendas/como-funciona'),
    ).toBe(true);
  });

  it('logado, renderiza sem a casca pública — quem dá moldura é o AppLayout', () => {
    mockSession = { user: { id: 'user-1' }, access_token: 'token-1' };
    renderPricing();
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
  });
});
