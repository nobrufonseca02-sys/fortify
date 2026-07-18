# Contexto consolidado Fortify para LLM

Use este arquivo como contexto inicial. Confirme o código atual antes de editar: documentação orienta, mas não substitui leitura do repositório.

## Produto

Fortify é um SaaS de comando de risco para traders MT5 e prop firms. Promessa: **“Proteja sua conta antes do próximo trade.”** Agrega contas, sincronização, posições, trades, regras, drawdown, perda diária e recomendações. Não executa ordens e não garante aprovação em mesa.

## Stack exata

- Frontend: React 18, Vite 5, TypeScript, Tailwind, React Router, TanStack Query e componentes Radix/shadcn.
- Auth/dados: Supabase Auth + PostgreSQL + RLS.
- Backend: Node/TypeScript com Fastify em `services/metaapi-gateway`.
- Cobrança: Stripe Checkout, Customer Portal e webhook.
- Trading: MetaApi para MT5.
- Gráfico: TradingView incorporado, somente análise.
- Testes/build: Vitest, `vite build` e TypeScript.

Não é NestJS, Next.js ou Prisma.

## Runtime local

```text
npm run dev          # frontend + gateway
npm run dev:all      # alias da stack completa
npm run dev:app      # somente Vite
npm run dev:gateway  # somente gateway
npm run build
npm test
npx tsc --noEmit --project services/metaapi-gateway/tsconfig.json
```

- Frontend: `http://localhost:8080`
- Gateway/health: `http://localhost:3001/health`
- Vite proxy: `/api` → `http://localhost:3001`

## Rotas e módulos

- `/auth`, `/reset-password`: autenticação.
- `/`, `/dashboard`: Painel.
- `/accounts`, `/accounts/new`, `/accounts/:id`: contas.
- `/mt5`, `/mt5/:connectionId`: conexão/sync MT5.
- `/risk-calculator`: calculadora.
- `/rules`, `/rules/manage`, `/accounts/:accountId/rules`: regras.
- `/library`: Biblioteca de Mesas.
- `/performance`, `/history`: desempenho/histórico.
- `/pricing`: planos e Checkout.
- `/settings`: perfil/assinatura.
- `/adm`: administração protegida.

## Áreas críticas

| Área | Arquivos principais |
| --- | --- |
| Rotas/layout | `src/App.tsx`, `src/components/AppLayout.tsx`, `AppSidebar.tsx` |
| Billing frontend | `src/pages/PricingPage.tsx`, `src/lib/billing.ts`, `useSubscriptionPlan.ts` |
| Gateway | `services/metaapi-gateway/src/server.ts` |
| MT5 frontend | `src/hooks/useMT5.ts`, páginas `MT5*`, `CreateAccount.tsx` |
| Dashboard | `src/pages/Dashboard.tsx` |
| Regras | `usePropFirmLibrary.ts`, `useRuleEvaluations.ts`, páginas de regras |
| Calculadora | `src/pages/RiskCalculator.tsx`, `src/lib/riskCalculator.ts` |
| TradingView | `src/components/tradingview/` |
| Auth | `src/pages/AuthPage.tsx`; vídeo `/backgrounds/fortify-blackhole-auth.mp4` |
| Banco | `supabase/migrations/`, tipos Supabase |

## Planos e Stripe Price IDs

| Slug | Mensal | Limite | Price ID |
| --- | ---: | ---: | --- |
| `beginner_monthly` | R$ 97 | 1 | `price_1TfjleFCCIFbGAWBPkdIZmN0` |
| `advanced_monthly` | R$ 297 | 3 | `price_1TniUnFCCIFbGAWBH4vzK1GB` |
| `pro_monthly` | R$ 497 | 5 | `price_1TfjqlFCCIFbGAWBcYnlMkpB` |
| `enterprise_monthly` | R$ 847 | 10 | `price_1TniUpFCCIFbGAWBZIbcUoXN` |

Nova compra/Beta Free usa `POST /billing/create-checkout-session`; a URL deve conter `checkout.stripe.com`. Somente assinante Stripe pago usa `POST /billing/create-portal-session`. Retorno pode chamar `POST /billing/confirm-checkout-session`, que valida JWT, propriedade da Session e pagamento. Webhook assinado continua sendo a fonte assíncrona principal.

## Guard de custo MetaApi

MetaApi só é permitido quando:

- existe plano pago diferente de `beta_free`;
- status é aceito (`active`/`trialing` no código atual);
- `paid_until` ou `current_period_end` está no futuro;
- conta cabe no limite base + add-ons ativos.

No plan, Beta Free, expirado, `past_due`, `unpaid`, `canceled`, `incomplete`, `incomplete_expired`, falha de pagamento ou status desconhecido bloqueiam. `/metaapi/connect` e `/metaapi/sync` verificam entitlement antes do provedor. Suspensão é idempotente; falha de undeploy vira `suspension_pending` e não apaga dados. Reconcile: `POST /internal/billing/reconcile-subscriptions` com `x-internal-cron-secret`.

