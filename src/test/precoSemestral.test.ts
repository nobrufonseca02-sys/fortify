import { describe, expect, it } from 'vitest';
import {
  detalheSemestral,
  economiaSemestral,
  isCommercialPlan,
  ofertaLancamento,
  semestraisProntosParaVenda,
} from '@/lib/pricingCatalog';

/**
 * Catálogo de 11/11/2026: Beginner, Advanced e Pro, em mensal e semestral.
 * O Enterprise saiu da vitrine. O Pro semestral cai para "A consultar" só
 * enquanto não tiver Price ID no banco.
 *
 * A aba semestral só liga quando os semestrais com checkout têm Price ID
 * válido. Enquanto os Prices não existem na Stripe, ela fica "em breve" e
 * liga sozinha quando o banco for preenchido, sem deploy.
 */

const PRECO = 'price_1ExemploValido00000000';

function plano(slug: string, centavos: number | null, intervalo: 'month' | 'semester', precoStripe: string | null = PRECO) {
  return {
    id: slug,
    slug,
    plan_name: slug,
    status: 'active',
    account_limit: 3,
    billing_interval: intervalo,
    price_amount: centavos,
    price_cents: centavos,
    stripe_price_id: precoStripe,
  } as never;
}

function catalogoNovo() {
  return [
    plano('beginner_monthly', 29700, 'month'),
    plano('advanced_monthly', 99700, 'month'),
    plano('pro_monthly', 199700, 'month'),
    plano('beginner_semiannual', 169700, 'semester'),
    plano('advanced_semiannual', 589700, 'semester'),
  ];
}

describe('economiaSemestral', () => {
  it('mede quanto o semestral sai mais barato que seis mensalidades', () => {
    expect(economiaSemestral(169700, 29700)).toBe(8500); // 6 x 297 = 1.782 contra 1.697
    expect(economiaSemestral(589700, 99700)).toBe(8500); // 6 x 997 = 5.982 contra 5.897
  });

  it('devolve null quando falta preço', () => {
    expect(economiaSemestral(null, 29700)).toBeNull();
    expect(economiaSemestral(169700, null)).toBeNull();
    expect(economiaSemestral(0, 29700)).toBeNull();
  });
});

describe('semestraisProntosParaVenda', () => {
  it('liga a aba com os dois semestrais compráveis', () => {
    expect(semestraisProntosParaVenda(catalogoNovo())).toBe(true);
  });

  it('fica em breve enquanto um semestral não tem Price ID da Stripe', () => {
    const catalogo = catalogoNovo().map((p: any) =>
      p.slug === 'advanced_semiannual' ? { ...p, stripe_price_id: null } : p,
    );
    expect(semestraisProntosParaVenda(catalogo)).toBe(false);
  });

  it('fica em breve se o semestral ainda não existe no banco', () => {
    const catalogo = catalogoNovo().filter((p: any) => p.slug !== 'beginner_semiannual');
    expect(semestraisProntosParaVenda(catalogo)).toBe(false);
  });

  it('não vende semestral mais caro que seis mensalidades (erro de cadastro)', () => {
    const catalogo = catalogoNovo().map((p: any) =>
      p.slug === 'beginner_semiannual' ? { ...p, price_amount: 199000, price_cents: 199000 } : p,
    );
    expect(semestraisProntosParaVenda(catalogo)).toBe(false);
  });
});

describe('detalheSemestral', () => {
  it('mostra o equivalente por mês e a economia sobre o mensal', () => {
    const texto = detalheSemestral(plano('beginner_semiannual', 169700, 'semester'), plano('beginner_monthly', 29700, 'month'));
    expect(texto).toMatch(/282,83\/mês/);
    expect(texto).toMatch(/85 a menos que 6 mensalidades/);
  });

  it('não se aplica a plano mensal', () => {
    expect(detalheSemestral(plano('advanced_monthly', 99700, 'month'))).toBeNull();
  });
});

describe('catálogo comercial', () => {
  it('não vende mais o Enterprise nem os anuais', () => {
    expect(isCommercialPlan(plano('enterprise_monthly', 149700, 'month'))).toBe(false);
    expect(isCommercialPlan({ id: 'pro_annual', slug: 'pro_annual', billing_interval: 'year' } as never)).toBe(false);
    expect(isCommercialPlan(plano('pro_monthly', 199700, 'month'))).toBe(true);
    expect(isCommercialPlan(plano('advanced_semiannual', 589700, 'semester'))).toBe(true);
    expect(isCommercialPlan(plano('pro_semiannual', 1189700, 'semester'))).toBe(true);
  });

  it('marca o Advanced como oferta de lançamento, e só ele', () => {
    expect(ofertaLancamento(plano('advanced_monthly', 99700, 'month'))?.selo).toBe('Oferta de lançamento');
    expect(ofertaLancamento(plano('pro_monthly', 199700, 'month'))).toBeNull();
    expect(ofertaLancamento(plano('beginner_monthly', 29700, 'month'))).toBeNull();
  });
});
