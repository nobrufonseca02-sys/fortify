import { describe, expect, it } from 'vitest';
import { anuaisProntosParaVenda, descontoAnual } from '@/lib/pricingCatalog';

/**
 * Guarda da aba de cobrança anual.
 *
 * O anual do Enterprise está cadastrado com 0,17% de desconto (R$10.147 contra
 * R$10.164 de doze mensalidades — R$17 para travar um ano). Publicar isso não
 * passa como oferta: passa como erro de cadastro ou como pegadinha, e num plano
 * de R$10 mil isso queima a conversa com o cliente que mais paga.
 *
 * A aba anual só liga quando os QUATRO anuais estão compráveis e acima do piso
 * de desconto. Assim o problema fica sendo de dado, não de código: corrigido o
 * preço no banco, a aba liga sozinha, sem deploy.
 */

const PRECO = 'price_1ExemploValido00000000';

function plano(slug: string, centavos: number | null, intervalo: 'month' | 'year') {
  return {
    id: slug,
    slug,
    plan_name: slug,
    status: 'active',
    account_limit: 3,
    billing_interval: intervalo,
    price_amount: centavos,
    price_cents: centavos,
    stripe_price_id: PRECO,
  } as never;
}

/** O catálogo real, com o Enterprise anual quebrado como está hoje no banco. */
function catalogoAtual() {
  return [
    plano('beginner_monthly', 9700, 'month'),
    plano('advanced_monthly', 29700, 'month'),
    plano('pro_monthly', 49700, 'month'),
    plano('enterprise_monthly', 84700, 'month'),
    plano('beginner_annual', 104900, 'year'),
    plano('advanced_annual', 304900, 'year'),
    plano('pro_annual', 509700, 'year'),
    plano('enterprise_annual', 1014700, 'year'),
  ];
}

describe('descontoAnual', () => {
  it('mede o desconto real sobre doze mensalidades', () => {
    expect(descontoAnual(104900, 9700)).toBeCloseTo(0.0988, 4);
    expect(descontoAnual(304900, 29700)).toBeCloseTo(0.1445, 4);
    expect(descontoAnual(509700, 49700)).toBeCloseTo(0.1454, 4);
  });

  it('expõe o Enterprise anual como praticamente sem desconto', () => {
    const d = descontoAnual(1014700, 84700);
    expect(d).toBeCloseTo(0.0017, 4);
    expect(d).toBeLessThan(0.05);
  });

  it('devolve null quando falta preço, em vez de fingir um desconto', () => {
    expect(descontoAnual(null, 9700)).toBeNull();
    expect(descontoAnual(104900, null)).toBeNull();
    expect(descontoAnual(0, 9700)).toBeNull();
  });
});

describe('anuaisProntosParaVenda', () => {
  it('mantém a aba anual desligada com o catálogo de hoje', () => {
    expect(anuaisProntosParaVenda(catalogoAtual())).toBe(false);
  });

  it('liga a aba quando o Enterprise anual é corrigido para ~14,5%', () => {
    const catalogo = catalogoAtual().map((p: never) => {
      const item = p as unknown as { slug: string; price_amount: number; price_cents: number };
      if (item.slug !== 'enterprise_annual') return p;
      return plano('enterprise_annual', 869700, 'year'); // R$8.697 -> 14,4%
    });
    expect(anuaisProntosParaVenda(catalogo)).toBe(true);
  });

  it('não liga se faltar um dos quatro anuais — três de quatro deixa a tela furada', () => {
    const semPro = catalogoAtual().filter((p: never) => {
      const item = p as unknown as { slug: string };
      return item.slug !== 'pro_annual';
    });
    expect(anuaisProntosParaVenda(semPro)).toBe(false);
  });

  it('não liga se um anual estiver sem Price ID válido da Stripe', () => {
    const catalogo = catalogoAtual().map((p: never) => {
      const item = p as unknown as { slug: string };
      if (item.slug !== 'advanced_annual') return p;
      return { ...(p as object), stripe_price_id: null } as never;
    });
    expect(anuaisProntosParaVenda(catalogo)).toBe(false);
  });
});