## Dados centrais

- Billing: `plans`, `user_subscriptions`, `subscription_addons`, `user_profiles`.
- MT5: `trading_accounts`, `mt5_connections`, `mt5_account_snapshots`, `mt5_positions`, `mt5_trades`.
- Regras: `prop_firms`, `programs`, `rule_set_versions`, `rule_definitions`, `rule_instances`, `rule_evaluations`.

RLS isola usuários. A service role existe somente no gateway, que ainda deve verificar ownership e admin explicitamente.

## Regras invioláveis

- Não imprimir, expor ou commitar `.env`, Stripe secret, `whsec`, service role, MetaApi token, senha MT5, cron secret ou API key.
- Nenhum segredo em `VITE_*`, frontend, migration, log ou documentação.
- Não alterar arquivo sujo não relacionado nem reverter trabalho do usuário.
- Não executar migration, Stripe, MetaApi ou deploy externo sem autorização explícita.
- Não criar Product/Price Stripe antes de verificar catálogo existente.
- Não confiar em UI para autorização/entitlement.
- Não misturar mudanças de Auth, billing, MetaApi e UI no mesmo sprint.
- Não criar dados falsos para esconder ausência de sync.
- Não publicar regra de mesa extraída por IA sem fonte oficial e revisão humana.
- TradingView é análise interna; sem execução ou navegação externa.

## Must-not-break

- `npm run dev` inicia a stack local completa.
- Checkout de compra abre `checkout.stripe.com`.
- Portal é restrito a assinante pago.
- Webhook valida assinatura sobre corpo bruto.
- Sessão de Checkout pertence ao usuário autenticado.
- Connect/sync bloqueiam custo sem entitlement.
- Account limit é aplicado antes do provisionamento.
- Falha de undeploy preserva conta/dados.
- Auth mantém sessão e continuação de plano.
- Dashboard tolera zero contas/dados nulos.
- Calculadora mantém fórmulas e unidades.
- Biblioteca exibe fonte/versão/disclaimer.
- Admin é validado no gateway.

## Como trabalhar com Codex

1. Uma tarefa e um resultado observável.
2. Arquivos permitidos e proibidos explícitos.
3. Ler implementação e `git status` antes de editar.
4. Menor diff funcional; sem refatoração ampla.
5. Validar rota, estados de erro/vazio e fluxo vizinho.
6. Rodar build/typecheck/testes proporcionais.
7. Buscar secrets no diff staged.
8. Stage somente do escopo e commit apenas quando autorizado.

## Relatório final padrão

```text
1. Resultado/root cause:
2. Comportamento alterado:
3. Arquivos alterados:
4. Validações e resultados:
5. Build/typecheck/tests:
6. Segurança e arquivos alheios:
7. Commit hash (se houver):
8. Riscos/bloqueios restantes:
```

Para detalhes, comece em [00 - Índice](./00-indice.md) e [12 - Guia Codex](./12-guia-codex-fortify.md).

## Biblioteca de regras auditável

- A rota `/rules` usa o dataset público de `src/data/propFirmRules.ts`.
- Entradas novas e auditáveis ficam em `src/data/prop-firms/`.
- Evidências oficiais ficam em `docs/fortify/research/prop-firms/`.
- A matriz canônica de 16 mesas fica em `coverage-matrix.md`.
- ASAP Funding Prop possui Challenge Express, Funded Express e Instant Account separados.
- NP Future possui Standard, Funded e Flash separados entre BlackArrow e MT5.
- O Sprint 2 adicionou cobertura oficial para FTMO, Apex, Hantec, Topstep, The Trading Pit, FundingPips, FundedNext e The5ers.
- FTMO/Apex/Hantec deixaram de publicar os placeholders legados; o histórico continua preservado no código para rastreabilidade.
- Mesas ainda no backlog não recebem programas fictícios ou inferidos.
- O regulamento oficial possui precedência sobre material comercial; conflitos permanecem visíveis no dataset e na UI.
- Apenas regras classificadas como `automatic_mt5` e com semântica completa podem alimentar avaliação automática. As demais permanecem manuais ou não suportadas.
- O vínculo auditável por conta fica em `account_rule_bindings`; detalhes de snapshot, hash, RLS e compatibilidade estão em `docs/fortify/rule-binding.md`.
- O motor operacional inicial fica em `src/lib/ruleEngine/` e usa o snapshot vinculado para perda diária, drawdown máximo e meta de lucro. Ausência de fase, base, histórico ou semântica confiável retorna `not_monitorable`; sem vínculo retorna `pending_binding`.
- A UI operacional fica em `/accounts/:accountId/rules`; o catálogo UUID anterior permanece apenas como configuração legada durante a migração controlada.
