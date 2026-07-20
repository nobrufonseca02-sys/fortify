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

    fireEvent.change(screen.getByLabelText('Buscar mesa, programa, conta ou regra'), {
      target: { value: 'Topstep' },
    });

    expect(screen.getByTestId('firm-Topstep')).toBeInTheDocument();
    expect(screen.queryByTestId('firm-FTMO')).not.toBeInTheDocument();
  });

  it('searches by program, platform, account size and risk rule', () => {
    renderLibrary();
    const search = screen.getByLabelText('Buscar mesa, programa, conta ou regra');

    fireEvent.change(search, { target: { value: 'FTMO Challenge 2-Step' } });
    expect(screen.getByTestId('firm-FTMO')).toBeInTheDocument();

    fireEvent.change(search, { target: { value: 'US$ 200 mil' } });
    expect(screen.getByTestId('firm-FTMO')).toBeInTheDocument();

    fireEvent.change(search, { target: { value: 'MT5' } });
    expect(screen.getAllByText('Operacional').length).toBeGreaterThan(0);

    fireEvent.change(search, { target: { value: 'daily loss' } });
    expect(screen.getByTestId('firm-FTMO')).toBeInTheDocument();
  });

  it('exposes all canonical firms and separates unavailable coverage', () => {
    renderLibrary();

    expect(screen.getByText('Mesas operacionais')).toBeInTheDocument();
    expect(screen.getByText('Cobertura histórica ou indisponível')).toBeInTheDocument();
    expect(screen.getAllByTestId(/^firm-/)).toHaveLength(16);
    expect(screen.getByTestId('firm-Fundscap')).toHaveTextContent('Indisponível');
    expect(screen.getByTestId('firm-MyFundedFX')).toHaveTextContent('Indisponível');
  });

  it('keeps unavailable firms outside the operational account catalog', () => {
    renderLibrary();

    fireEvent.click(screen.getByTestId('firm-MyFundedFX'));

    expect(screen.getByRole('heading', { name: 'Regras operacionais indisponíveis' })).toBeInTheDocument();
    expect(screen.getByLabelText('Conta oferecida')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Cadastrar conta' })).not.toBeInTheDocument();
  });

  it('shows program context and the critical account rules', () => {
    renderLibrary();
    fireEvent.click(screen.getByTestId('firm-FTMO'));

    expect(screen.getByTestId('program-summary')).toHaveTextContent('Principal risco');
    expect(screen.getByTestId('program-summary')).toHaveTextContent('Plataformas');
    expect(screen.getAllByText('Alavancagem').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Principal risco').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Cadastrar conta' })).toBeInTheDocument();
  });
});
