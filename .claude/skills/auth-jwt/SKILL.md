---
name: auth-jwt
description: Use esta skill quando precisar implementar ou revisar login, logout, proteção de rotas, controle de acesso ou qualquer funcionalidade de autenticação e autorização no Fortify.
---

# Autenticação — Supabase Auth

Você é especialista em autenticação no Fortify. O projeto usa **Supabase Auth** como único
mecanismo de autenticação — não é uma escolha a ser revisitada, é a base de todo o sistema
(sessões, RLS, e o gateway inteiro dependem disso).

## Regras absolutas

- **Sempre use Supabase Auth** (`supabase.auth.*`) — nunca implemente login/senha customizado,
  JWT próprio, NextAuth ou Clerk.
- **Nunca leia/escreva o token manualmente** — o cliente Supabase (`src/integrations/supabase/client.ts`)
  já gerencia sessão via `localStorage` com refresh automático (`persistSession: true`,
  `autoRefreshToken: true`).
- O hook `useAuth()` (`src/hooks/useAuth.ts`) é a única fonte de verdade sobre `session`/`user`
  no frontend — não leia o Supabase client diretamente para checar login em componentes.
- **Nunca coloque a service-role key do Supabase no frontend** — ela só existe no
  `services/metaapi-gateway` (variável de ambiente `SUPABASE_SERVICE_ROLE_KEY`), nunca em código
  que roda no browser.

## Arquitetura real

```
Frontend (React):
  src/hooks/useAuth.ts        → contexto de sessão, usado em toda a app
  src/App.tsx                 → ProtectedRoutes redireciona pra /auth se !session
  src/pages/AuthPage.tsx      → tela de login/cadastro

Gateway (Fastify, services/metaapi-gateway):
  Toda rota privilegiada exige header `Authorization: Bearer <access_token>`
  O gateway valida o token via supabase.auth.getUser(token) — nunca confia
  cegamente no que o frontend manda (userId no body é sempre revalidado
  contra o token, ver verifyRequestUser em server.ts)
  Rotas /admin/* exigem além disso uma linha em user_roles (verifyAdminRequest)
```

## Chamando o gateway autenticado

```ts
import { gatewayJsonHeaders } from '@/lib/gateway';

fetch(`${gatewayUrl}/metaapi/connect`, {
  method: 'POST',
  headers: gatewayJsonHeaders(session.access_token),
  body: JSON.stringify({ ... }),
});
```

## Controle de acesso via RLS, não via `role` em memória

Diferente de um backend Express com middleware de autorização, o Fortify aplica controle de
acesso principalmente via **Row Level Security no Postgres** — `auth.uid() = user_id` nas
policies é a barreira real, não uma checagem no componente React. Um botão escondido no frontend
não é controle de acesso; a policy no banco (ou a revalidação no gateway) é.

Para admin especificamente: existe uma tabela `user_roles` e uma função `has_role()` — veja
`supabase/migrations/*secure_owner_admin_bootstrap*.sql`.

## Variáveis de ambiente envolvidas

```env
# Frontend (.env)
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...   # chave pública, ok expor no bundle

# Gateway (services/metaapi-gateway/.env)
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...       # nunca no frontend, bypassa RLS
```
