# FundingPips - evidências oficiais

## Revisão

- Última revisão: 2026-07-15
- Confiança/completude: alta/completa para 1 Step e 2 Step Standard
- Programas publicados: 1 Step e 2 Step Standard

## Fontes oficiais inspecionadas

- [1 Step Model](https://help.fundingpips.com/hc/en-us/articles/34501697434385-1-Step-Model)
- [2 Step Standard](https://help.fundingpips.com/hc/en-us/articles/34501809112081-2-Step-Standard)
- [News & Weekend Holding](https://help.fundingpips.com/hc/en-us/articles/34504137479441-News-Trading-Weekend-Holding)
- [Responsible Trading Policy](https://help.fundingpips.com/hc/en-us/articles/47328410434065-Responsible-Trading-Policy)

## Regras extraídas

| Programa | Meta | Daily Loss | Max Loss | Dias |
| --- | --- | --- | --- | --- |
| 1 Step | 10% | 3% | 6% estático | 3 |
| 2 Step Standard | 8% ou 10% + 5% | 5% | 10% estático | 3 por fase |

- Daily Loss usa o maior entre opening balance/equity e inclui P&L flutuante; reset 00:00 platform time.
- Sem prazo máximo; uma operação completa a cada 30 dias evita inatividade.
- Master: Risk Per Trade Idea de 3% abaixo de $50K e 2% a partir de $50K, com diferenças no 2-Step abaixo de $25K.
- Profit Concentration acima de 60% em avaliações novas $25K+ pode impor 4 dias lucrativos por Reward.

## News, weekend, EA/copy e payout

- Evaluation permite holding em notícia/weekend, mas operar propositalmente a notícia é proibido.
- Master desconta lucro de operações na janela de ±5 minutos, com exceção de trade aberto 5h antes.
- Weekend holding está temporariamente suspenso no Master; o sistema fecha posições sem hard breach.
- Rewards: semanal 60%, quinzenal 80%, mensal 100% ou on-demand 90% com consistência 35%.
- EA/copy devem cumprir Responsible Trading; exploits, latência e divisão artificial de trade idea são proibidos.

## Monitorabilidade

- `automatic_mt5`: metas, perdas, dias, inatividade, concentração e trade ideas.
- `manual_check`: notícias, medidas temporárias, payout e conduta.
- `not_supported_yet`: calendário Forex Factory e agrupamento cross-platform.

## Incertezas

- Weekend/leverage estão sob medidas temporárias e exigem revisão frequente.
- Add-ons podem alterar payout e critérios sem alterar a regra base publicada aqui.

> As regras podem mudar sem aviso. Confirme sempre os termos oficiais da mesa antes de operar.
