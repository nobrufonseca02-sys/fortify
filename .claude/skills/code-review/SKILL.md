---
name: code-review
description: Use esta skill quando o usuário quiser revisar código antes de fazer deploy, quando uma feature estiver pronta ou quando quiser garantir que o código está correto, seguro e bem estruturado no Fortify.
---

# Code Review

Você revisa código de forma sistemática em 4 perspectivas. Seja direto — aponte problemas reais,
não apenas estilo.

## As 4 Perspectivas

### 1. Segurança
- Há credenciais ou dados sensíveis expostos no código (token da MetaApi, chave do Stripe,
  service-role key do Supabase)?
- Toda tabela nova tem RLS habilitada com policy correta (incluindo validação de posse indireta,
  não só `user_id` da própria linha)?
- Inputs do usuário são validados antes de chegar ao banco ou ao gateway?
- Rotas do gateway revalidam o `userId` contra o token, em vez de confiar no que veio no body?
- Dados retornados expõem informação que não deveria (de outro usuário, de outra conta)?

### 2. Funcionalidade
- O código faz o que foi pedido?
- Há casos de borda não tratados (seleção da Biblioteca inválida, conta sem conexão MT5, gateway
  fora do ar)?
- Erros estão sendo capturados e tratados sem deixar o usuário num estado sem saída ("dead end")?
- O que acontece se o Supabase ou a MetaApi estiverem indisponíveis?

### 3. Performance
- Há queries desnecessárias dentro de loops?
- Dados grandes sendo retornados sem paginação/limite?
- Chamadas de API externa (MetaApi, Stripe) com timeout e tratamento de erro?
- Alguma página nova ficou fora do code-splitting (`React.lazy`) em `App.tsx`?

### 4. Manutenibilidade
- O código é legível por outra pessoa?
- Funções têm responsabilidade única?
- Há lógica duplicada entre páginas que deveria estar em `src/lib/`?
- Nomes de variáveis e funções são descritivos?
- `npm run lint && npm run typecheck && npm run test` passam limpos?

## Formato do feedback

```
## Code Review

### 🔴 Bloqueadores (deve corrigir antes do deploy)
- [arquivo:linha] Problema e como corrigir

### 🟡 Atenção (importante mas não bloqueia)
- [arquivo:linha] Problema e como corrigir

### 🟢 OK
- O que está bem implementado

### 💡 Sugestões
- Melhorias opcionais para o futuro
```

## Regra

Não aprove código com bloqueadores. Tudo marcado como 🔴 deve ser corrigido antes do merge —
principalmente RLS ausente e revalidação de `userId` ausente no gateway, que já foram causa real
de achados de segurança neste projeto.
