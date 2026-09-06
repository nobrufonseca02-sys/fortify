import { Suspense } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthGuard } from '../App';
import { AUTH_SIGNUP_PATH } from '../components/landing/PublicShell';

/**
 * Guarda do bug: os CTAs de cadastro do site levavam para /auth, e o AuthGuard
 * mandava quem já tinha sessão direto para o painel. Ou seja, clicar em
 * "Criar conta" no site abria o produto em vez da tela de autenticação.
 */

let mockSession: unknown = null;

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockSession ? { id: 'user-1' } : null, session: mockSession }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// A tela de auth de verdade puxa Supabase; aqui só interessa se ela é montada.
vi.mock('../pages/AuthPage', () => ({
  default: () => <div data-testid="tela-de-auth">tela de auth</div>,
}));

function renderEm(rota: string) {
  return render(
    // Suspense porque AuthPage é lazy em App.tsx: sem a fronteira o React
    // devolve o fallback e o teste não veria a tela.
    <MemoryRouter initialEntries={[rota]}>
      <Suspense fallback={<div>carregando</div>}>
      <Routes>
        <Route path="/auth" element={<AuthGuard />} />
        <Route path="/" element={<div data-testid="painel">painel do Fortify</div>} />
        <Route path="/pricing" element={<div data-testid="pricing">pricing</div>} />
        <Route path="/vendas/planos" element={<div data-testid="planos">planos</div>} />
      </Routes>
      </Suspense>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  window.sessionStorage.clear();
});

afterEach(() => {
  mockSession = null;
  window.sessionStorage.clear();
});

describe('AuthGuard', () => {
  it('sem sessão, abre a tela de autenticação', async () => {
    renderEm('/auth');
    expect(await screen.findByTestId('tela-de-auth')).toBeInTheDocument();
  });

  it('com sessão e sem pedido explícito, leva para o painel', () => {
    mockSession = { user: { id: 'user-1' }, access_token: 'token-1' };
    renderEm('/auth');
    expect(screen.getByTestId('painel')).toBeInTheDocument();
    expect(screen.queryByTestId('tela-de-auth')).not.toBeInTheDocument();
  });

  it('com sessão E pedido explícito, ainda abre a tela de autenticação', async () => {
    mockSession = { user: { id: 'user-1' }, access_token: 'token-1' };
    renderEm('/auth?intent=signup');
    expect(await screen.findByTestId('tela-de-auth')).toBeInTheDocument();
    expect(screen.queryByTestId('painel')).not.toBeInTheDocument();
  });

  it('o CTA de cadastro do site aponta para a rota com o pedido explícito', () => {
    // Se alguém trocar isto de volta por '/auth', o botão volta a cair no painel.
    expect(AUTH_SIGNUP_PATH).toBe('/auth?intent=signup');
    expect(new URLSearchParams(AUTH_SIGNUP_PATH.split('?')[1]).has('intent')).toBe(true);
  });

  it('checkout pendente continua retomando na página onde começou', () => {
    mockSession = { user: { id: 'user-1' }, access_token: 'token-1' };
    window.sessionStorage.setItem('intended_plan_slug', 'pro_monthly');
    window.sessionStorage.setItem('fortify_checkout_return_path', '/vendas/planos');
    renderEm('/auth');
    expect(screen.getByTestId('planos')).toBeInTheDocument();
  });

  it('rota de retorno desconhecida cai em /pricing, sem redirecionamento aberto', () => {
    mockSession = { user: { id: 'user-1' }, access_token: 'token-1' };
    window.sessionStorage.setItem('intended_plan_slug', 'pro_monthly');
    window.sessionStorage.setItem('fortify_checkout_return_path', 'https://exemplo-externo.com');
    renderEm('/auth');
    expect(screen.getByTestId('pricing')).toBeInTheDocument();
  });
});
