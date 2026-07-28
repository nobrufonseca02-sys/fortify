---
name: debug
description: Use esta skill sempre que o usuário reportar um erro, bug ou comportamento inesperado no Fortify. Também use quando algo não funcionar como esperado mesmo sem mensagem de erro. NUNCA aplique um fix sem antes identificar a causa raiz.
---

# Debug — Análise de Causa Raiz

Você é um investigador de bugs especialista. Siga sempre estas 4 fases em ordem — nunca pule
direto para o fix.

## As 4 Fases do Debug

### Fase 1 — Entender o problema
Antes de qualquer coisa, responda:
- O que deveria acontecer?
- O que está acontecendo de fato?
- Em que momento o problema aparece?
- O problema é consistente ou intermitente?

### Fase 2 — Localizar a origem
Identifique onde está o problema:
- **Frontend** (Vite/React, SPA): erro no console do browser, estado do React Query desatualizado,
  ou componente renderizando com dado antigo/`undefined`
- **Gateway** (`services/metaapi-gateway`, Fastify): erro no log do processo local ou resposta
  incorreta de uma rota `/metaapi/*`, `/billing/*`, `/admin/*`
- **Supabase** (Postgres + RLS): query retornando vazio silenciosamente (RLS bloqueando sem erro
  explícito) ou erro de policy
- **Integração externa**: MetaApi ou Stripe falhando ou retornando dado inesperado

### Fase 3 — Identificar a causa raiz
Leia o código relevante antes de qualquer correção. Perguntas a responder:
- Por que este erro está acontecendo?
- O que no código está causando isso?
- Quando foi introduzido (se possível identificar via `git log`/`git blame`)?

### Fase 4 — Corrigir e confirmar
Só após entender completamente:
1. Aplique a correção mínima necessária — não refatore além do necessário
2. Explique o que foi mudado e por quê
3. Indique como confirmar que o problema foi resolvido (`npm run test`, clique manual, etc.)
4. Verifique se a correção não quebrou nada relacionado (`npm run lint && npm run typecheck && npm run test`)

## Erros mais comuns no Fortify

**Frontend (Vite/React/TanStack Query)**
- Card/tela não atualiza depois de uma ação → esqueceu de `queryClient.invalidateQueries()` (ver
  `refreshConnectionData()` em `Accounts.tsx` como referência)
- `useEffect` com array de dependências errado → loop infinito ou dado desatualizado
- Componente lazy (`React.lazy`) não aparece → checar se a rota foi adicionada em `App.tsx` E
  se está dentro do `<Suspense>`

**Gateway (Fastify)**
- `Cannot read properties of undefined` → dado externo (MetaApi/Stripe) sem o formato esperado,
  não validado antes de acessar
- Erro 401/403 inesperado → token do Supabase expirado, ou `userId` do body não bate com o token
  (ver `verifyRequestUser` em `server.ts`)
- Timeout/`ECONNREFUSED` chamando o gateway do frontend → gateway não está rodando
  (`npm run dev:gateway`) ou `VITE_METAAPI_GATEWAY_URL` errada

**Supabase / RLS**
- Query retorna `[]` (array vazio) sem erro nenhum → sintoma clássico de RLS bloqueando —
  não é "não tem dado", é "a policy não deixou ver". Confira a policy antes de assumir que a
  tabela está vazia.
- `relation does not exist` → migration não foi aplicada (`npx supabase db push`) ou nome de
  tabela errado
- Insert falha silenciosamente numa função `try/catch` genérica → sempre logue `error.message`
  do Supabase, ele costuma dizer exatamente qual policy/constraint bloqueou

## Regra de ouro

> Nunca aplique um fix sem entender a causa. Um fix sem causa raiz cria dois bugs onde havia um.
