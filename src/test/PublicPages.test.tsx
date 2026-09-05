import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import ComoFuncionaPage from '../pages/landing/ComoFuncionaPage';
import QuemSomosPage from '../pages/landing/QuemSomosPage';

// A navbar pública consulta a sessão só para decidir entre "Entrar" e
// "Ir para o painel" — visitante deslogado é o caso que estas páginas atendem.
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, session: null }),
}));

function renderPublic(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('páginas públicas', () => {
  it('a página Quem somos abre com a headline e o aviso legal', () => {
    renderPublic(<QuemSomosPage />);

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /Controle o risco antes que o mercado controle sua conta/i,
      }),
    ).toBeInTheDocument();

    // O disclaimer não é decorativo: sustenta que a página não promete resultado.
    expect(screen.getByText(/não garante aprovação em nenhum desafio/i)).toBeInTheDocument();
  });

  it('a página Como usar lista os sete passos em ordem', () => {
    renderPublic(<ComoFuncionaPage />);

    const steps = screen.getAllByText(/^Passo \d$/);
    expect(steps).toHaveLength(7);
    expect(steps.map((el) => el.textContent)).toEqual([
      'Passo 1',
      'Passo 2',
      'Passo 3',
      'Passo 4',
      'Passo 5',
      'Passo 6',
      'Passo 7',
    ]);

    expect(screen.getByRole('heading', { level: 2, name: /Escolha sua mesa/i })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: /Conecte sua conta MT5/i }),
    ).toBeInTheDocument();
  });

  it('as páginas públicas compartilham a mesma navegação e o mesmo rodapé', () => {
    const { unmount } = renderPublic(<QuemSomosPage />);
    const navLinks = screen
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'))
      .filter(Boolean);
    expect(navLinks).toEqual(expect.arrayContaining(['/vendas/como-funciona', '/pricing', '/blog']));
    unmount();

    renderPublic(<ComoFuncionaPage />);
    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByText(/não é corretora/i)).toBeInTheDocument();
  });

  it('não expõe o MetaApi como produto na jornada do cliente', () => {
    renderPublic(<ComoFuncionaPage />);
    expect(document.body.textContent).not.toMatch(/metaapi/i);
  });
});
