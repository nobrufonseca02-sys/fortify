# ASAP Funding Prop - evidências de regras

## Revisão

- Última revisão: 2026-07-15
- Confiança: alta para limites e regras descritos nos Termos; parcial para alavancagem Funded e holding de fim de semana
- Completude: Challenge Express completa; Funded Express e Instant Account parciais
- Fonte primária: [Termos e Condições](https://asapfundingprop.com/pt/termos/)
- Fonte secundária: [site oficial](https://asapfundingprop.com/pt/)
- Evidência fornecida pelo usuário: `Termos – Asap Funding Prop.pdf`, cópia do documento oficial revisado

Os Termos prevalecem sobre material comercial. Quando dashboard, plataforma ou condição específica da contratação forem mais restritivos, o usuário deve confirmar a regra exibida para sua conta.

## Challenge Express

| Campo | Regra oficial revisada |
| --- | --- |
| Estrutura | Uma fase |
| Meta | 6% |
| Perda diária | 3% |
| Perda total | 6% |
| Tamanhos | $3K, $5K, $10K, $25K, $50K, $100K e $200K |
| Dias mínimos | 7 dias; resultado de pelo menos 0,1% do saldo em cada dia válido |
| Inatividade | 15 dias |
| Alavancagem | 1:100 |
| Consistência | Não aplicada na avaliação |
| Lote médio | Não aplicado na avaliação |
| Trailing | Não aplicado na avaliação |
| SL/TP | Não obrigatório na avaliação |
| Notícias | Sem restrição padrão na avaliação, salvo condição específica |

## Funded Express

| Campo | Regra oficial revisada |
| --- | --- |
| Meta | Não aplicável |
| Perda diária | 3% |
| Perda total | 6% |
| Perda flutuante | 1,5% |
| Trade Value Score | Maior trade lucrativo até 33% do lucro líquido do ciclo |
| Lote médio | Coerência obrigatória; auditoria automática ou manual |
| SL/TP | Obrigatórios; segunda violação pode encerrar a conta |
| Notícias | Proibido operar 5 minutos antes/depois de notícia de alto impacto; 2 strikes |
| Dias válidos | 7 dias por ciclo; pelo menos 0,1% do saldo em cada dia |
| Inatividade | 15 dias |
| Payout | 70%, solicitação a cada 15 dias corridos |
| Colchão | Não exigido |

## Instant Account

| Campo | Regra oficial revisada |
| --- | --- |
| Estrutura | Acesso direto ao ambiente funded |
| Tamanhos | $3K, $5K, $10K, $25K, $50K e $100K |
| Perda diária / total | 3% / 6% |
| Perda flutuante | 1,5% |
| Trade Value Score | 33% |
| Dias válidos | 10 dias por ciclo; pelo menos 0,5% do saldo em cada dia |
| SL/TP e notícias | Mesmas regras da Funded Express |
| Alavancagem | 1:30 |
| Payout | 70%, solicitação a cada 15 dias corridos |

## Monitorabilidade Fortify

### `automatic_mt5`

- Perda diária, perda total e perda flutuante.
- Meta da avaliação.
- Dias operados, inatividade, uso de SL/TP e concentração do maior trade.
- Lote médio como sinal quantitativo, preservando revisão manual quando a regra depender de coerência comportamental.

### `manual_check`

- KYC, compliance e aprovação de payout.
- Conduta de gambling, manipulação ou abuso de alavancagem.
- Condições específicas exibidas no checkout/dashboard.

### `not_supported_yet`

- Calendário oficial de notícias de alto impacto integrado ao motor.
- Validação automática de exceções promocionais ou contratuais.

## Lacunas

- Alavancagem da Funded Express não foi informada nos Termos revisados.
- Holding de fim de semana não foi informada publicamente.
- O método técnico exato de reset da perda diária pode depender da plataforma/dashboard.

## Account-level review

- Revisão: 2026-07-17; 3 produtos e 20 tamanhos/variantes.
- Challenge e Funded cobrem $3K a $200K; Instant cobre $3K a $100K.
- Percentuais são iguais por tamanho, mas dias válidos, floating loss, Trade Value Score, notícia e payout mudam por produto.
- Lacunas: preços, weekend, scaling, mínimo de saque e leverage da Funded Express.
- Matriz consolidada: [account-rules-matrix.md](account-level/account-rules-matrix.md).

> As regras podem mudar sem aviso. Confirme sempre os termos oficiais da mesa antes de operar.
