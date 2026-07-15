# Gateway Node/Fastify

## Papel do gateway

O gateway em `services/metaapi-gateway/` concentra tudo que não pode ser confiado ao navegador:

- autenticação e autorização de billing, MetaApi e ADM;
- Stripe Checkout, Portal, webhook e reconciliação;
- entitlement pago e limite de contas;
- provisionamento, sync, suspensão e reativação MetaApi;
- uso da Supabase service role;
- rate limiting, CORS e logs sanitizados.

O serviço local usa a porta `3001`. O arquivo central atual é `services/metaapi-gateway/src/server.ts`; uma futura divisão em módulos deve ser feita em sprint próprio, com testes, e não durante um bugfix.

## Endpoints principais

| Método e rota | Proteção | Função |
| --- | --- | --- |
| `GET /health` | Pública | Saúde e configuração sem revelar valores. |
| `GET /billing/subscription-status` | JWT | Assinatura, plano, uso e entitlement. |
| `POST /billing/create-checkout-session` | JWT | Nova assinatura. |
| `POST /billing/confirm-checkout-session` | JWT + ownership | Fallback seguro após Checkout. |
| `POST /billing/create-addon-checkout-session` | JWT + plano pago | Compra de conta extra. |
| `POST /billing/create-portal-session` | JWT + Customer pago | Gestão da assinatura existente. |
| `POST /billing/webhook` | Stripe signature | Eventos Stripe. |
| `POST /metaapi/connect` | JWT + entitlement | Provisiona/conecta MT5. |
| `POST /metaapi/sync` | JWT + entitlement + ownership | Sincroniza dados. |
| `POST /internal/billing/reconcile-subscriptions` | `x-internal-cron-secret` | Revalida assinaturas e suspende acessos. |
| `/admin/*` | JWT + admin | Operações administrativas. |

## Variáveis de ambiente

Use `services/metaapi-gateway/.env.example` como inventário de nomes. Valores reais ficam apenas no `.env` local ou no cofre do ambiente.

Grupos principais:

- Supabase: URL e service role.
- MetaApi: token, região e limites de provisionamento.
- Stripe: secret, webhook secret, URLs de retorno e endpoint ID.
- Operação: `PORT`, `INTERNAL_CRON_SECRET`, flags de beta fallback.

Nunca copie valores para documentação, frontend, migration, log ou issue.

## CORS e origem

Desenvolvimento deve aceitar as origens locais necessárias. Produção deve usar uma allowlist explícita; não use wildcard com credenciais. Ao adicionar uma origem, valide método, headers e preflight sem ampliar produção desnecessariamente.

## Como rodar e testar

Na raiz:

```powershell
npm run dev:gateway
```

Ou stack completa:

```powershell
npm run dev
```

Health check:

```powershell
Invoke-RestMethod -Method Get -Uri http://localhost:3001/health
```

Typecheck do serviço:

```powershell
npx tsc --noEmit --project services/metaapi-gateway/tsconfig.json
```

## Padrão de endpoint protegido

1. Aplicar rate limit.
2. Validar Bearer JWT com Supabase.
3. Validar IDs, slug e body.
4. Derivar `user_id` do token.
5. Verificar ownership/role/entitlement.
6. Executar operação externa.
7. Persistir estado coerente.
8. Logar evento com dados mascarados.
9. Retornar mensagem sanitizada em português quando exposta ao usuário.

## Falhas comuns

| Sintoma | Diagnóstico | Ação |
| --- | --- | --- |
| Backend não responde | Processo ausente | Rode `npm run dev` ou `npm run dev:gateway`. |
| `EADDRINUSE` | Porta 3001 ocupada | Identifique o processo; não mate processos indiscriminadamente. |
| CORS blocked | Origem não permitida ou proxy ignorado | Use `/api` em dev e revise allowlist. |
| Wrong API base URL | `VITE_*` aponta para host/porta errados | Corrija configuração do ambiente. |
| Stripe config missing | Secret ausente no gateway | Configure `.env` local/secret store; nunca frontend. |
| Supabase falha | URL/service role ausente ou inválida | Corrija ambiente sem imprimir a chave. |
| MetaApi falha | Token, saldo, região ou conta inválidos | Preserve dados e retorne estado recuperável. |

## Não quebrar

- `/billing/webhook` precisa do corpo bruto para validar assinatura.
- `/metaapi/connect` e `/metaapi/sync` verificam entitlement antes de gerar custo.
- Reconcile rejeita segredo ausente/incorreto.
- Falha ao undeploy não apaga a conta; vira `suspension_pending`.
- IDs e mensagens sensíveis permanecem mascarados nos logs.
