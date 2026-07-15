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
});
