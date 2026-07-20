import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import PropFirmLibrary from '../pages/PropFirmLibrary';

function renderLibrary() {
  return render(
    <MemoryRouter>
      <PropFirmLibrary />
    </MemoryRouter>,
  );
}

describe('PropFirmLibrary', () => {
  it('guides the user from prop firm to account-level rules', () => {
    renderLibrary();

    expect(screen.getByRole('heading', { name: 'Biblioteca de Mesas Proprietárias' })).toBeInTheDocument();
    expect(screen.getByTestId('firm-FTMO')).toBeInTheDocument();
    expect(screen.queryByText('Regras de Prop Firms')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('firm-FTMO'));

    const programSelect = screen.getByLabelText('Programa da mesa');
    const twoStepOption = within(programSelect).getByRole('option', { name: 'FTMO Challenge 2-Step' }) as HTMLOptionElement;
    fireEvent.change(programSelect, { target: { value: twoStepOption.value } });

    const accountSelect = screen.getByLabelText('Conta oferecida');
    const accountOption = within(accountSelect).getByRole('option', { name: 'US$ 200 mil' }) as HTMLOptionElement;
    fireEvent.change(accountSelect, { target: { value: accountOption.value } });

    expect(screen.getByRole('heading', { name: /FTMO Challenge 2-Step · US\$ 200 mil/ })).toBeInTheDocument();
    expect(screen.getAllByText('Meta de lucro').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Perda diária').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Perda máxima').length).toBeGreaterThan(0);
    expect(screen.getByText('Regras para não reprovar')).toBeInTheDocument();
    expect(screen.getByText('Limites operacionais')).toBeInTheDocument();
    expect(screen.queryByText(/€/)).not.toBeInTheDocument();
  });

  it('searches firms without mixing the operational account workflow', () => {
    renderLibrary();

    fireEvent.change(screen.getByLabelText('Buscar mesa proprietária'), {
      target: { value: 'Topstep' },
    });

    expect(screen.getByTestId('firm-Topstep')).toBeInTheDocument();
    expect(screen.queryByTestId('firm-FTMO')).not.toBeInTheDocument();
  });

  it('keeps unavailable firms outside the operational account catalog', () => {
    renderLibrary();

    fireEvent.click(screen.getByTestId('firm-MyFundedFX'));

    expect(screen.getByRole('heading', { name: 'Regras operacionais indisponíveis' })).toBeInTheDocument();
    expect(screen.getByLabelText('Conta oferecida')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Cadastrar conta' })).not.toBeInTheDocument();
  });
});
