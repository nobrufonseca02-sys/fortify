# Apex Trader Funding - evidências oficiais

## Revisão

- Última revisão: 2026-07-15
- Confiança: alta
- Completude: completa para avaliações EOD/Intraday; parcial para todas as variantes históricas de PA
- Programas publicados: EOD Trailing Drawdown Evaluation e Intraday Trailing Drawdown Evaluation

## Fontes oficiais inspecionadas

- [EOD Evaluations](https://apextraderfunding.com/help-center/eod-trailing-drawdown-accounts/eod-evaluations/)
- [Intraday Evaluations](https://apextraderfunding.com/help-center/evaluation-accounts-ea/intraday-trailing-drawdown-evaluations/)
- [EOD Performance Accounts](https://apextraderfunding.com/help-center/eod-trailing-drawdown-accounts/eod-performance-accounts-pa/)
- [Intraday PA Payouts](https://apextraderfunding.com/help-center/uncategorized/intraday-trailing-drawdown-payouts/)
- [Prohibited Activities](https://apextraderfunding.com/help-center/getting-started/prohibited-activities/)
- [PA Inactivity](https://apextraderfunding.com/help-center/billing/inactivity-policy-on-performance-accounts-pa/)

## Regras extraídas

| Conta | Meta | Max Drawdown | EOD DLL | Contratos |
| --- | --- | --- | --- | --- |
| $25K | $1.500 | $1.000 | $500 | 4 / 40 micros |
| $50K | $3.000 | $2.000 | $1.000 | 6 / 60 micros |
| $100K | $6.000 | $3.000 | $1.500 | 8 / 80 micros |
| $150K | $9.000 | $4.000 | $2.000 | 12 / 120 micros |

- EOD: drawdown calculado no fechamento e aplicado intraday na sessão seguinte; DLL pausa, EOD breach reprova.
- Intraday: sem DLL; trailing acompanha pico em tempo real, inclusive lucro não realizado.
- Sem mínimo de dias na avaliação; acesso por 30 dias e PA deve ser ativada em até 7 dias.
- Plataformas: Rithmic, Tradovate e WealthCharts.

## Payout e funded

- EOD PA informa 100% de split conforme elegibilidade vigente.
- Intraday PA exige 5 dias qualificados, mínimo diário por tamanho, consistência abaixo de 50%, Safety Net e payout mínimo de $500; até 6 payouts.
- PA deve registrar 2 dias com $50+ dentro de cada janela móvel de 30 dias para evitar encerramento por inatividade.

## News, overnight, automação e proibições

- News é aceita como parte de estratégia normal; apostar, perseguir preço ou usar brackets opostos não é permitido.
- Posições devem respeitar o fechamento do mercado.
- Automação/HFT, manipulação do sim, compartilhamento, hedge não direcional e uso do drawdown como stop são proibidos.

## Conflitos e incertezas

- A política difere por geração de conta e plataforma; o dataset representa os produtos atuais, não Legacy PA.
- Tradovate e Rithmic/WealthCharts podem diferir no ponto de parada do trailing EOD; confirmar no dashboard.

## Monitorabilidade

- `automatic_mt5`: nenhuma, pois são contas futures fora do MT5.
- `manual_check`: metas, DLL, trailing, contratos, consistência, Safety Net, payout e inatividade.
- `not_supported_yet`: conectores Rithmic, Tradovate e WealthCharts.

> As regras podem mudar sem aviso. Confirme sempre os termos oficiais da mesa antes de operar.
