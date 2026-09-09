import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { trackBeginCheckout, trackPurchase } from '@/lib/analytics';

/**
 * Guarda de um erro que custaria dinheiro em decisão de mídia.
 *
 * A tabela `plans` guarda preço em CENTAVOS (R$97 = 9700). Os eventos de
 * `begin_checkout` e `purchase` repassavam esse número cru para o dataLayer,
 * então o GA4 e o Meta recebiam 9700 como se fossem reais. Com otimização por
 * valor ligada, o ROAS apareceria 100x maior do que é — e a decisão de
 * escalar verba sairia toda errada, sem nada na tela indicando problema.
 *
 * O lado servidor (webhook da Stripe) já dividia por 100; só o cliente não.
 */

type EventoDataLayer = { event: string; ecommerce?: { value?: number; currency?: string } };

function fila(): EventoDataLayer[] {
  return (window as unknown as { dataLayer: EventoDataLayer[] }).dataLayer || [];
}

function ultimoEvento(nome: string) {
  return [...fila()].reverse().find((e) => e.event === nome);
}

beforeEach(() => {
  (window as unknown as { dataLayer: EventoDataLayer[] }).dataLayer = [];
});

afterEach(() => {
  (window as unknown as { dataLayer: EventoDataLayer[] }).dataLayer = [];
});

describe('valor dos eventos de conversão', () => {
  it('converte os centavos do plano em reais no begin_checkout', () => {
    trackBeginCheckout({ slug: 'beginner_monthly', name: 'Beginner', priceCents: 9700, currency: 'BRL' });
    expect(ultimoEvento('begin_checkout')?.ecommerce?.value).toBe(97);
  });

  it('converte os centavos do plano em reais no purchase', () => {
    trackPurchase({ transactionId: 'cs_test_1', valueCents: 49700, currency: 'BRL', planSlug: 'pro_monthly' });
    expect(ultimoEvento('purchase')?.ecommerce?.value).toBe(497);
  });

  it('cobre a faixa de preços real do catálogo, sem inflar nenhum', () => {
    // Os quatro planos vendidos hoje, em centavos, e o que a mídia tem de ver.
    const catalogo: [number, number][] = [
      [9700, 97],
      [29700, 297],
      [49700, 497],
      [84700, 847],
    ];
    for (const [centavos, reais] of catalogo) {
      trackPurchase({ transactionId: `cs_${centavos}`, valueCents: centavos, planSlug: 'plano', currency: 'BRL' });
      expect(ultimoEvento('purchase')?.ecommerce?.value, `${centavos} centavos`).toBe(reais);
    }
  });

  it('não inventa valor quando o plano não traz preço', () => {
    trackPurchase({ transactionId: 'cs_sem_preco', valueCents: null, planSlug: 'beta_free', currency: 'BRL' });
    expect(ultimoEvento('purchase')?.ecommerce?.value).toBeUndefined();
  });

  it('assume BRL quando a moeda não vem preenchida', () => {
    trackBeginCheckout({ slug: 'advanced_monthly', priceCents: 29700 });
    expect(ultimoEvento('begin_checkout')?.ecommerce?.currency).toBe('BRL');
  });
});
