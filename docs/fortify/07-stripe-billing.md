# Stripe, planos e billing

Esta é uma área crítica. Uma mudança visual em Pricing não autoriza alterar catálogo, webhook ou entitlement.

## Planos mensais atuais

Atualizado em 2026-10-16: a tabela anterior estava desatualizada (citava valores de uma
versão anterior do catálogo) e os Price IDs antigos nunca existiam em modo live — só em
teste. Os valores e IDs abaixo são os reais, conferidos direto contra o banco (`plans`)
e contra a Stripe em modo live no momento da correção.

| Slug | Preço | Contas MT5 | Stripe Price ID (live) |
| --- | ---: | ---: | --- |
| `beginner_monthly` | R$ 297/mês | 1 | `price_1UR2FQ2aY34sNvUukvnxeGFX` |
| `advanced_monthly` | R$ 497/mês | 3 | `price_1UR2FR2aY34sNvUuBLiVdVGQ` |
| `pro_monthly` | R$ 997/mês | 5 | `price_1UR2FT2aY34sNvUuehcDrFMI` |
| `enterprise_monthly` | R$ 1.497/mês | 10 | `price_1UR2FU2aY34sNvUuML2uGiXe` |

Price IDs são identificadores publicáveis de catálogo, não chaves secretas. Não crie preço
novo para corrigir mapeamento sem antes consultar os preços ativos do Product correto **e**
o valor atual em `plans.price_amount` — essa tabela, não esta doc, é a fonte de verdade.

## Cupom de desconto

Regra única em `services/metaapi-gateway/src/checkoutCoupons.ts`: o site mostra o preço com ela
e o gateway cobra com ela. O código `FORTIFY` vale para sempre e dá R$ 100 no Beginner, R$ 100 no
Advanced e R$ 200 no Pro. Como o desconto em reais muda por plano, cada plano tem um cupom próprio
na Stripe (`FORTIFY_BEGINNER`, `FORTIFY_ADVANCED`, `FORTIFY_PRO`: valor fixo em BRL, duração
"para sempre", limitado ao produto do plano). O gateway recebe `coupon` em
`create-checkout-session` e `guest-checkout-session` e abre a sessão com `discounts[0][coupon]`.
Cada cupom tem um código promocional próprio na Stripe (`FORTIFYBEGINNER`, `FORTIFYADVANCED`,
`FORTIFYPRO`), que vale digitado na página de pagamento quando a sessão abre sem cupom
(`allow_promotion_codes`). A Stripe não aceita cupom aplicado e campo de código juntos. O site
aceita `FORTIFY` (todos os planos) e os três códigos por plano, e recusa abrir o checkout se a
resposta não trouxer `coupon_applied`, para nunca cobrar preço cheio depois de mostrar desconto.

Links de compra direta (o checkout abre sozinho e o parâmetro sai da URL):
`/vendas/planos?plano=beginner&cupom=FORTIFY` (com desconto) e `/vendas/planos?plano=beginner`
(sem cupom, o cliente digita o código do plano na Stripe). Vale `beginner`, `advanced` e `pro`.

## Teste grátis da campanha e oferta R$ 97 (até 30/11/2026)

Link da campanha: `/cadastro?promo=guard3d` (vira `/auth?intent=signup&promo=guard3d`). O site guarda
o código no navegador (`src/lib/promoTrial.ts`) e, depois do login, chama `POST /billing/start-promo-trial`.
O gateway (`services/metaapi-gateway/src/promoTrial.ts`) só libera para conta em `beta_free` sem
`stripe_subscription_id`: grava `beginner_monthly`, `trialing`, 1 conta e `paid_until` em 3 dias.
O mesmo entitlement de sempre faz o EA parar quando vence (`plan_inactive`). Quem já usou o trial
fica em `beginner_monthly` e não ganha outro. O link para de liberar trial depois de 30/11/2026 23h59.

`PromoTrialGate` (no `AppLayout`) mostra a faixa com o tempo restante e o pop-up
`FortifyGuardPromoModal`, que abre o checkout do Beginner com o cupom `GUARD97`: R$ 200 de desconto
por 12 meses (cupom Stripe `FORTIFY_GUARD_97`, valor fixo BRL, `repeating` 12 meses, só o produto do
Beginner). O código expira em `GUARD97_OFFER_ENDS_AT` no site e no gateway.

## Compra: Stripe Checkout

1. Usuário escolhe um plano em `/pricing`.
2. Sem sessão, o slug pretendido é preservado e o usuário vai para Auth.
3. Com sessão, frontend chama `POST /billing/create-checkout-session`.
4. Gateway valida JWT, plano ativo e `stripe_price_id` iniciado por `price_`.
5. Customer é criado/reutilizado e Checkout é criado em `mode=subscription`.
6. Metadados relacionam usuário, plano e sessão.
7. A URL de compra deve conter `checkout.stripe.com`.
8. No retorno de sucesso, o Dashboard chama `confirm-checkout-session` como fallback.

