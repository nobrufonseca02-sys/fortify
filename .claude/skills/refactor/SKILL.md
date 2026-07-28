---
name: refactor
description: Use esta skill quando o usuário quiser reorganizar, limpar ou melhorar código existente do Fortify sem mudar o comportamento. Use também quando arquivos estiverem muito grandes, houver código duplicado ou a estrutura estiver confusa.
---

# Refactor — Reorganizar sem Quebrar

Você é especialista em melhorar código de forma segura e incremental. Nunca faça tudo de uma vez.

## Processo obrigatório

1. **Analise antes de mudar** — leia o código e explique o que está errado
2. **Proponha o plano** — mostre como vai ficar antes de alterar
3. **Execute em partes pequenas** — um arquivo por vez quando possível
4. **Confirme após cada mudança** — `npm run lint && npm run typecheck && npm run test`
5. **Documente as decisões** — explique por que ficou assim, especialmente se algo antigo foi
   mantido de propósito (ex.: comentário no `accountProvisioning.ts` explicando por que
   `Accounts.tsx` não navega após conectar, diferente do padrão usado em outro lugar)

## Sinais de que código precisa de refactor

- Arquivo com mais de ~600-900 linhas fazendo várias coisas (o projeto já tem alguns assim —
  `CreateAccount.tsx`, `AccountRuleManagement.tsx` — não é motivo pra parar tudo e refatorar sem
  ser pedido, mas é sinal a considerar se for mexer ali de qualquer forma)
- Lógica duplicada em 2+ lugares (ex.: a mesma sequência insert-conta → conectar-gateway →
  salvar-vínculo reimplementada em cada página — foi exatamente esse tipo de duplicação que gerou
  o bug do "dead end" corrigido nesta base, hoje centralizado em
  `src/lib/accountProvisioning.ts`)
- Lógica de negócio misturada com JSX/apresentação
- Nomes genéricos (`data`, `info`, `temp`, `x`) em vez de descritivos

## Estrutura real do projeto (para saber onde mover código)

```
src/
├── pages/                      # uma página por rota
├── components/                 # componentes reutilizáveis (ui/ = shadcn puro)
│   └── rules/                  # ex.: RuleBindingSelector.tsx
├── hooks/                      # hooks customizados (React Query por cima do Supabase)
├── lib/                        # orquestração e funções puras compartilhadas entre páginas
│   (ex.: ruleBinding.ts, accountProvisioning.ts, libraryRuleSelection.tsx, betaReadiness.ts)
├── data/                       # datasets estáticos curados
└── test/                       # testes Vitest, um arquivo por página/módulo testado

services/metaapi-gateway/src/   # rotas Fastify, chamadas MetaApi/Stripe
```

Se uma lógica é usada por **mais de uma página**, ela pertence em `src/lib/`, não duplicada
dentro de cada página — esse é o padrão que o projeto já segue (veja como
`provisionAndConnectTradingAccount` foi extraído de duas páginas diferentes).

## Regras

- Nunca refatore E adicione feature ao mesmo tempo — são commits separados
- Se não tiver teste cobrindo o comportamento atual, considere adicionar antes de refatorar algo
  arriscado (regra de risco, fluxo de conexão MT5, RLS)
- Prefira nomes descritivos: `provisionAndConnectTradingAccount()` em vez de `doConnect()`
- Uma função deve fazer uma coisa só — se tiver "e" implícito no que ela faz, considere quebrar
