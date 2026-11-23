import { describe, expect, it, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  capturePromoFromSearch,
  clearPendingPromo,
  isPromoTrialSubscription,
  readPendingPromo,
  trialMsLeft,
} from '@/lib/promoTrial';
import { FortifyGuardPromoModal } from '@/components/billing/FortifyGuardPromoModal';

describe('link de teste grátis', () => {
  beforeEach(() => window.localStorage.clear());

  it('guarda o código guard3d vindo do link e limpa depois', () => {
    expect(capturePromoFromSearch('?intent=signup&promo=GUARD3D')).toBe('guard3d');
    expect(readPendingPromo()).toBe('guard3d');
    clearPendingPromo();
    expect(readPendingPromo()).toBeNull();
  });

  it('ignora cadastro normal e código desconhecido', () => {
    expect(capturePromoFromSearch('?intent=signup')).toBeNull();
    expect(capturePromoFromSearch('?promo=gratis')).toBeNull();
    expect(readPendingPromo()).toBeNull();
  });

  it('descarta código guardado há mais de 7 dias', () => {
    window.localStorage.setItem(
      'fortify_promo_trial',
      JSON.stringify({ code: 'guard3d', savedAt: Date.now() - 8 * 24 * 60 * 60 * 1000 }),
    );
    expect(readPendingPromo()).toBeNull();
  });
});

describe('assinatura de teste', () => {
  const trial = {
    plan_id: 'beginner_monthly',
    status: 'trialing',
    stripe_subscription_id: null,
    current_period_end: '2026-11-26T12:00:00Z',
  };

  it('reconhece o teste da campanha e não confunde com assinatura paga', () => {
    expect(isPromoTrialSubscription(trial)).toBe(true);
    expect(isPromoTrialSubscription({ ...trial, stripe_subscription_id: 'sub_1', status: 'active' })).toBe(false);
    expect(isPromoTrialSubscription({ ...trial, plan_id: 'beta_free', status: 'active' })).toBe(false);
  });

  it('calcula o tempo restante e fica negativo quando vence', () => {
    expect(trialMsLeft(trial, Date.parse('2026-11-26T11:00:00Z'))).toBe(60 * 60 * 1000);
    expect(trialMsLeft(trial, Date.parse('2026-11-27T00:00:00Z'))).toBeLessThan(0);
  });
});

describe('pop-up da oferta', () => {
  const base = {
    open: true,
    onOpenChange: () => {},
    trialExpired: true,
    loading: false,
    error: null,
    onSeePlans: () => {},
  };

  it('mostra preço riscado, R$ 97, as condições e chama o checkout', () => {
    const onCheckout = vi.fn();
    render(<FortifyGuardPromoModal {...base} offerActive onCheckout={onCheckout} />);
    expect(screen.getByText('Condição Exclusiva de Lançamento')).toBeInTheDocument();
    expect(screen.getByText('R$ 297/mês')).toBeInTheDocument();
    expect(screen.getByText('R$ 97/mês')).toBeInTheDocument();
    expect(screen.getByText('Oferta válida até 30/11/2026 às 23h59.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Garantir Minha Vaga por R\$ 97\/mês/ }));
    expect(onCheckout).toHaveBeenCalledTimes(1);
  });

  it('depois do prazo da oferta não mostra R$ 97 e manda para os planos', () => {
    const onSeePlans = vi.fn();
    render(<FortifyGuardPromoModal {...base} offerActive={false} onCheckout={() => {}} onSeePlans={onSeePlans} />);
    expect(screen.queryByText('R$ 97/mês')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ver planos do Fortify' }));
    expect(onSeePlans).toHaveBeenCalledTimes(1);
  });
});
