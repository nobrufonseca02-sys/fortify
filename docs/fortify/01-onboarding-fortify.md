# Onboarding Fortify

## O que é o Fortify

Fortify é um SaaS de gestão de risco para traders de contas próprias e prop firms conectadas ao MetaTrader 5. A promessa central do produto é:

> **Proteja sua conta antes do próximo trade.**

O produto reúne dados das contas, limites operacionais, regras da mesa, posições e histórico para avisar o usuário antes que uma decisão coloque a conta em risco. Ele não substitui o MT5, não executa ordens e não promete resultado financeiro.

## Quem usa

- Traders com uma ou mais contas MT5.
- Traders em avaliação ou conta financiada de prop firms.
- Operações que precisam enxergar perda diária, drawdown e violações rapidamente.
- Administradores Fortify responsáveis por planos, assinaturas, contas e qualidade das regras.

## Módulos principais

| Módulo | Papel |
| --- | --- |
| Painel/Dashboard | Resumo de saúde, alertas, posições, sincronização e risco. |
| Contas e Contas MT5 | Cadastro, conexão, sincronização e consulta de dados. |
| Calculadora de Risco | Simula lote, perda no stop e consumo dos limites informados. |
| Biblioteca de Mesas/Regras | Exibe programas e regras com fonte e versão. |
| Planos | Inicia Stripe Checkout e apresenta limites comerciais. |
| Configurações | Perfil, assinatura e acesso ao portal de cobrança. |
| Auth | Login, cadastro, recuperação e continuação de checkout. |
| TradingView | Gráfico incorporado para análise, sem execução de ordens. |
| ADM | Gestão protegida de usuários, planos, assinaturas e revisão de regras. |

## Modelo de negócio e controle de custo

O Fortify cobra assinatura recorrente. Cada plano inclui um limite de contas MT5:

- Beginner: 1 conta.
- Advanced: 3 contas.
- Pro: 5 contas.
- Enterprise: 10 contas.

MetaApi é um fornecedor pago. Por isso, ter cadastro no Fortify não dá automaticamente direito a provisionar ou sincronizar contas. O gateway só permite custo MetaApi quando a assinatura é paga, tem status aceito e `paid_until`/`current_period_end` está no futuro. Cancelamento, inadimplência ou expiração precisam suspender o acesso de forma idempotente.

## Glossário essencial

| Termo | Significado no Fortify |
| --- | --- |
| SaaS | Software acessado por assinatura, com dados isolados por usuário. |
| MT5 | MetaTrader 5, plataforma onde a conta de trading opera. |
| MetaApi | Integração externa que conecta, provisiona e sincroniza contas MT5. |
| Stripe Checkout | Página hospedada pela Stripe para uma nova assinatura. |
| Customer Portal | Página da Stripe para um assinante pago gerenciar ou cancelar a assinatura. |
| Webhook | Notificação assinada enviada pela Stripe ao gateway após eventos de cobrança. |
| Supabase | Serviço de autenticação e banco PostgreSQL usado pelo Fortify. |
| Gateway | Serviço Node/Fastify que protege Stripe, MetaApi e operações administrativas. |
| JWT | Token da sessão Supabase enviado como `Authorization: Bearer ...`. |
| RLS | Regras do banco que limitam cada usuário às próprias linhas. |
| Entitlement | Decisão do backend sobre direito de usar MetaApi e quantidade de contas. |
| Drawdown | Queda do saldo/equity em relação à base definida pela regra. |
| Daily Loss | Perda diária máxima permitida pela conta ou mesa. |
| Sync | Coleta de snapshots, posições e trades da conta via MetaApi. |
| Deploy | Ativação da conta no provedor MetaApi para receber dados. |
| Undeploy | Suspensão da conta no MetaApi para interromper uso e custo. |
| Price ID | Identificador `price_...` usado no Stripe Checkout. Não é Product ID. |
| `paid_until` | Data até a qual o acesso pago está coberto. |

## Primeiro dia

1. Confirme Node.js, npm e Git instalados.
2. Leia [Arquitetura](./02-arquitetura-fortify.md) e [Segurança](./11-seguranca-e-custos.md).
3. Configure os `.env` locais a partir dos exemplos sem copiar segredos para código.
4. Execute `npm run dev` na raiz.
5. Abra `http://localhost:8080` e valide `http://localhost:3001/health`.
6. Antes de alterar qualquer área, abra o manual correspondente no [índice](./00-indice.md).

## Não quebrar

- Checkout de compra deve ir para `checkout.stripe.com`, não para o portal.
- Usuário sem pagamento válido não pode gerar custo MetaApi.
- Senhas MT5 não podem aparecer em logs, respostas ou banco em texto legível além do fluxo estritamente necessário.
- Biblioteca de regras precisa distinguir informação verificada de conteúdo pendente de confirmação.
