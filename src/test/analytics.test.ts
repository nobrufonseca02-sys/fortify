import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { captureUtmParams, trackBeginCheckout, trackPurchase, trackSelectPlan } from '@/lib/analytics';

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

type EventoDataLayer = {
  event: string;
  autenticado?: boolean;
  utm_source?: string;
  utm_campaign?: string;
  ecommerce?: { value?: number; currency?: string; items?: { item_id?: string }[] };
};

const CHAVE_UTM = 'fortify_utm_params';

/** Coloca o navegador numa URL com os parâmetros dados, como se fosse um clique de anúncio. */
function chegarPor(query: string) {
  window.history.replaceState({}, '', `/vendas/planos${query}`);
  captureUtmParams();
}

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

/**
 * Guarda do sinal de meio de funil.
 *
 * O clique em "Assinar" de quem não tem conta não gerava evento nenhum: o
 * funil ficava só com PageView e, muito depois, Purchase. Como compra é rara
 * no começo de uma campanha, sem esse evento o pixel não tem em que otimizar.
 */
describe('select_plan, o sinal de meio de funil', () => {
  it('dispara para quem ainda não tem conta, que é o caso que estava cego', () => {
    trackSelectPlan({ slug: 'advanced_monthly', name: 'Advanced', priceCents: 29700, autenticado: false });
    const evento = ultimoEvento('select_plan');
    expect(evento).toBeDefined();
    expect(evento?.autenticado).toBe(false);
    expect(evento?.ecommerce?.items?.[0]?.item_id).toBe('advanced_monthly');
  });

  it('marca separadamente quem já estava autenticado', () => {
    trackSelectPlan({ slug: 'pro_monthly', priceCents: 49700, autenticado: true });
    expect(ultimoEvento('select_plan')?.autenticado).toBe(true);
  });

  it('usa a mesma conversão de centavos dos outros eventos', () => {
    trackSelectPlan({ slug: 'beginner_monthly', priceCents: 9700, autenticado: false });
    expect(ultimoEvento('select_plan')?.ecommerce?.value).toBe(97);
  });

  it('não é o mesmo evento que begin_checkout — o funil tem dois passos', () => {
    trackSelectPlan({ slug: 'pro_monthly', priceCents: 49700, autenticado: false });
    expect(ultimoEvento('begin_checkout')).toBeUndefined();

    trackBeginCheckout({ slug: 'pro_monthly', priceCents: 49700 });
    expect(fila().filter((e) => e.event === 'select_plan')).toHaveLength(1);
    expect(fila().filter((e) => e.event === 'begin_checkout')).toHaveLength(1);
  });
});

/**
 * Guarda da janela de atribuição.
 *
 * O primeiro toque vence, mas antes ele valia PARA SEMPRE: quem chegou por
 * uma campanha uma vez teria toda compra futura atribuída a ela, e a medição
 * de qualquer campanha nova nasceria contaminada por tráfego antigo.
 */
describe('atribuição de primeiro toque', () => {
  beforeEach(() => {
    localStorage.removeItem(CHAVE_UTM);
  });

  it('guarda o primeiro toque e o anexa aos eventos de conversão', () => {
    chegarPor('?utm_source=meta&utm_campaign=lancamento');
    trackSelectPlan({ slug: 'advanced_monthly', priceCents: 29700, autenticado: false });
    const evento = ultimoEvento('select_plan');
    expect(evento?.utm_source).toBe('meta');
    expect(evento?.utm_campaign).toBe('lancamento');
  });

  it('o primeiro toque vence o segundo dentro da janela', () => {
    chegarPor('?utm_source=meta&utm_campaign=primeira');
    chegarPor('?utm_source=google&utm_campaign=segunda');
    trackSelectPlan({ slug: 'pro_monthly', priceCents: 49700, autenticado: false });
    expect(ultimoEvento('select_plan')?.utm_campaign).toBe('primeira');
  });

  it('atribuição vencida é substituída pelo toque atual, não carregada para sempre', () => {
    chegarPor('?utm_source=meta&utm_campaign=campanha_velha');
    // Envelhece o registro para além da janela de 90 dias.
    const guardado = JSON.parse(localStorage.getItem(CHAVE_UTM) as string);
    guardado.capturadoEm = Date.now() - 91 * 86_400_000;
    localStorage.setItem(CHAVE_UTM, JSON.stringify(guardado));

    chegarPor('?utm_source=google&utm_campaign=campanha_nova');
    trackSelectPlan({ slug: 'pro_monthly', priceCents: 49700, autenticado: false });
    expect(ultimoEvento('select_plan')?.utm_campaign).toBe('campanha_nova');
  });

  it('não anexa atribuição vencida a evento nenhum', () => {
    chegarPor('?utm_source=meta&utm_campaign=antiga');
    const guardado = JSON.parse(localStorage.getItem(CHAVE_UTM) as string);
    guardado.capturadoEm = Date.now() - 200 * 86_400_000;
    localStorage.setItem(CHAVE_UTM, JSON.stringify(guardado));

    trackPurchase({ transactionId: 'cs_1', valueCents: 29700, planSlug: 'advanced_monthly' });
    expect(ultimoEvento('purchase')?.utm_source).toBeUndefined();
  });
});

/**
 * GA4 e Meta esperam ISO 4217 em maiúsculo. A tabela `plans` guarda a moeda no
 * padrão da Stripe, que é minúsculo ("brl"), e o valor ia cru para o dataLayer.
 */
describe('moeda', () => {
  it('normaliza o minúsculo que vem do banco', () => {
    trackPurchase({ transactionId: 'cs_2', valueCents: 29700, currency: 'brl', planSlug: 'advanced_monthly' });
    expect(ultimoEvento('purchase')?.ecommerce?.currency).toBe('BRL');
  });

  it('normaliza também no select_plan e no begin_checkout', () => {
    trackSelectPlan({ slug: 'pro_monthly', priceCents: 49700, currency: 'brl', autenticado: true });
    expect(ultimoEvento('select_plan')?.ecommerce?.currency).toBe('BRL');
    trackBeginCheckout({ slug: 'pro_monthly', priceCents: 49700, currency: 'brl' });
    expect(ultimoEvento('begin_checkout')?.ecommerce?.currency).toBe('BRL');
  });
});
