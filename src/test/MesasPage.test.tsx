import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import MesasPage from '../pages/landing/MesasPage';
import { firmPrograms, getFirmStatus } from '../lib/propFirmSummary';
import { propFirmFilterOptions } from '../data/propFirmRules';
import { firmLogos, isShownInPublicCarousels } from '../data/firmLogos';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, session: null }),
}));

/** Mesma regra da página: operacional e com logo de primeira mão. */
const featured = propFirmFilterOptions.firms.filter(
  (name) => getFirmStatus(firmPrograms(name)) === 'operational' && firmLogos[name] && isShownInPublicCarousels(name),
);

function renderPage() {
  return render(
    <MemoryRouter>
      <MesasPage />
    </MemoryRouter>,
  );
}

/** Nomes dos modelos com regra auditada de uma mesa. */
function modelNames(firm: string) {
  return firmPrograms(firm as never)
    .filter((program) => (program.accountLevelRules ?? []).length > 0)
    .map((program) => program.programName);
}

describe('MesasPage', () => {
  it('o carrossel traz uma mesa por card, na ordem do catálogo', () => {
    renderPage();
    const cards = document.querySelectorAll('[data-cf-index]');
    expect(cards).toHaveLength(featured.length);
    expect(featured.length).toBeGreaterThan(3);
    expect(screen.getByAltText(`Logo ${featured[0]}`)).toBeInTheDocument();
  });

  it('abre com os dados da primeira mesa e de mais nenhuma', () => {
    renderPage();

    expect(screen.getByRole('heading', { level: 2, name: featured[0] })).toBeInTheDocument();

    for (const name of modelNames(featured[0])) {
      expect(screen.getByRole('heading', { level: 3, name })).toBeInTheDocument();
    }

    // Os modelos de outra mesa não podem estar na página ao mesmo tempo.
    const outra = featured.find((name) => modelNames(name).length > 0 && name !== featured[0])!;
    for (const name of modelNames(outra)) {
      expect(screen.queryByRole('heading', { level: 3, name })).not.toBeInTheDocument();
    }
  });

  it('clicar num card troca os dados exibidos para os daquela mesa', async () => {
    renderPage();

    const alvoIndex = featured.findIndex(
      (name, i) => i > 0 && modelNames(name).length > 0 && modelNames(name)[0] !== modelNames(featured[0])[0],
    );
    expect(alvoIndex).toBeGreaterThan(0);
    const alvo = featured[alvoIndex];

    const card = document.querySelector(`[data-cf-index="${alvoIndex}"]`)!;
    fireEvent.pointerDown(card);
    fireEvent.click(card);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: alvo })).toBeInTheDocument();
    });

    // e os modelos da mesa anterior saíram
    for (const name of modelNames(featured[0])) {
      if (modelNames(alvo).includes(name)) continue;
      expect(screen.queryByRole('heading', { level: 3, name })).not.toBeInTheDocument();
    }
    for (const name of modelNames(alvo)) {
      expect(screen.getByRole('heading', { level: 3, name })).toBeInTheDocument();
    }
  });

  it('não anuncia como plataforma um texto que é frase, e não nome', () => {
    renderPage();
    const plataformas = screen.getByText('Plataformas').parentElement?.textContent ?? '';
    expect(plataformas).not.toMatch(/suportadas pela/i);
  });

  it('o carrossel cobre o catálogo, menos as mesas ocultas do site, e o título conta o catálogo', () => {
    renderPage();
    // Hoje todas as mesas do catálogo são operacionais e têm logo; só as
    // listadas em HIDDEN_FROM_PUBLIC_CAROUSELS ficam fora do carrossel.
    const visiveis = propFirmFilterOptions.firms.filter((name) => isShownInPublicCarousels(name));
    expect(featured).toHaveLength(visiveis.length);
    expect(featured).not.toContain('ASAP Funding Prop');
    expect(screen.queryByAltText('Logo ASAP Funding Prop')).not.toBeInTheDocument();
    // O título conta as mesas suportadas, não só as que aparecem no carrossel.
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: new RegExp(`^${propFirmFilterOptions.firms.length} mesas proprietárias`),
      }),
    ).toBeInTheDocument();
  });
});
