import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import SalesLandingPage from '../pages/SalesLandingPage';
import { SUPPORT_WHATSAPP_URL } from '../lib/support';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, session: null }),
}));

function renderLanding() {
  return render(
    <MemoryRouter initialEntries={['/vendas']}>
      <SalesLandingPage />
    </MemoryRouter>,
  );
}

const hrefs = (name: RegExp) => screen.getAllByRole('link', { name }).map((el) => el.getAttribute('href'));

describe('landing de vendas', () => {
  it('abre com o posicionamento do Fortify', () => {
    renderLanding();
    expect(
      screen.getByRole('heading', { level: 1, name: /Proteja sua conta.*antes da próxima operação/i }),
    ).toBeInTheDocument();
  });

  it('leva cada CTA para a rota correta', () => {
    renderLanding();
    expect(new Set(hrefs(/^Criar conta/i))).toEqual(new Set(['/auth?intent=signup']));
    expect(new Set(hrefs(/^Ver planos/i))).toEqual(new Set(['/vendas/planos']));
    expect(hrefs(/^Entrar$/i)).toContain('/auth');
    expect(hrefs(/^Escolher plano$/i)).toEqual(['/pricing']);
    expect(screen.getByRole('link', { name: /Falar com suporte/i })).toHaveAttribute('href', SUPPORT_WHATSAPP_URL);
  });

  it('navega só pelas rotas públicas existentes', () => {
    renderLanding();
    const nav = screen.getByRole('navigation', { name: 'Navegação principal' });
    const routes = within(nav)
      .getAllByRole('link')
      .map((el) => el.getAttribute('href'));
    for (const route of [
      '/vendas/como-funciona',
      '/vendas/recursos',
      '/vendas/mesas',
      '/vendas/planos',
      '/vendas/faq',
      '/vendas/quem-somos',
    ]) {
      expect(routes).toContain(route);
    }
    const external = screen
      .getAllByRole('link')
      .map((el) => el.getAttribute('href') ?? '')
      .filter((href) => /^https?:/.test(href));
    expect(external).toEqual([SUPPORT_WHATSAPP_URL]);
  });

  it('rotula os feedbacks como demonstração e não simula avaliações', () => {
    const { container } = renderLanding();
    expect(screen.getByText('Feedbacks de demonstração')).toBeInTheDocument();
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/trustpilot|★|estrelas|\d(,\d)?\s*\/\s*5/i);
  });

  it('usa o print local da calculadora de risco', () => {
    renderLanding();
    const shot = screen.getByRole('img', { name: /Tela real da Calculadora de Risco/i });
    expect(shot.getAttribute('src')).toMatch(/fortify-risk-calculator-desktop/);
  });
});
