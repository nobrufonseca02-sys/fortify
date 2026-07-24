# Contexto Fortify para LLMs

Use este arquivo como contexto curto para Codex/LLMs antes de tarefas no Fortify.

## Identidade do produto

Fortify e uma central de comando de risco para traders de prop firms com contas MT5. O produto conecta MT5 via MetaApi, sincroniza contas, posicoes e trades, aplica regras de prop firms e mostra alertas de risco em Portugues-BR.

Fortify nao executa ordens.

## Stack

- Frontend: Vite, React, TypeScript, React Router, React Query, Tailwind, shadcn/ui.
- Backend local: Fastify em `services/metaapi-gateway/src/server.ts`.
- Banco/auth: Supabase Auth, Postgres, RLS e migrations SQL.
- Billing: Stripe Checkout, Customer Portal, webhook e reconciliacao.
- Trading data: MetaApi/MT5 via gateway.

Nao assumir NestJS, Next.js ou Prisma.

## Comando local

```sh
npm run dev
```

Sobe frontend em `http://localhost:8080` e gateway em `http://localhost:3001`.

## Regras de seguranca

- Nunca commitar `.env`.
- Nunca imprimir secrets.
- Nunca logar senha MT5.
- Nunca expor service role, MetaApi token ou Stripe secret ao frontend.
- Mudancas de schema devem ser aditivas.
- RLS e isolamento por usuario sao obrigatorios.

## Billing e MetaApi

MetaApi so pode ser usado por usuario com assinatura paga ativa e `paid_until` valido.

Sem plano, beta free, plano vencido, cancelado, `past_due`, `unpaid`, `incomplete` ou falha de pagamento devem bloquear connect/sync e, quando aplicavel, suspender contas MetaApi.

Essa protecao fica no gateway, nao apenas na UI.

## Dados centrais

- `trading_accounts`;
- `mt5_connections`;
- `mt5_positions`;
- `mt5_trades`;
- `mt5_account_snapshots`;
- `prop_firms`;
- `programs`;
- `rule_set_versions`;
- `rule_definitions`;
- `rule_instances`;
- `rule_evaluations`;
- `plans`;
- `user_subscriptions`.

## Biblioteca de Mesas

Use apenas fontes oficiais para regras:

1. pagina oficial de regras;
2. PDF oficial de termos;
3. FAQ oficial;
4. contrato/dashboard do cliente;
5. email oficial de suporte.

Evite blogs, afiliados, videos e prints soltos como fonte primaria.

Cada regra precisa preservar fonte, data de captura, programa, fase, account size, unidade, severidade e status de revisao.

## Tipos de regra mais importantes

- perda diaria maxima;
- perda total maxima;
- trailing drawdown;
- meta de lucro;
- dias minimos;
- consistencia;
- inatividade;
- restricao de noticias;
- scalping;
- maximo de posicoes simultaneas;
- limite de payout/lucro.

## Principio de implementacao

Leia o codigo existente, siga o padrao local, mude pouco, valide o caminho tocado e nao invente dados.

