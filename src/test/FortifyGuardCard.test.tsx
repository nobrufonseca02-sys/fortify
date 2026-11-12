import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { FortifyGuardCard } from '@/components/rules/FortifyGuardCard';
import { binding } from '../../services/metaapi-gateway/src/testFixtures';

const upsert = vi.fn().mockResolvedValue({ error: null });

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-a' }, session: { access_token: 'token-a' } }),
}));

vi.mock('@/integrations/supabase/client', () => {
  const chain: any = {
    select: () => chain,
    eq: () => chain,
    is: () => chain,
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    upsert: (...args: unknown[]) => upsert(...args),
  };
  return { supabase: { from: () => chain } };
});

afterEach(() => upsert.mockClear());

function renderCard() {
  return render(
    <MemoryRouter>
      <FortifyGuardCard accountId="account-a" binding={alphaLikeBinding()} />
    </MemoryRouter>,
  );
}

function alphaLikeBinding() {
  const row = binding();
  const rules = row.rule_snapshot.criticalRules;
  rules.minTradingDays = '3 dias por fase; sem prazo máximo; inatividade em 30 dias';
  rules.consistencyRule = 'Sem consistência na avaliação; payout on-demand exige Best Day de 40% e 2% de lucro bruto';
  rules.newsRule = 'Avaliação livre; Qualified proíbe execução em ±2 minutos de eventos direcionados';
  rules.maxLots = '2,5 / 5 / 10 / 20 / 40 / 80 / 120 lotes';
  return row as any;
}

describe('Fortify Guard: escolha das regras', () => {
  it('separa as regras em "zeram a conta", "saque e metas" e "lembretes", com a consequência de cada uma', async () => {
    renderCard();
    await waitFor(() => expect(screen.getByText('Zeram a conta')).toBeInTheDocument());
    expect(screen.getByText('Saque e metas')).toBeInTheDocument();
    expect(screen.getByText('Lembretes')).toBeInTheDocument();
    expect(screen.getByText('Inatividade')).toBeInTheDocument();
    expect(screen.getByText('Lote máximo')).toBeInTheDocument();
    expect(screen.getAllByText('Zera a conta').length).toBeGreaterThan(0);
  });

  it('manda instalar o EA pela página Fortify Guard, sem chave nem download por conta', async () => {
    renderCard();
    await waitFor(() => expect(screen.getByRole('link', { name: 'Abrir Fortify Guard' })).toHaveAttribute('href', '/fortify-guard'));
    expect(screen.queryByRole('button', { name: /Gerar chave/ })).not.toBeInTheDocument();
  });

  it('liga por padrão o que zera a conta e deixa os lembretes desligados', async () => {
    renderCard();
    await waitFor(() => expect(screen.getByLabelText('Mostrar Inatividade no EA')).not.toBeDisabled());
    expect(screen.getByLabelText('Mostrar Inatividade no EA')).toHaveAttribute('data-state', 'checked');
    expect(screen.getByLabelText('Mostrar Notícias no EA')).toHaveAttribute('data-state', 'unchecked');
  });

  it('na fase funded a consistência do saque aparece e a meta de lucro sai', async () => {
    renderCard();
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Funded' })).not.toBeDisabled());
    expect(screen.getByText('Meta de lucro')).toBeInTheDocument();
    expect(screen.queryByText('Trava o saque')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: 'Funded' }));
    expect(screen.queryByText('Meta de lucro')).not.toBeInTheDocument();
    expect(screen.getAllByText('Trava o saque').length).toBeGreaterThan(0);
    // A fase é salva, e as regras continuam no padrão (null), que acompanha a fase.
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ account_stage: 'funded', rule_keys: null }));
  });

  it('desligar uma regra salva a lista escolhida', async () => {
    renderCard();
    await waitFor(() => expect(screen.getByLabelText('Mostrar Lote máximo no EA')).not.toBeDisabled());
    fireEvent.click(screen.getByLabelText('Mostrar Lote máximo no EA'));
    const saved = upsert.mock.calls.at(-1)?.[0] as { rule_keys: string[] };
    expect(saved.rule_keys).not.toContain('max_lots');
    expect(saved.rule_keys).toContain('daily_loss');
    expect(within(document.body).getByLabelText('Mostrar Lote máximo no EA')).toHaveAttribute('data-state', 'unchecked');
  });
});
