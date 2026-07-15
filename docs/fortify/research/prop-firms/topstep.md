# Topstep - evidências oficiais

## Revisão

- Última revisão: 2026-07-15
- Confiança/completude: alta/completa para o Trading Combine padrão
- Programa publicado: Trading Combine

## Fontes oficiais inspecionadas

- [Trading Combine Parameters](https://help.topstep.com/en/articles/8284197-trading-combine-parameters)
- [Maximum Loss Limit](https://help.topstep.com/en/articles/8284204-what-is-the-maximum-loss-limit)
- [Consistency at Topstep](https://help.topstep.com/en/articles/8284208-consistency-at-topstep)
- [Payout Policy](https://help.topstep.com/en/articles/8284233-topstep-payout-policy)
- [Prohibited Trading Strategies](https://help.topstep.com/en/articles/10305426-prohibited-trading-strategies-at-topstep)

## Regras extraídas

| Conta | Meta | MLL EOD | DLL opcional | Contratos |
| --- | --- | --- | --- | --- |
| $50K | $3.000 | $2.000 | $1.000 | 5 / 50 micros |
| $100K | $6.000 | $3.000 | $2.000 | 10 / 100 micros |
| $150K | $9.000 | $4.500 | $3.000 | 15 / 150 micros |

- MLL acompanha o saldo EOD, não recua e trava no saldo inicial; é monitorado em tempo real com P&L não realizado.
- Consistency Target: melhor dia até 50% da meta. Exceder aumenta a meta, sem reprovação imediata.
- Pode aprovar em no mínimo prático de dois dias.
- DLL é opcional: liquida e pausa a sessão, mas não reprova.
- Automação é aceita com condições; o trader responde por falhas.

## Payout, scaling e proibições

- XFA Standard: 5 dias de $150+ e lucro positivo desde payout anterior.
- XFA Consistency: 3 dias e 40% consistency.
- Split 90/10 e payout de até 50% do balance, sujeito a caps por tamanho.
- Proibidos account stacking, esgotamento intencional, tecnologia manipulativa e violações dos termos.

## Monitorabilidade

- `automatic_mt5`: nenhuma.
- `manual_check`: meta, MLL, DLL, consistência, contratos e payout XFA.
- `not_supported_yet`: TopstepX e demais conectores futures.

## Incertezas

- Ofertas temporárias de DLL/caps e Topstep Labs não foram tratadas como programa padrão.
- Horários e produtos devem ser confirmados na fonte oficial vigente.

> As regras podem mudar sem aviso. Confirme sempre os termos oficiais da mesa antes de operar.
