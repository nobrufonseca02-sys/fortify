import { describe, expect, it } from 'vitest';
import { planoLiberaContaMt5 } from '@/hooks/useSubscriptionPlan';

/**
 * Guarda de um descasamento de contrato entre cliente e servidor.
 *
 * O gateway NUNCA libera custo MetaApi para `beta_free` (`isPaidPlan` em
 * services/metaapi-gateway/src/server.ts) — o MetaApi cobra por conta
 * monitorada, e isso é decisão de arquitetura documentada.
 *
 * O cliente, porém, só olhava status e período. Como todo cadastro novo cai em
 * `beta_free` com status ativo e 90 dias de período, o cliente considerava
 * plano ativo com 1 conta disponível: o botão de conectar ficava liberado, a
 * pessoa digitava as credenciais reais da corretora, enviava — e só então o
 * gateway recusava. Era o primeiro contato de QUALQUER visitante que se
 * cadastrasse, inclusive os vindos de anúncio pago.
 */

const NOVENTA_DIAS = new Date(Date.now() + 90 * 86_400_000).toISOString();
const ANTEONTEM = new Date(Date.now() - 2 * 86_400_000).toISOString();

describe('planoLiberaContaMt5', () => {
  it('não libera o beta_free, mesmo ativo e dentro do período', () => {
    expect(
      planoLiberaContaMt5({
        plan_id: 'beta_free',
        status: 'active',
        account_limit: 1,
        current_period_end: NOVENTA_DIAS,
      }),
    ).toBe(false);
  });

  it('libera plano pago ativo', () => {
    for (const plan_id of ['beginner_monthly', 'advanced_monthly', 'pro_monthly', 'enterprise_monthly']) {
      expect(
        planoLiberaContaMt5({ plan_id, status: 'active', account_limit: 3, current_period_end: NOVENTA_DIAS }),
        plan_id,
      ).toBe(true);
    }
  });

  it('libera assinatura em trial, que é como a Stripe marca período de teste', () => {
    expect(
      planoLiberaContaMt5({
        plan_id: 'advanced_monthly',
        status: 'trialing',
        account_limit: 3,
        current_period_end: NOVENTA_DIAS,
      }),
    ).toBe(true);
  });

  it('não libera plano pago com período vencido', () => {
    expect(
      planoLiberaContaMt5({
        plan_id: 'pro_monthly',
        status: 'active',
        account_limit: 5,
        current_period_end: ANTEONTEM,
      }),
    ).toBe(false);
  });

  it('não libera assinatura cancelada ou inadimplente', () => {
    for (const status of ['canceled', 'past_due', 'unpaid', 'incomplete']) {
      expect(
        planoLiberaContaMt5({
          plan_id: 'pro_monthly',
          status,
          account_limit: 5,
          current_period_end: NOVENTA_DIAS,
        }),
        status,
      ).toBe(false);
    }
  });

  it('não libera plano com limite zero', () => {
    expect(
      planoLiberaContaMt5({
        plan_id: 'monthly',
        status: 'active',
        account_limit: 0,
        current_period_end: NOVENTA_DIAS,
      }),
    ).toBe(false);
  });

  // ATENÇÃO — este teste documenta uma exposição real, não um comportamento
  // desejado. O plano legado `vip` está ativo no banco com account_limit 25 e
  // preço nulo: quem estiver nele passa por este portão e ganha 25 contas
  // monitoradas sem pagar nada, e cada conta gera custo MetaApi. O portão está
  // certo (o limite é maior que zero); o dado é que está errado. A correção é
  // desativar o plano no banco, não afrouxar a regra aqui.
  it('deixa passar o legado `vip`, porque ele tem limite 25 no banco', () => {
    expect(
      planoLiberaContaMt5({
        plan_id: 'vip',
        status: 'active',
        account_limit: 25,
        current_period_end: NOVENTA_DIAS,
      }),
    ).toBe(true);
  });

  it('não libera quando não há assinatura nenhuma', () => {
    expect(planoLiberaContaMt5(null)).toBe(false);
    expect(planoLiberaContaMt5(undefined)).toBe(false);
  });
});
