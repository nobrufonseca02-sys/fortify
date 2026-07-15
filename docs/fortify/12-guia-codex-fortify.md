# Guia prático de Codex para o Fortify

## Regras de trabalho

1. Dê uma tarefa concreta por prompt.
2. Declare resultado esperado, arquivos permitidos e arquivos proibidos.
3. Peça leitura do código atual antes da edição.
4. Proíba refatoração ampla e novas features quando o sprint for um bugfix.
5. Exija estados de loading, erro, vazio e dados nulos quando houver UI.
6. Defina comandos de validação proporcionais ao risco.
7. Peça `git status` antes e depois.
8. Não autorize alteração de `.env`, migration ou serviço externo por implicação.
9. Não toque em alterações sujas não relacionadas.
10. Exija relatório final com evidência e risco residual.

## Bloco de segurança reutilizável

Inclua este bloco em tarefas de código:

```text
Git safety:
- preserve unrelated dirty/untracked files
- never commit .env, .codex-logs, .agents or supabase/.temp
- never expose Stripe secrets, webhook secrets, Supabase service role,
  MetaApi token, MT5 passwords or API keys
- scan the staged diff before commit
- stage only files explicitly allowed by this task
```

## Estrutura ideal de prompt

```text
Act as the Fortify [área] engineer.

Goal:
[um resultado observável]

Allowed files:
- [lista curta]

Do not change:
- [áreas vizinhas de risco]

Required behavior:
1. [critério]
2. [critério]

Validation:
1. [rota/fluxo]
2. [comando]

Git safety:
[bloco padrão]

Final report:
1. Root cause/result:
2. Files changed:
3. Validation:
4. Commit hash:
5. Remaining risks:
```

## Matriz rápida de escopo

Use esta tabela como ponto de partida, reduzindo ainda mais o escopo sempre que possível.

| Tarefa | Arquivos normalmente permitidos | Proibidos sem autorização explícita |
| --- | --- | --- |
| Ajuste visual de uma página | A página e, se necessário, um componente direto | Gateway, migrations, billing e páginas vizinhas |
| Checkout/Pricing | `PricingPage.tsx`, `src/lib/billing.ts`, rota de billing comprovadamente necessária | MetaApi, Auth visual, regras e catálogo Stripe externo |
| Configurações/perfil | `SettingsPage.tsx`, hook já usado e migration aditiva se autorizada | Pricing, webhook, MT5 e ADM |
| Dashboard | `Dashboard.tsx` e componente pequeno em `components/dashboard/` | Backend, schema, Pricing, Auth e dados fictícios |
| Calculadora | `RiskCalculator.tsx`, `riskCalculator.ts` e teste focado | Regras de conta, MT5, billing e Dashboard |
| TradingView | `components/tradingview/` e asset nomeado | Rotas, calculadora (salvo contrato de handoff), backend e APIs externas |
| Billing backend | Rotas/funções de billing no gateway e testes focados | UI não relacionada, MetaApi além do guard necessário, catálogo externo sem autorização |
| MetaApi | Rotas/funções MetaApi e testes focados | Stripe catalog, Dashboard visual e regras não relacionadas |
| Banco/RLS | Nova migration aditiva e tipos, quando autorizados | Migration aplicada, reset/seed destrutivo e dados existentes |
| Documentação | Pasta `docs/` explicitamente indicada | `src/`, `services/`, `supabase/`, assets, env e scripts |

Arquivos sujos fora da linha “permitidos” continuam pertencendo ao usuário: não editar, restaurar, stagear ou commitar.

## Templates por tarefa

### Alteração visual na Auth

```text
Work only on the Fortify Auth page visual requested below.
Allowed: src/pages/AuthPage.tsx and the explicitly named local asset.
Preserve Supabase Auth behavior, submit handlers, reset flow, intended plan
continuation and the black-hole video unless the request explicitly changes it.
Do not touch App routes, billing, gateway, MT5, Supabase or global styles.
Validate /auth in desktop/mobile and run npm run build.
```

### Bug de Pricing/Checkout

```text
Fix only the reported Pricing/Checkout behavior.
Inspect src/pages/PricingPage.tsx, src/lib/billing.ts and the relevant gateway
route. New/Beta Free purchases must call create-checkout-session and return a
checkout.stripe.com URL. Portal is only for an existing paid Stripe subscriber.
Do not create Stripe Products/Prices or change webhook unless evidence requires it.
Validate plan CTA, returned domain, canceled/success states and npm run build.
```

### Atualização de Stripe Price

```text
Audit the existing Product and active recurring Prices first. Confirm currency,
amount and interval. Update only the plan mapping requested. Never treat prod_ as
price_. Do not create a new Price unless no valid existing Price matches and that
external action is explicitly authorized. Do not print or commit Stripe secrets.
Validate Checkout in test mode and report the exact non-secret Price ID used.
```

### Auditoria de ciclo MetaApi

