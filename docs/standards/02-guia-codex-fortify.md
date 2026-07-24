# Guia Codex/LLM para o Fortify

Este arquivo adapta a filosofia de "vibecoding" da base Bravy para o Fortify.

Use este guia antes de pedir mudancas para uma LLM ou revisar codigo gerado.

## Papel da LLM no Fortify

A LLM pode acelerar implementacao, QA, documentacao e refino de UI. Ela nao substitui verificacao de seguranca, fonte oficial de regra, teste de checkout ou validacao de dados reais.

## Regras inviolaveis

1. Nao commitar `.env`.
2. Nao imprimir secrets.
3. Nao colocar secrets em codigo, migration, log ou documento.
4. Nao criar produto/preco Stripe sem pedido explicito.
5. Nao alterar schema Supabase sem migration aditiva.
6. Nao resetar banco.
7. Nao quebrar RLS ou isolamento por usuario.
8. Nao mover protecao de assinatura/MetaApi para o frontend.
9. Nao logar senha MT5.
10. Nao usar dados falsos onde o produto promete leitura real.

## O que sempre verificar antes de editar

| Se a tarefa envolve | Verificar primeiro |
| --- | --- |
| Checkout ou planos | `src/lib/billing.ts`, `src/pages/PricingPage.tsx`, `services/metaapi-gateway/src/server.ts` |
| MT5/MetaApi | entitlement no gateway, `useMT5.ts`, `mt5_connections` |
| Regras | `rule_definitions`, `rule_instances`, `rule_evaluations` |
| Biblioteca de Mesas | `usePropFirmLibrary.ts`, `PropFirmLibrary.tsx`, fonte oficial |
| Dashboard | dados existentes em contas, posicoes, trades e avaliacoes |
| Settings | `user_profiles`, Supabase Auth, portal Stripe |
| Admin | exigir admin no gateway, mascarar IDs externos |

## Prompt base recomendado

Use este prompt quando for pedir uma tarefa ao Codex:

```text
Atue como engenheiro senior do Fortify.
Preserve o stack atual: Vite/React, Supabase, Fastify gateway, Stripe e MetaApi.
Nao altere billing, MetaApi, MT5, Supabase schema, regras ou UI fora do escopo.
Leia os arquivos relevantes antes de editar.
Use mudancas pequenas e verificaveis.
Nao crie dados falsos.
Nao exponha secrets.
Rode apenas as validacoes necessarias.
Explique arquivos alterados, testes e riscos restantes.
```

## Checklist de uma mudanca segura

1. Ler arquivos relevantes.
2. Identificar se a mudanca e frontend, gateway, migration ou dados.
3. Confirmar que nao ha alteracao fora de escopo.
4. Fazer patch pequeno.
5. Rodar validacao minima:
   - docs: sem build obrigatorio;
   - frontend: `npm run build`;
   - gateway: `npx tsc --noEmit --project services/metaapi-gateway/tsconfig.json`;
   - full stack: `npm run dev` quando mexer em runtime local, checkout ou gateway.
6. Checar `git diff`.
7. Escanear diff por secrets.
8. Nao stagear arquivos sujos nao relacionados.

## Anti-patterns comuns

| Anti-pattern | Por que e ruim | O que fazer |
| --- | --- | --- |
| Criar backend NestJS novo | O gateway atual e Fastify | Evoluir `services/metaapi-gateway` |
| Criar app Next.js paralelo | O frontend atual e Vite/React | Evoluir `src/` |
| Usar Prisma | O banco e Supabase migrations/RLS | Criar SQL aditivo em `supabase/migrations` |
| Tratar plano apenas na UI | Usuario pode chamar API direto | Manter gate no gateway |
| Popular regras sem fonte | Pode gerar violacao errada | Exigir `source_url`, data e review |
| Misturar card de pricing em Settings | Confunde fluxo de conta | Pricing fica em `/pricing`; settings mostra resumo |
| Usar `prod_` como preco Stripe | Checkout exige `price_` | Validar `stripe_price_id` |

## Padrao de resposta final para tarefas tecnicas

Uma boa resposta deve dizer:

- o que mudou;
- onde mudou;
- como foi validado;
- o que ficou fora do escopo;
- riscos restantes, se houver.

Nao incluir secrets ou valores de `.env`.

