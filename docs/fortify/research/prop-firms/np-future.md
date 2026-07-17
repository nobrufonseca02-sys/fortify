# NP Future - evidências de regras

## Revisão

- Última revisão: 2026-07-15
- Confiança: alta para o regulamento; média para diferenças de plataforma exibidas apenas na apresentação comercial
- Completude: parcial para Standard; completa para o núcleo Funded e Flash
- Fonte primária: [Regulamento NPFuture](https://npfuture.com/regulamento/)
- Fonte secundária: [apresentação comercial oficial](https://npfuture.com/)

O regulamento prevalece sobre a apresentação comercial. BlackArrow e MT5 são modelados separadamente porque representam mercados, limites técnicos e regras de swing diferentes.

## Conflitos registrados

| Campo | Apresentação comercial | Regulamento | Valor adotado |
| --- | ---: | ---: | ---: |
| DD diário Standard/Flash Fibonacci 200K | $3.500 | $3.600 | **$3.600** |
| Drawdown Standard | Rotulado como EOD | Informa Max Loss e diz que a avaliação não usa a trava EOD de saldo inicial + $100 | **Max Loss sem a trava Funded/Flash** |

O instante exato de medição do Max Loss Standard deve ser confirmado antes de ativar uma avaliação automática definitiva.

## Planos Standard

| Plano | Saldo | Meta | DD diário | Max Loss | Dias | Consistência |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Bollinger | $25.000 | $1.500 | $600 | $1.000 | 2 | 50% |
| Dow | $50.000 | $3.000 | $1.200 | $2.000 | 2 | 50% |
| Wyckoff | $100.000 | $6.000 | $1.800 | $3.000 | 2 | 50% |
| Elliot | $150.000 | $9.000 | $2.700 | $4.500 | 2 | 50% |
| Fibonacci | $200.000 | $12.000 | $3.600 | $6.000 | 2 | 50% |

- Prazo máximo: 60 dias corridos.
- Inatividade: 30 dias corridos sem abrir operação.
- Operações válidas: duração mínima de 30 segundos.
- Notícias: permitidas, mas HFT, arbitragem de latência e exploração de spread/liquidez são proibidos.
- Aprovação libera Funded correspondente sem taxa de ativação.

## Contas Funded

- Não possuem DD diário.
- Usam EOD móvel pelo maior saldo/equity de fechamento diário.
- O EOD trava definitivamente em saldo inicial + $100.
- Max Loss: $1.000, $2.000, $3.000, $4.500 ou $6.000 conforme o plano.
- Payout exige 5 dias positivos; lucro mínimo diário varia de $100 a $500.
- Consistência: maior dia até 30% do lucro considerado na solicitação.
- Saque: até 50% do lucro elegível, com tetos por plano.
- Split: 80/20 nos dois primeiros payouts e 90/10 a partir do terceiro.
- O payout reduz saldo, mas não reduz o EOD vigente/travado.

## Planos Flash

- Acesso direto, sem avaliação e sem taxa de ativação.
- DD diário fixo por plano: $600, $1.200, $1.800, $2.700 e $3.600.
- Max Loss/EOD: mesmos valores de $1.000 a $6.000, com trava em saldo inicial + $100.
- Meta do primeiro payout: $2.000, $3.000, $6.000, $9.000 e $12.000.
- Meta dos payouts seguintes: $2.000, $2.500, $4.000, $5.000 e $7.000.
- Dias mínimos: 5; sem lucro mínimo diário.
- Consistência: 20% em todos os ciclos.
- Margem real pós-payout deve ser igual ou maior que o DD diário do plano.

## Diferenças por plataforma

| Aspecto | BlackArrow | MT5 |
| --- | --- | --- |
| Mercado | Futuros Globex | Forex e CFDs |
| Swing trade na apresentação | Não permitido | Permitido |
| Limite técnico | 1/10, 4/40, 6/60, 8/80 ou 10/100 Mini/Micros | Margem 1:30 |
| Monitoramento Fortify | Manual até integração futura | Automático onde os dados MetaApi forem suficientes |

## Monitorabilidade Fortify

### `automatic_mt5`

- DD diário, Max Loss, EOD móvel/travado e metas.
- Consistência, dias válidos, duração mínima e inatividade.
- Margem pós-payout como projeção, quando o payout informado estiver disponível.

### `manual_check`

- BlackArrow até existir integração específica.
- Ativos autorizados, teto/aprovação de payout, KYC e compliance.
- Abuso de notícias, consistência de lote e estratégias proibidas.

### `not_supported_yet`

- Monitoramento automático BlackArrow.
- Aprovação de payout e calendário externos da NP Future.

## Account-level review

- Revisão: 2026-07-17; 6 variantes de programa e 30 contas normalizadas.
- Standard, Funded e Flash permanecem separados entre BlackArrow e MT5.
- A grade $25K/$50K/$100K/$150K/$200K preserva metas, daily, max loss, contratos e payout por plano.
- O Regulamento continua como autoridade primária; o conflito conhecido de Daily Loss $200K permanece resolvido em $3.600.
- Lacunas: preços, prazo/reset, mínimo de saque, scaling e detalhes de automação.
- Matriz consolidada: [account-rules-matrix.md](account-level/account-rules-matrix.md).

> As regras podem mudar sem aviso. Confirme sempre os termos oficiais da mesa antes de operar.