```text
This is an audit-only task. Do not edit files.
Trace webhook -> user_subscriptions -> getUserEntitlement -> /metaapi/connect and
/metaapi/sync -> suspendUserMetaApiAccounts -> reconcile. Verify no plan,
beta_free, invalid status and expired paid_until fail before MetaApi cost. Verify
failed undeploy becomes suspension_pending without deleting data. Report files and
line references that would need a later implementation sprint.
```

### Polimento do Dashboard

```text
Work only on src/pages/Dashboard.tsx [and named small dashboard component].
Use existing account, snapshot, position, trade and evaluation data. Do not add
API calls or fake account/trade data. Preserve MarketTicker and existing sections.
Handle zero accounts, failed sync and null arrays. Run npm run build.
```

### Alteração na Biblioteca de Regras

```text
Work only on the requested Rules/Prop Firm UI behavior. Preserve source URL,
verified date, version and official-terms disclaimer. Do not change formulas,
schema or seed data unless separately authorized. Never publish AI-extracted
rules as verified without human review. Test empty, pending and verified states.
```

### Mudança na Calculadora de Risco

```text
Change only the requested calculator input/output. Keep calculations in typed,
pure functions in src/lib/riskCalculator.ts and UI wiring in RiskCalculator.tsx.
Do not change MT5, rules engine or TradingView handoff. Add/adjust focused tests
for boundary values, zero/invalid input and rounding. Run npm run build and the
focused test command.
```

### Correção do botão TradingView

```text
Work only in src/components/tradingview/TradingViewProvider.tsx [and named asset].
Preserve in-app popup, OANDA:XAUUSD default, preset/manual symbol, load/reload,
close and calculator handoff. Do not add external navigation or order execution.
Validate /dashboard and /risk-calculator, then run npm run build.
```

### Troca de logo/branding

```text
Replace only the specified Fortify brand render/asset. Preserve layout, routes and
behavior. Use the exact local asset; do not approximate or generate a replacement.
Do not alter TradingView branding, Auth behavior or global product styles. Verify
sidebar, loading/Auth if in scope, favicon after hard refresh, and npm run build.
```

### Tarefa somente de documentação

```text
This is documentation-only. Allowed scope: docs/[target]/ only. Do not edit src,
services, supabase, public, package files, scripts, env or assets. Inspect existing
docs first. Verify links, facts and secret absence. Build is not required. Stage
only the documentation files requested.
```

## Anti-patterns de prompt

| Evite | Por quê | Prefira |
| --- | --- | --- |
| “Melhore tudo” | Escopo ilimitado e impossível de validar. | Uma tela, um fluxo, critérios observáveis. |
| “Corrija tudo” | Mistura causa, sintomas e áreas. | Reproduzir um bug e corrigir sua causa. |
| “Refaça a plataforma” | Arrisca regressões e apaga decisões válidas. | Sprint incremental por módulo. |
| “Mude checkout e Auth juntos” | Dois fluxos críticos sem isolamento. | Primeiro checkout; depois continuação pós-auth. |
| “Crie novos preços Stripe” | Pode duplicar catálogo e receita. | Resolver Price ativo existente primeiro. |
| “Rode npm run dev” para testar checkout com frontend isolado | Checkout depende do gateway. | Use `npm run dev` para stack completa. |
| “Faça o frontend bloquear MetaApi” | UI pode ser contornada. | Entitlement no gateway antes do provedor. |
| “Atualize a migration antiga” | Ambientes aplicados divergem. | Nova migration aditiva. |
| “Use os dados que achar melhor” | Incentiva dados fictícios. | Dados existentes e estado vazio seguro. |
| “Commit tudo” | Inclui alterações alheias e secrets. | Stage só dos arquivos permitidos. |

## QA por risco

### UI local

```text
- rota carrega sem erro
- desktop e mobile sem sobreposição
- loading/erro/vazio tratados
- fluxo vizinho preservado
- npm run build passa
```

### Billing

```text
- sem token -> 401
- plano inválido -> 400
- Price ausente/prod_ -> erro controlado
- compra -> checkout.stripe.com
- sessão de outro usuário -> 403
- webhook falso -> rejeitado
- status/datas atualizam user_subscriptions
- plano inválido/expirado não libera MetaApi
```

### MetaApi

```text
- no plan/beta_free/expired/invalid -> bloqueio antes do provedor
- plano ativo/futuro -> permite dentro do limite
- ownership impede sync cruzado
- limite excedido não provisiona
- suspensão é idempotente
- falha undeploy -> suspension_pending e dados preservados
```

### Banco/RLS

```text
- migration aditiva
- select/insert/update isolados por auth.uid()
- dois usuários de teste não veem linhas cruzadas
- service role permanece apenas no gateway
- tipos e build continuam consistentes
```

## Relatório final padrão

```text
1. Resultado/root cause:
2. Comportamento implementado:
3. Arquivos alterados:
4. Validação executada e resultado:
5. Build/typecheck/tests:
6. Segurança: secrets ausentes e arquivos alheios preservados:
7. Commit hash (se autorizado):
8. Riscos ou bloqueios restantes:
```
