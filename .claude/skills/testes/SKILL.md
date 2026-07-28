---
name: testes
description: Use esta skill quando o usuário quiser criar testes automatizados para qualquer parte do Fortify — funções, hooks, fluxos completos ou componentes React.
---

# Testes Automatizados — Fortify

Você segue TDD quando fizer sentido (escreva o teste, veja falhar, implemente o mínimo para
passar), mas priorize sempre cobrir comportamento real de negócio — regras de risco, vínculo de
regras, fluxo de conexão MT5 — não cobertura por cobertura.

## Ferramentas (o que o projeto já usa — não introduza Jest)

- **Runner:** Vitest (`npm run test`, `npm run test:watch`)
- **Componentes React:** `@testing-library/react` + `@testing-library/jest-dom`
- **Rodar um arquivo específico:** `npx vitest run src/test/Accounts.test.tsx`
- **Filtrar por nome de teste:** `npx vitest run -t "nome do teste"`

## Padrão de mock — mocke o hook, não a query do Supabase

O padrão estabelecido no projeto é mockar o **módulo do hook** diretamente, não tentar simular a
cadeia de chamadas do Supabase em profundidade quando não é o que está sendo testado:

```ts
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' }, session: { access_token: 'token-1' } }),
}));

vi.mock('@/hooks/useAccountsStore', () => ({
  useAccountsStore: () => ({ accounts: [], removeAccount: vi.fn() }),
}));
```

Quando o teste precisa mesmo validar uma chamada ao Supabase (ex.: o fluxo de conectar conta),
mocke só `@/integrations/supabase/client` com as tabelas específicas envolvidas — veja
`src/test/Accounts.test.tsx` e `src/test/accountProvisioning.test.ts` como referência real.

Componentes que usam `useQueryClient()` precisam de um `<QueryClientProvider>` envolvendo o
render no teste — sem isso o teste quebra com "No QueryClient set".

## O que sempre testar

Para cada funcionalidade nova, cubra:
1. **Caminho feliz** — funciona com dados corretos
2. **Dado inválido/incompleto** — o que acontece (ex.: seleção de regra da Biblioteca inválida)
3. **Sem autenticação** — comportamento sem sessão
4. **Falha de dependência externa sem travar o usuário** — ex.: gateway MetaApi falha mas a conta
   já foi criada — o teste deve confirmar que o usuário não fica "preso" (dead end), e sim vê o
   estado degradado na tela

## Regras

- Cada teste deve ser independente — não dependa de outro teste rodar antes
- Nomes de teste descrevem o comportamento, não a implementação: "lands on the rules page even
  when the gateway fails (no dead end)" em vez de "test handleCreate error branch"
- Ao mudar uma regra de negócio (regra de risco, vínculo de conta, gate de plano), atualize ou
  adicione teste na mesma alteração — não deixe pra depois
