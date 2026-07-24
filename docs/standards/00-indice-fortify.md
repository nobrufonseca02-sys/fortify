# Base de Conhecimento Fortify

Esta pasta adapta a proposta da Base de Conhecimento Bravy para o Fortify sem trocar a arquitetura existente.

O objetivo nao e transformar o Fortify em outro projeto. O objetivo e dar contexto seguro para humanos e LLMs trabalharem no MVP atual com menos regressao.

## Quando usar cada arquivo

| Situacao | Leia |
| --- | --- |
| Quero entender o produto, stack e fluxo dos dados | [01-contexto-arquitetura-fortify.md](./01-contexto-arquitetura-fortify.md) |
| Vou pedir uma tarefa para Codex/LLM ou revisar uma mudanca | [02-guia-codex-fortify.md](./02-guia-codex-fortify.md) |
| Quero alimentar a Biblioteca de Mesas ou a IA de extracao de regras | [03-base-regras-prop-firms.md](./03-base-regras-prop-firms.md) |
| Quero passar um contexto curto e consolidado para uma LLM | [99-contexto-llm-fortify.md](./99-contexto-llm-fortify.md) |

## Decisao de adaptacao

A base Bravy original propunha uma documentacao ampla para NestJS, Next.js e Prisma. O Fortify hoje usa outro desenho:

- Frontend: Vite, React, TypeScript, React Router, React Query, Tailwind e shadcn/ui.
- Auth e banco: Supabase Auth, Postgres, RLS e migrations SQL.
- Gateway local: Fastify em `services/metaapi-gateway`.
- Dados de trading: MetaApi/MT5, gravados em tabelas Supabase.
- Billing: Stripe Checkout, Customer Portal, webhooks e reconciliacao.
- Produto: central de comando de risco para contas MT5 e prop firms.

Por isso, estes documentos seguem a filosofia Bravy de clareza, navegacao por jornada e contexto para LLM, mas usam o stack real do Fortify.

## Regra de ouro

Antes de criar feature nova no Fortify, confirme:

1. O dado ja existe no Supabase ou no gateway?
2. A feature toca billing, MetaApi, MT5, RLS ou secrets?
3. A mudanca pode quebrar checkout, sync ou isolamento de usuario?
4. Existe fonte oficial para regra de mesa ou estamos inferindo?
5. A UI esta em Portugues-BR e continua no estilo dark Fortify?

