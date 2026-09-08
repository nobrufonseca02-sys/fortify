import { Suspense } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthGuard, eRotaDoProduto } from '../App';
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

function arvore(rota: string) {
  return (
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
    </MemoryRouter>
  );
}

function renderEm(rota: string) {
  return render(arvore(rota));
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

  it('quem autentica NA tela com pedido explícito segue adiante, não fica preso', async () => {
    // Este é o beco sem saída que o parâmetro criava: o CTA do site levava
    // para /auth?intent=signup, a pessoa entrava ali e continuava vendo o
    // mesmo formulário, porque o `intent` fica na URL a viagem inteira.
    const { rerender } = renderEm(AUTH_SIGNUP_PATH);
    expect(await screen.findByTestId('tela-de-auth')).toBeInTheDocument();

    // A sessão aparece com a tela já montada: o login aconteceu AQUI.
    mockSession = { user: { id: 'user-1' }, access_token: 'token-1' };
    rerender(arvore(AUTH_SIGNUP_PATH));

    expect(await screen.findByTestId('painel')).toBeInTheDocument();
    expect(screen.queryByTestId('tela-de-auth')).not.toBeInTheDocument();
  });

  it('rota de retorno desconhecida cai em /pricing, sem redirecionamento aberto', () => {
    mockSession = { user: { id: 'user-1' }, access_token: 'token-1' };
    window.sessionStorage.setItem('intended_plan_slug', 'pro_monthly');
    window.sessionStorage.setItem('fortify_checkout_return_path', 'https://exemplo-externo.com');
    renderEm('/auth');
    expect(screen.getByTestId('pricing')).toBeInTheDocument();
  });
});

/**
 * Guarda da classificação de rotas de quem NÃO tem sessão.
 *
 * Antes, qualquer URL fora do site virava a tela de login: um link de anúncio
 * errado ou antigo mostrava um muro de senha em vez de dizer que a página não
 * existe. Agora só rota que existe no produto pede login — e é esta função que
 * decide, então ela precisa acertar as rotas com parâmetro também.
 */
describe('eRotaDoProduto', () => {
  it('reconhece as rotas do produto, inclusive as com parâmetro', () => {
    for (const rota of [
      '/',
      '/dashboard',
      '/accounts',
      '/accounts/new',
      '/accounts/abc-123',
      '/accounts/abc-123/checklist',
      '/accounts/abc-123/rules',
      '/risk-calculator',
      '/mt5',
      '/mt5/conexao-9',
      '/settings',
      '/subscription',
      '/adm',
    ]) {
      expect(eRotaDoProduto(rota), `${rota} deveria pedir login`).toBe(true);
    }
  });

  it('não reconhece URL inventada, que tem de virar 404 e não tela de senha', () => {
    for (const rota of [
      '/promo-antiga-do-anuncio',
      '/vendas/campanha-que-nao-existe',
      '/accounts/abc/rota-inventada',
      '/dashboard/sub-rota-inexistente',
      '/adm/usuarios',
    ]) {
      expect(eRotaDoProduto(rota), `${rota} não deveria pedir login`).toBe(false);
    }
  });
});
