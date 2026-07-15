# Stripe, planos e billing

Esta é uma área crítica. Uma mudança visual em Pricing não autoriza alterar catálogo, webhook ou entitlement.

## Planos mensais atuais

| Slug | Preço | Contas MT5 | Stripe Price ID |
| --- | ---: | ---: | --- |
| `beginner_monthly` | R$ 97/mês | 1 | `price_1TfjleFCCIFbGAWBPkdIZmN0` |
| `advanced_monthly` | R$ 297/mês | 3 | `price_1TniUnFCCIFbGAWBH4vzK1GB` |
| `pro_monthly` | R$ 497/mês | 5 | `price_1TfjqlFCCIFbGAWBcYnlMkpB` |
| `enterprise_monthly` | R$ 847/mês | 10 | `price_1TniUpFCCIFbGAWBZIbcUoXN` |

Price IDs são identificadores publicáveis de catálogo, não chaves secretas. Não crie preço novo para corrigir mapeamento sem antes consultar os preços ativos do Product correto.

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
