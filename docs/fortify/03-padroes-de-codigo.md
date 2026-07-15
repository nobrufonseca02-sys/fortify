# Padrões de código Fortify

## Princípios

- Preserve o padrão do arquivo e da área existentes.
- Faça a menor alteração que resolva o comportamento solicitado.
- Novo código crítico deve ser TypeScript; não introduza JavaScript de aplicação quando a área já é tipada.
- UI pode orientar, mas autenticação, entitlement, propriedade e limites são validados no servidor/RLS.
- Não misture refatoração ampla com correção funcional.
- Não altere arquivos sujos não relacionados.

## Organização e nomes

| Área | Convenção atual | Exemplo |
| --- | --- | --- |
| Página React | `PascalCase.tsx` em `src/pages/` | `PricingPage.tsx` |
| Componente | `PascalCase.tsx` em `src/components/` | `PlanStatusPanel.tsx` |
| Hook | prefixo `use`, arquivo TypeScript/TSX | `useSubscriptionPlan.ts` |
| Biblioteca pura | nome funcional em `src/lib/` | `billing.ts`, `riskCalculator.ts` |
| Dados estáticos | `src/data/` | `propFirmLibrary.ts` |
| Integração | pasta por provedor | `src/integrations/supabase/` |
| Gateway | funções e rotas no serviço existente | `services/metaapi-gateway/src/server.ts` |
| Migration | timestamp + descrição em snake_case | `20260615143000_subscription_lifecycle_guard.sql` |
| Componente exportado | `PascalCase` | `TradingViewProvider` |
| Função/variável | `camelCase` e verbo quando executa ação | `createCheckoutSession` |
| Constante global | `UPPER_SNAKE_CASE` | `INTERNAL_CRON_SECRET` |

Não renomeie arquivos apenas para impor outra preferência. Consistência local vale mais do que uma migração estética.

## TypeScript

- Evite `any` em código novo; quando uma fronteira legada o exigir, restrinja-o ao menor bloco.
- Modele estados fechados com union types.
- Trate `null`, `undefined`, listas vazias e respostas parciais.
- Valide dados externos no gateway, mesmo que o frontend já valide.
- Use funções puras para cálculos de risco e mantenha efeitos de rede fora delas.

Exemplo de tipos, não de valores duplicados:

```ts
type PaidSubscriptionStatus = 'active' | 'trialing';
type BlockedSubscriptionStatus =
  | 'past_due'
  | 'unpaid'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'payment_failed';

type PaidPlanSlug =
  | 'beginner_monthly'
  | 'advanced_monthly'
  | 'pro_monthly'
  | 'enterprise_monthly';
```

Evite espalhar strings de plano/status em componentes. Quando tocar nessa lógica, centralize somente se isso reduzir duplicação real e não ampliar o escopo.

## React/Vite

- Página organiza estado e composição; componentes menores representam blocos reutilizáveis.
- Hooks não devem ser chamados condicionalmente.
- Use os componentes existentes de `src/components/ui/` antes de criar um controle paralelo.
- Mensagens de usuário são em português-BR.
- Não coloque segredo em variável `VITE_*`: tudo que Vite expõe pode chegar ao navegador.
- Operações assíncronas precisam de loading, erro sanitizado e recuperação do botão.

## Gateway

- Endpoint protegido começa por rate limit, autenticação e validação de entrada.
- Identificador de usuário vem do JWT, não é confiado ao body.
- Verifique propriedade antes de consultar ou modificar conta.
- Logue evento e IDs mascarados; nunca token, senha MT5, assinatura completa ou corpo sensível.
- Erros retornados ao cliente não devem revelar segredo ou infraestrutura interna.
- Webhook usa corpo bruto e valida assinatura antes de processar evento.

## Banco e migrations

- Mudança de schema é sempre migration aditiva e revisável.
- Nunca edite migration já aplicada para “corrigir produção”; crie uma nova migration de ajuste.
- RLS deve cobrir `select`, `insert`, `update` e `delete` conforme o caso.
- Políticas de perfil/conta usam `auth.uid() = user_id`.
- Não apague histórico de assinatura, trades ou regras para simplificar uma correção.

## Checklist de code review

- [ ] A mudança está limitada aos arquivos autorizados?
- [ ] Estados vazios, erro, loading e dados nulos foram tratados?
- [ ] O backend valida JWT, propriedade e entrada?
- [ ] Plano e status não são confiados ao frontend?
- [ ] Não surgiu chamada externa ou dependência desnecessária?
- [ ] Não há segredo, senha ou identificador sensível em logs/UI?
- [ ] Build e typecheck adequados ao escopo passaram?
- [ ] Fluxos vizinhos de alto risco continuam preservados?

## Checklist de segurança para Codex

- [ ] Ler `git status` antes de editar.
- [ ] Declarar arquivos permitidos e proibidos.
- [ ] Não reverter alterações do usuário.
- [ ] Não executar migrations, Stripe ou MetaApi sem autorização explícita.
- [ ] Antes do commit, buscar `sk_test`, `sk_live`, `whsec`, `service_role`, token MetaApi, senha MT5 e chaves de API.
- [ ] Stage apenas dos arquivos da tarefa.
- [ ] Relatório final informa arquivos, validações e risco residual.
