import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AccountRules from '../pages/AccountRules';

function programCard(name: string) {
  const heading = screen.getByRole('heading', { name });
  const card = heading.closest('article');

  if (!card) throw new Error(`Card não encontrado: ${name}`);
  return within(card);
}

describe('AccountRules', () => {
  it('searches and filters the expanded rules dataset', () => {
    render(<AccountRules />);

    fireEvent.change(screen.getByPlaceholderText('Buscar por mesa, programa ou mercado'), {
      target: { value: 'ASAP Funding Prop' },
    });

    expect(screen.getByRole('heading', { name: 'Challenge Express' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Funded Express' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Instant Account' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Standard - MT5' })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Mesa'), { target: { value: 'NP Future' } });
    expect(screen.getByText('0 programas encontrados')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Buscar por mesa, programa ou mercado'), {
      target: { value: '' },
    });
    expect(screen.getByText('6 programas encontrados')).toBeInTheDocument();
  });

  it('opens audited details and exposes the official conflict resolution', () => {
    render(<AccountRules />);

    fireEvent.click(programCard('Standard - MT5').getByRole('button', { name: 'Ver detalhes' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Conflitos de fonte registrados')).toBeInTheDocument();
    expect(screen.getByText(/Valor adotado: \$3,600/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Regulamento NPFuture/ })).toHaveAttribute('href', 'https://npfuture.com/regulamento/');
  });

  it('compares up to three programs and disables a fourth selection', () => {
    render(<AccountRules />);

    fireEvent.click(programCard('Challenge Express').getByRole('button', { name: 'Comparar' }));
    fireEvent.click(programCard('Standard - MT5').getByRole('button', { name: 'Comparar' }));
    fireEvent.click(programCard('Flash - MT5').getByRole('button', { name: 'Comparar' }));

    expect(screen.getByText('3/3 selecionados')).toBeInTheDocument();
    expect(programCard('Funded - MT5').getByRole('button', { name: 'Comparar' })).toBeDisabled();
  });

  it('searches nested account-level fields and renders expanded account rows', () => {
    render(<AccountRules />);

    const searchInput = screen.getByPlaceholderText('Buscar por mesa, programa ou mercado');

    fireEvent.change(searchInput, {
      target: { value: 'US$95/mês' },
    });

    expect(screen.getByRole('heading', { name: 'Trading Combine' })).toBeInTheDocument();
    expect(screen.getByText('1 programas encontrados')).toBeInTheDocument();

    fireEvent.change(searchInput, {
      target: { value: '$200K' },
    });
    expect(screen.getByRole('heading', { name: 'FTMO Challenge 2-Step' })).toBeInTheDocument();

    fireEvent.change(searchInput, {
      target: { value: '$3,600' },
    });
    expect(screen.getByRole('heading', { name: 'Standard - MT5' })).toBeInTheDocument();

    fireEvent.change(searchInput, {
      target: { value: '8% trailing' },
    });
    expect(screen.getByRole('heading', { name: 'Instant Funding' })).toBeInTheDocument();

    fireEvent.change(searchInput, {
      target: { value: 'BlackArrow' },
    });
    expect(screen.getByRole('heading', { name: 'Standard - BlackArrow' })).toBeInTheDocument();

    fireEvent.change(searchInput, {
      target: { value: '' },
    });
    fireEvent.click(programCard('FTMO Challenge 2-Step').getByRole('button', { name: 'Ver detalhes' }));

    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByText('$200K')).toBeInTheDocument();
    expect(dialog.getAllByText(/Fase 1: 10%/).length).toBeGreaterThan(0);
  });

  it('marks unavailable firms as non-operational and excludes them from comparison', () => {
    render(<AccountRules />);

    const unavailableCard = programCard('Operação encerrada - catálogo indisponível');

    expect(unavailableCard.getByText('Indisponível')).toBeInTheDocument();
    expect(unavailableCard.getByRole('button', { name: 'Não operacional' })).toBeDisabled();

    fireEvent.click(unavailableCard.getByRole('button', { name: 'Ver status' }));

    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getAllByText('Não aplicável').length).toBeGreaterThan(0);
  });
});