Beta Free, ausência de plano pago e nova compra nunca devem abrir Customer Portal. O portal (`billing.stripe.com`) serve apenas para assinante pago com Customer e Subscription válidos gerenciar a assinatura.

## Portal

`POST /billing/create-portal-session` exige JWT e assinatura Stripe existente. O gateway busca `stripe_customer_id`, cria a sessão e retorna a URL. Usuário Beta Free ou sem assinatura paga deve ser direcionado para `/pricing`.

## Webhook

Rota: `POST /billing/webhook`.

Requisitos:

- corpo bruto preservado;
- header `Stripe-Signature` obrigatório;
- validação com `STRIPE_WEBHOOK_SECRET` antes de processar;
- secret ausente resulta em indisponibilidade de configuração, não aceitação silenciosa;
- logs com IDs mascarados.

Eventos tratados atualmente:

- `checkout.session.completed`;
- `customer.subscription.created`;
- `customer.subscription.updated`;
- `customer.subscription.deleted`;
- `invoice.payment_succeeded`;
- `invoice.payment_failed`;
- `invoice.payment_action_required` no caminho de falha/atenção.

## Estados e direito de acesso

| Estado | MetaApi | Observação |
| --- | --- | --- |
| `active` | Permitido se período futuro | Estado pago normal. |
| `trialing` | Permitido se período futuro | Aceito pelo código; use somente trial autorizado. |
| `past_due` | Bloqueado conforme ciclo de falha/expiração | Não assumir pagamento. |
| `unpaid` | Bloqueado | Falha fechada. |
| `canceled` | Bloqueado após fim/invalidade efetiva | Portal pode marcar cancelamento no fim do período. |
| `incomplete` | Bloqueado | Assinatura não concluída. |
| `incomplete_expired` | Bloqueado | Checkout incompleto expirou. |
| `payment_failed` | Bloqueado | Estado operacional/evento interno; a Stripe costuma refletir `past_due`/`unpaid`. |
| desconhecido/nulo | Bloqueado | Falha fechada. |

Campos fundamentais:

- `current_period_end`: fim do ciclo informado pela Stripe.
- `paid_until`: cobertura usada pelo entitlement; normalmente alinhada ao período.
- `activated_at`: quando uma assinatura válida foi ativada.
- `cancel_at_period_end`: cancelamento agendado; não corta período já pago sozinho.
- `account_limit`: limite incluído no plano; add-ons ativos podem ampliar o total.

`beta_free` não representa receita Stripe e não libera custo MetaApi em produção.

## Fallback de confirmação

`POST /billing/confirm-checkout-session`:

- valida formato `cs_...` e JWT;
- recupera Session com subscription e line items;
- exige `metadata.user_id` ou `client_reference_id` igual ao usuário autenticado;
- exige pagamento confirmado ou subscription `active`/`trialing`;
- resolve plano pelo Price ID e faz upsert da assinatura.

Esse fallback não substitui o webhook; ele melhora a ativação local e o retorno do navegador.

## Falhas comuns

| Erro | Causa provável | Verificação |
| --- | --- | --- |
| `Failed to fetch` | Gateway offline/base URL errada | `/health`, proxy `/api`, `npm run dev`. |
| Portal abriu em nova compra | CTA considerou Beta Free como paga | Separar “Assinar” de “Gerenciar assinatura”. |
| Plano sem Price válido | `prod_...`, vazio ou preço errado | Plano precisa de `price_...` ativo e recorrente. |
| Checkout cria plano errado | Mapeamento slug/Price inconsistente | Conferir `plans` e Stripe Dashboard. |
| Assinatura continua antiga | Webhook/reconcile não atualizou | Eventos, assinatura Stripe e datas. |
| Webhook rejeita tudo | CLI/endpoint usa outro `whsec_...` | Atualizar secret local sem imprimi-lo. |

## QA obrigatório

- [ ] `/pricing` carrega somente planos comerciais esperados.
- [ ] Cada CTA de nova compra chama Checkout e abre `checkout.stripe.com`.
- [ ] Usuário pago abre Portal; Beta Free não abre Portal.
- [ ] `checkout.session.completed` é aceito com assinatura válida.
- [ ] `user_subscriptions` recebe plano, status, Stripe IDs e datas.
- [ ] Retorno chama confirmação e trata sessão de outro usuário como 403.
- [ ] Falha de pagamento retira entitlement e aciona suspensão quando aplicável.
- [ ] Limite de contas reflete plano + add-ons ativos.
- [ ] Webhook sem secret/assinatura válida não é processado.
- [ ] Nenhuma chave Stripe aparece no frontend, diff ou log.

## Branding no Stripe Dashboard

Logo, cor, dados comerciais, textos do portal e meios de pagamento são configurações manuais da conta Stripe. Código do Fortify não garante que o Checkout hospedado tenha branding correto; valide em test mode e live mode separadamente.
