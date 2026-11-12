import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PricingPage from '../pages/PricingPage';

// Sessão trocada por teste: é ela que decide se /pricing é uma página pública
// (com navbar e rodapé) ou uma tela do produto dentro do AppLayout.
let mockSession: unknown = null;

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockSession ? { id: 'user-1' } : null, session: mockSession }),
}));

function plano(extra: Record<string, unknown>) {
  return { currency: 'brl', plan_features: [], ...extra };
}

const PLANS = [
  plano({
    id: 'beginner_monthly', slug: 'beginner_monthly', name: 'Beginner', price_amount: 29700,
    billing_interval: 'month', account_limit: 1, support_tier: 'basic', stripe_price_id: 'price_beginner',
    plan_features: ['1 conta MT5', 'painel de risco'],
  }),
  plano({
    id: 'advanced_monthly', slug: 'advanced_monthly', name: 'Advanced', price_amount: 99700,
    billing_interval: 'month', account_limit: 3, support_tier: 'standard', stripe_price_id: 'price_advanced',
  }),
  plano({
    id: 'pro_monthly', slug: 'pro_monthly', name: 'Pro', price_amount: 199700,
    billing_interval: 'month', account_limit: 5, support_tier: 'priority', stripe_price_id: 'price_pro',
    highlighted: true, recommended_badge: 'Mais escolhido',
    plan_features: ['ate 5 contas MT5', 'insights avancados'],
  }),
  // Continua no banco para quem já assina, mas saiu da vitrine.
  plano({
    id: 'enterprise_monthly', slug: 'enterprise_monthly', name: 'Enterprise', price_amount: 149700,
    billing_interval: 'month', account_limit: 10, support_tier: 'enterprise', stripe_price_id: 'price_enterprise',
  }),
  plano({
    id: 'beginner_semiannual', slug: 'beginner_semiannual', name: 'Beginner', price_amount: 169700,
    billing_interval: 'semester', account_limit: 1, support_tier: 'basic', stripe_price_id: 'price_beginnersem',
  }),
  plano({
    id: 'advanced_semiannual', slug: 'advanced_semiannual', name: 'Advanced', price_amount: 589700,
    billing_interval: 'semester', account_limit: 3, support_tier: 'standard', stripe_price_id: 'price_advancedsem',
  }),
  plano({
    id: 'pro_semiannual', slug: 'pro_semiannual', name: 'Pro', price_amount: 1189700,
    billing_interval: 'semester', account_limit: 5, support_tier: 'priority', stripe_price_id: 'price_prosem',
  }),
];

// Trocado por teste para simular o banco sem a linha do Pro semestral.
let mockPlans = PLANS;

vi.mock('@/hooks/useSubscriptionPlan', () => ({
  useSubscriptionPlan: () => ({
    plans: mockPlans,
    subscription: null,
    isLoading: false,
    extraAccountQuantity: 0,
    accountLimit: 0,
    activeAccountCount: 0,
    hasActivePlan: false,
  }),
}));

// O NumberFlow anima a troca de valor com um custom element que o jsdom não
// implementa (willUpdate). Aqui só importa o número formatado.
vi.mock('@number-flow/react', () => ({
  default: ({ value, format }: { value: number; format: Intl.NumberFormatOptions }) => (
    <span>{new Intl.NumberFormat('pt-BR', format).format(value)}</span>
  ),
}));

const createGuestCheckoutSession = vi.fn();

vi.mock('@/lib/billing', () => ({
  createCheckoutSession: vi.fn(),
  createAddonCheckoutSession: vi.fn(),
  createGuestCheckoutSession: (...args: unknown[]) => createGuestCheckoutSession(...args),
  isBillingEnabled: () => true,
}));

afterEach(() => {
  mockSession = null;
  mockPlans = PLANS;
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

    // Os valores chegam de price_amount (centavos), não de um texto escrito à mão.
    expect(screen.getByText(/R\$\s?297/)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?997/)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?1\.997/)).toBeInTheDocument();

    expect(screen.getByText('conta MT5 monitorada')).toBeInTheDocument();
    expect(screen.getAllByText('contas MT5 monitoradas').length).toBeGreaterThan(0);
    expect(screen.getByText('Mais escolhido')).toBeInTheDocument();
  });

  it('vende só três planos: o Enterprise saiu da vitrine', () => {
    renderPricing();
    expect(screen.queryByText('Enterprise')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Assinar' })).toHaveLength(3);
  });

  it('mostra a oferta de lançamento no Advanced', () => {
    renderPricing();
    expect(screen.getByText('Oferta de lançamento')).toBeInTheDocument();
    expect(screen.getByText('Preço de lançamento, por tempo limitado.')).toBeInTheDocument();
  });

  it('no semestral, vende os três planos com preço e checkout', () => {
    renderPricing();
    fireEvent.click(screen.getByRole('button', { name: 'Semestral' }));
    expect(screen.getByText(/R\$\s?1\.697/)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?5\.897/)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?11\.897/)).toBeInTheDocument();
    expect(screen.queryByText('A consultar')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Assinar' })).toHaveLength(3);
  });

  it('sem Price ID do Pro semestral no banco, o card dele cai para "A consultar"', () => {
    mockPlans = PLANS.filter((p) => (p as { id?: string }).id !== 'pro_semiannual');
    renderPricing();
    fireEvent.click(screen.getByRole('button', { name: 'Semestral' }));
    expect(screen.getByText(/R\$\s?1\.697/)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?5\.897/)).toBeInTheDocument();
    expect(screen.getByText('A consultar')).toBeInTheDocument();
    const consulta = screen.getByRole('link', { name: /Falar com a equipe/ });
    expect(consulta.getAttribute('href')).toContain('wa.me');
    // Só os dois semestrais com preço têm checkout.
    expect(screen.getAllByRole('button', { name: 'Assinar' })).toHaveLength(2);
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

  it('deslogado, Assinar vai direto para o checkout da Stripe, sem passar pelo login', async () => {
    // Promessa que nunca resolve: o teste só confere a chamada, sem navegar no jsdom.
    createGuestCheckoutSession.mockReturnValue(new Promise(() => {}));
    renderPricing({ variant: 'public' });
    fireEvent.click(screen.getAllByRole('button', { name: 'Assinar' })[0]);
    await waitFor(() => expect(createGuestCheckoutSession).toHaveBeenCalledWith('beginner_monthly', expect.any(Boolean)));
  });

  it('logado, renderiza sem a casca pública e com a mesma oferta', () => {
    mockSession = { user: { id: 'user-1' }, access_token: 'token-1' };
    renderPricing();
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
    expect(screen.getByText('Oferta de lançamento')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Semestral' }));
    expect(screen.getByText(/R\$\s?11\.897/)).toBeInTheDocument();
  });
});
