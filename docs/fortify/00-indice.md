# Base de conhecimento Fortify

Este índice é o ponto de entrada para Bruno, desenvolvedores e LLMs. Escolha o que pretende alterar antes de abrir o código.

> Regra principal: uma tarefa por vez, arquivos permitidos explícitos e validação proporcional ao risco. Não misture cobrança, MT5 e mudanças visuais no mesmo sprint.

## Quero mexer em...

| Situação | Leia primeiro | Depois consulte |
| --- | --- | --- |
| Checkout, planos, portal ou webhook | [07 - Stripe e billing](./07-stripe-billing.md) | [11 - Segurança e custos](./11-seguranca-e-custos.md) |
| MT5 ou MetaApi | [08 - MetaApi e MT5](./08-metaapi-mt5.md) | [07 - Stripe e billing](./07-stripe-billing.md) |
| Página de autenticação | [04 - Frontend React/Vite](./04-frontend-react-vite.md) | [11 - Segurança e custos](./11-seguranca-e-custos.md) |
| Dashboard/Painel | [04 - Frontend React/Vite](./04-frontend-react-vite.md) | [09 - Regras e risco](./09-regras-e-calculo-de-risco.md) |
| Calculadora de Risco | [09 - Regras e risco](./09-regras-e-calculo-de-risco.md) | [04 - Frontend React/Vite](./04-frontend-react-vite.md) |
| Biblioteca de Regras/Mesas | [09 - Regras e risco](./09-regras-e-calculo-de-risco.md) | [06 - Supabase e dados](./06-supabase-e-dados.md) |
| TradingView incorporado | [04 - Frontend React/Vite](./04-frontend-react-vite.md) | [11 - Segurança e custos](./11-seguranca-e-custos.md) |
| Gateway ou endpoint | [05 - Gateway Node](./05-gateway-node.md) | [02 - Arquitetura](./02-arquitetura-fortify.md) |
| Banco, RLS ou migration | [06 - Supabase e dados](./06-supabase-e-dados.md) | [11 - Segurança e custos](./11-seguranca-e-custos.md) |
| Rodar localmente | [10 - Desenvolvimento e deploy](./10-dev-local-e-deploy.md) | [05 - Gateway Node](./05-gateway-node.md) |
| Preparar deploy | [10 - Desenvolvimento e deploy](./10-dev-local-e-deploy.md) | [11 - Segurança e custos](./11-seguranca-e-custos.md) |
| Padrões de código | [03 - Padrões de código](./03-padroes-de-codigo.md) | [02 - Arquitetura](./02-arquitetura-fortify.md) |
| Usar Codex sem quebrar o projeto | [12 - Guia Codex](./12-guia-codex-fortify.md) | [03 - Padrões de código](./03-padroes-de-codigo.md) |
| Entender o produto no primeiro dia | [01 - Onboarding](./01-onboarding-fortify.md) | [02 - Arquitetura](./02-arquitetura-fortify.md) |
| Dar contexto para uma LLM | [99 - Contexto consolidado](./99-contexto-completo-para-llm.md) | [12 - Guia Codex](./12-guia-codex-fortify.md) |

## Ordem recomendada para novos colaboradores

1. Leia [01 - Onboarding](./01-onboarding-fortify.md).
2. Entenda [02 - Arquitetura](./02-arquitetura-fortify.md).
3. Rode o projeto com [10 - Desenvolvimento local](./10-dev-local-e-deploy.md).
4. Leia o manual da área que será alterada.
5. Antes de commitar, execute os checklists de [11 - Segurança e custos](./11-seguranca-e-custos.md).

## Alertas que valem para qualquer tarefa

- O frontend nunca recebe chaves secretas da Stripe, Supabase ou MetaApi.
- A autorização visual não substitui a autorização no gateway ou a RLS.
- Acesso MT5/MetaApi depende de plano pago válido e período ainda vigente.
- TradingView é uma ferramenta de análise; o Fortify não executa ordens.
- Regras de mesas podem mudar. A fonte oficial e a data de verificação são obrigatórias.
- `.env`, senhas MT5, tokens e arquivos temporários nunca entram no Git.
