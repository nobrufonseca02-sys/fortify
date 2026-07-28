---
name: arquitetura
description: Use esta skill quando for adicionar um novo módulo, serviço ou fluxo grande ao Fortify, decidir onde algo deve morar (frontend, gateway ou Supabase), ou avaliar uma mudança arquitetural. Não use para escolher uma stack do zero — o Fortify já tem uma definida.
---

# Arquitetura do Fortify

Você é o guardião da arquitetura do Fortify. O projeto já existe e tem uma stack estabelecida —
sua função é manter consistência, não reinventar. Antes de propor algo novo, confirme que não
existe um padrão já usado no repositório para o mesmo problema.

## Stack real do Fortify (não a stack genérica de outro projeto)

- **Frontend:** Vite + React 18 + TypeScript + React Router v6 → SPA, sem SSR/Next.js
- **UI:** shadcn-ui + Tailwind CSS + `motion/react` para animação
- **Estado de servidor:** TanStack Query (`@tanstack/react-query`)
- **Banco + Auth:** Supabase (Postgres + Auth + Row Level Security + Edge Functions) — é o
  backend principal. Acesso via `@supabase/supabase-js`, não via API REST própria para CRUD comum.
- **Gateway dedicado:** `services/metaapi-gateway` (Fastify + TypeScript) — serviço separado que
  guarda o token da MetaApi e expõe rotas específicas (`/metaapi/*`, `/admin/*`, `/billing/*`)
  autenticadas com o JWT do Supabase (`Authorization: Bearer <access_token>`). O frontend nunca
  fala com a MetaApi ou com o Stripe diretamente — sempre por aqui.
- **Sem ORM:** nem Prisma, nem Sequelize, nem `pg` cru — tudo via cliente Supabase
  (`supabase.from(tabela).select/insert/update()`), com RLS fazendo o controle de acesso.

## Onde cada coisa deve morar

```
src/
├── pages/        # uma página por rota (React Router)
├── components/   # componentes reutilizáveis (ui/ = shadcn puro)
├── hooks/        # hooks customizados, geralmente envolvendo TanStack Query
├── lib/          # funções puras e orquestração (ex.: ruleBinding.ts, accountProvisioning.ts)
├── data/         # datasets estáticos/curados (ex.: catálogo de regras de prop firm)
└── integrations/supabase/  # cliente Supabase compartilhado + tipos gerados

services/metaapi-gateway/src/  # rotas Fastify, chamadas à MetaApi, Stripe, admin

supabase/migrations/  # schema versionado em SQL, com RLS obrigatória em toda tabela nova
```

## Antes de criar qualquer arquivo novo

1. Existe um padrão parecido já no repo? Leia antes de inventar.
2. A lógica é UI, orquestração ou acesso a dado? Isso decide se vai em `components/`, `lib/` ou
   dentro de um hook.
3. Precisa de um segredo (token, chave privada)? Só pode existir em `services/metaapi-gateway` —
   nunca no frontend.
4. Mexe em tabela do Supabase? A migration precisa habilitar RLS e ter política explícita —
   nunca deixe uma tabela nova sem RLS.

## Regra de ouro

Se a ideia exige uma peça de infraestrutura que o Fortify não tem hoje (fila, cache Redis,
segundo banco, microsserviço novo), pare e questione se é realmente necessário nesse estágio —
não adicione infraestrutura especulativa.
