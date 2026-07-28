---
name: banco-postgres
description: Use esta skill quando precisar criar tabelas, alterar schema, criar relações, índices, políticas de RLS ou migrations no banco do Fortify (Supabase/Postgres).
---

# Banco de Dados — Supabase (Postgres + RLS)

Você é especialista no banco do Fortify. O acesso normal aos dados é via cliente
`@supabase/supabase-js` (`supabase.from('tabela').select/insert/update()`), nunca via `pg` cru
nem ORM (sem Prisma, sem Sequelize) — a única exceção é o serviço `services/metaapi-gateway`, que
também usa o cliente Supabase (com a service-role key) para operações privilegiadas.

## Migrations

- Toda mudança de schema vira um arquivo SQL novo em `supabase/migrations/`, nomeado
  `YYYYMMDDHHMMSS_descricao.sql` — nunca edite uma migration já aplicada, crie uma nova.
- Rode `npx supabase db push` (com `SUPABASE_ACCESS_TOKEN` no ambiente) para aplicar; não existe
  CLI instalada globalmente neste projeto, use sempre `npx supabase`.

## Regra inegociável: RLS em toda tabela nova

Toda tabela que guarda dado de usuário precisa de `enable row level security` **na mesma
migration** que a cria, com política explícita (normalmente `auth.uid() = user_id`, ou validando
posse via join com a tabela pai quando a tabela referencia uma conta/registro de outro usuário).
Uma tabela sem RLS com dado de usuário é uma falha de segurança grave, não um detalhe a
resolver depois — já causou um achado real numa revisão de segurança deste projeto.

Ao validar posse indireta (ex.: uma tabela que referencia `trading_account_id`), sempre confira
que a policy valida a posse da linha-pai, não só o `user_id` do registro em si — inserir um
`user_id` correto mas um `trading_account_id` de outra pessoa é um erro comum que passa
despercebido.

## Padrões obrigatórios de coluna

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE  -- quando aplicável
```

## Tipos recomendados

| Dado | Tipo PostgreSQL |
|------|----------------|
| ID | UUID |
| Texto curto | TEXT (Postgres não penaliza TEXT vs VARCHAR) |
| Número com casas decimais (saldo, %) | NUMERIC |
| Data e hora | TIMESTAMPTZ |
| Verdadeiro/Falso | BOOLEAN |
| Lista de opções fixas | criar um `enum` do Postgres (veja `rule_definition_key` como exemplo) |

## Regras

- Sempre use UUID em vez de inteiro sequencial para IDs
- Nunca desabilite RLS "temporariamente" — se travar o desenvolvimento, ajuste a policy
- Toda policy de INSERT/UPDATE que referencia outra tabela (ex.: `trading_account_id`) precisa de
  um `exists (select 1 from ... where ... and user_id = auth.uid())` — não confie só no `user_id`
  da própria linha
- Rode a query de verificação (`select relname, relrowsecurity from pg_class ...`) depois de toda
  migration que mexe em tabela nova, se tiver acesso ao SQL Editor de produção
