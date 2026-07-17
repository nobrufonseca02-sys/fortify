# The Trading Pit - evidências oficiais

## Revisão

- Última revisão: 2026-07-15
- Confiança: alta em Prime Futures; média em detalhes operacionais do CFD Prime
- Completude: completa/parcial
- Programas publicados: Prime Futures e CFD Prime 1-Phase

## Fontes oficiais inspecionadas

- [Prime Futures](https://www.thetradingpit.com/futures)
- [Trading Rules](https://www.thetradingpit.com/trading-rules)
- [CFD official checkout](https://client-area.thetradingpit.com/quick-checkout/challenge/cfd)
- [Prime vs Classic Futures](https://support.thetradingpit.com/prime-futures-challenges-compared-classic-futures-challenges)

## Prime Futures

| Conta | Meta | Daily Pause | Max DD EOD | Contratos |
| --- | --- | --- | --- | --- |
| $50K | $3.000 | $1.000 | $2.000 | 5 / 50 micros |
| $100K | $6.000 | $2.000 | $3.000 | 10 / 100 micros |
| $150K | $9.000 | $3.000 | $4.500 | 15 / 150 micros |

- Uma fase, 30 dias, news permitido, overnight não permitido e consistência de 40%.
- Daily Pause fecha posições e pausa; Max DD EOD trailing encerra a conta.
- Split 80%; 5 dias de $200+, até 50% do lucro e caps por tamanho.

## CFD Prime 1-Phase

- Tamanhos $2.5K a $200K; plataformas MT4, MT5 e cTrader.
- Meta 10%, Daily Drawdown 3% balance-based, Max Drawdown estático 6%.
- Três dias lucrativos de pelo menos 0,5%; inatividade de 21 dias.
- Split 80%; material oficial informa saque acima de $100 a cada 14 dias.
- News/weekend específicos não foram encontrados com precisão suficiente: `Verificar no site oficial`.

## EA, copy e práticas proibidas

- HFT e micro-scalping abusivo são proibidos.
- Exploração de falhas do ambiente simulado é proibida.
- Regras detalhadas de EA/copy dependem dos Terms vigentes e permanecem manuais.

## Monitorabilidade

- `automatic_mt5`: CFD meta, perdas, dias lucrativos e inatividade.
- `manual_check`: futures, payout, KYC, news/weekend, HFT e consistência.
- `not_supported_yet`: conectores futures e calendário externo.

## Account-level review

- Revisão: 2026-07-17; 2 programas e 10 tamanhos normalizados.
- Prime Futures registra por tamanho preço (€99/€189/€289), contratos, meta, Daily Pause, drawdown, reset e extensão.
- Contas novas Prime Futures desde 26/03/2026 foram versionadas sem activation fee.
- CFD preserva sete tamanhos; regras por data desde 06/07/2026 foram registradas sem aplicar retroativamente.
- Lacunas: preço CFD, news/weekend por contratação e conectores futures.
- Matriz consolidada: [account-rules-matrix.md](account-level/account-rules-matrix.md).

> As regras podem mudar sem aviso. Confirme sempre os termos oficiais da mesa antes de operar.
