import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import PropFirmLibrary from '../pages/PropFirmLibrary';

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}{location.search}</div>;
}

function renderLibrary() {
  return render(
    <MemoryRouter initialEntries={['/library']}>
      <Routes>
        <Route path="/library" element={<PropFirmLibrary />} />
        <Route path="/accounts/new" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

function selectFtmoTwoStep() {
  fireEvent.click(screen.getByTestId('firm-FTMO'));
  fireEvent.click(screen.getByTestId('program-ftmo-challenge-2-step-2026'));
}

describe('PropFirmLibrary', () => {
  it('starts with only the prop firm selection', () => {
    renderLibrary();

    expect(screen.getByRole('heading', { name: 'Biblioteca de Mesas Proprietárias' })).toBeInTheDocument();
    expect(screen.getByTestId('firm-step')).toBeInTheDocument();
    expect(screen.getAllByTestId(/^firm-(?!step$)/)).toHaveLength(16);
    expect(screen.queryByTestId('program-step')).not.toBeInTheDocument();
    expect(screen.queryByTestId('account-step')).not.toBeInTheDocument();
    expect(screen.queryByTestId('account-rules')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Conectar essa conta' })).not.toBeInTheDocument();
  });

  it('shows only programs from the selected firm', () => {
    renderLibrary();
    fireEvent.click(screen.getByTestId('firm-FTMO'));

    expect(screen.getByTestId('program-step')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Modelos disponíveis na FTMO' })).toBeInTheDocument();
    expect(screen.getAllByTestId(/^program-(?!step$)/)).toHaveLength(2);
    expect(screen.getByText('FTMO Challenge 1-Step')).toBeInTheDocument();
    expect(screen.getByText('FTMO Challenge 2-Step')).toBeInTheDocument();
    expect(screen.queryByText('Apex Trader Funding')).not.toBeInTheDocument();
    expect(screen.queryByTestId('account-rules')).not.toBeInTheDocument();
  });

  it('shows account sizes only after the program selection', () => {
    renderLibrary();
    selectFtmoTwoStep();

    expect(screen.getByTestId('account-step')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Escolha a conta' })).toBeInTheDocument();
    expect(screen.getByText('US$ 10 mil')).toBeInTheDocument();
    expect(screen.getByText('US$ 200 mil')).toBeInTheDocument();
    expect(screen.queryByTestId('account-rules')).not.toBeInTheDocument();
    expect(screen.queryByText(/€/)).not.toBeInTheDocument();
  });

  it('reveals clean rules and sources only after the account selection', () => {
    renderLibrary();
    selectFtmoTwoStep();
    fireEvent.click(screen.getByRole('button', { name: 'US$ 200 mil' }));

    expect(screen.getByTestId('account-rules')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /FTMO Challenge 2-Step · US\$ 200 mil/ })).toBeInTheDocument();
    expect(screen.getByText('Regras principais')).toBeInTheDocument();
    expect(screen.getByText('Operacional')).toBeInTheDocument();
    expect(screen.getByText('Fortify monitora')).toBeInTheDocument();
    expect(screen.getByText('Fontes oficiais')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Conectar essa conta' })).toBeInTheDocument();
    expect(screen.queryByText(/€/)).not.toBeInTheDocument();
  });

  it('builds the account connection URL from stable identifiers only', () => {
    renderLibrary();
    selectFtmoTwoStep();
    fireEvent.click(screen.getByRole('button', { name: 'US$ 200 mil' }));
    fireEvent.click(screen.getByRole('button', { name: 'Conectar essa conta' }));

    const target = screen.getByTestId('location').textContent ?? '';
    const url = new URL(target, 'http://localhost');
    expect(url.pathname).toBe('/accounts/new');
    expect(url.searchParams.get('propFirmSlug')).toBe('ftmo');
    expect(url.searchParams.get('programSlug')).toBe('ftmo-challenge-2-step-2026');
    expect(url.searchParams.get('accountSizeId')).toBeTruthy();
    expect(url.searchParams.get('platform')).toBe('MT5');
    expect(url.searchParams.get('ruleVersionId')).toBeTruthy();
    expect([...url.searchParams.keys()].sort()).toEqual([
      'accountSizeId',
      'platform',
      'programSlug',
      'propFirmSlug',
      'ruleVersionId',
    ]);
  });

  it('keeps unavailable firms visible but non-operational', () => {
    renderLibrary();

    expect(screen.getByTestId('firm-Fundscap')).toBeDisabled();
    expect(screen.getByTestId('firm-MyFundedFX')).toBeDisabled();
    expect(screen.getByTestId('firm-Fundscap')).toHaveTextContent('Indisponível');
    expect(screen.getByTestId('firm-MyFundedFX')).toHaveTextContent('Indisponível');
    expect(screen.queryByRole('button', { name: 'Conectar essa conta' })).not.toBeInTheDocument();
  });

  it('filters the initial catalog by prop firm name', () => {
    renderLibrary();

    fireEvent.change(screen.getByLabelText('Buscar mesa proprietária'), { target: { value: 'Topstep' } });
    expect(screen.getByTestId('firm-Topstep')).toBeInTheDocument();
    expect(screen.queryByTestId('firm-FTMO')).not.toBeInTheDocument();
  });
});
