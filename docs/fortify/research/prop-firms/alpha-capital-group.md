# Alpha Capital Group

Revisão oficial em 2026-07-15. Os seis programas atuais foram separados para preservar metas, drawdown, lot exposure, news e payout próprios.

## Fontes oficiais consultadas

| Fonte oficial | Acesso | Observação |
| --- | --- | --- |
| [Alpha Pro 8/10](https://help.alphacapitalgroup.uk/en/articles/8420429-alpha-pro-8-10) | 2026-07-15 | Parâmetros Pro 8% e 10%. |
| [Alpha Pro 6](https://help.alphacapitalgroup.uk/en/articles/11378706-alpha-pro-6) | 2026-07-15 | Variante 6%, daily EOD e news. |
| [Alpha Swing](https://help.alphacapitalgroup.uk/en/articles/9789907-alpha-swing) | 2026-07-15 | Leverage/lotes reduzidos e weekend. |
| [Alpha One](https://help.alphacapitalgroup.uk/en/articles/10097421-alpha-one) | 2026-07-15 | Uma fase e trailing. |
| [Alpha Three](https://help.alphacapitalgroup.uk/en/articles/10192958-alpha-three) | 2026-07-15 | Três fases e limites. |
| [Average trade duration](https://help.alphacapitalgroup.uk/en/articles/8447268-what-is-the-2-minute-average-trade-duration-rule) | 2026-07-15 | Regra média de 2 minutos e composição do lucro. |
| [News trading](https://help.alphacapitalgroup.uk/en/articles/9293522-can-i-trade-news) | 2026-07-15 | Janelas por programa/estágio. |
| [Expert Advisors](https://help.alphacapitalgroup.uk/en/articles/6934236-can-i-use-an-expert-advisor-ea) | 2026-07-15 | Assistência permitida, automação proibida. |
| [Copy trading](https://help.alphacapitalgroup.uk/en/articles/8786973-is-copy-trading-allowed) | 2026-07-15 | Titularidade e autorização. |
| [Stop loss/take profit](https://help.alphacapitalgroup.uk/en/articles/6933904-are-stop-loss-and-take-profit-orders-required) | 2026-07-15 | SL/TP não obrigatórios. |
| [Weekend](https://help.alphacapitalgroup.uk/en/articles/6934247-can-i-hold-trades-over-the-weekend) | 2026-07-15 | Diferenças Pro/Swing/One/Three. |
| [Inatividade](https://help.alphacapitalgroup.uk/en/articles/8420080-inactivity) | 2026-07-15 | Limite de 30 dias. |
| [Estratégias proibidas](https://help.alphacapitalgroup.uk/en/articles/6934275-what-are-prohibited-trading-strategies) | 2026-07-15 | Arbitragem, HFT, abuso e terceiros. |
| [Payout on-demand](https://help.alphacapitalgroup.uk/en/articles/10102634-on-demand-performance-fee) | 2026-07-15 | Best Day 40% e lucro mínimo. |
| [Payout biweekly](https://help.alphacapitalgroup.uk/en/articles/10570531-bi-weekly-performance-fee) | 2026-07-15 | Ciclo de 14 dias nos programas elegíveis. |
| [Países com limitações](https://help.alphacapitalgroup.uk/en/articles/8775575-countries-with-limitations) | 2026-07-15 | Restrições por compliance. |

## Programas identificados

- Alpha Pro 10%, Alpha Pro 8% e Alpha Pro 6%.
- Alpha Swing.
- Alpha One.
- Alpha Three.

## Regras por programa

| Programa | Fases/meta | Daily loss | Max loss | Dias | News/weekend no Qualified | Payout |
| --- | --- | --- | --- | --- | --- | --- |
| Pro 10% | 2; 10% / 5% | 5% balance-based | 10% estático | 3 por fase; ilimitado | News ±2 min proibido; weekend não permitido | On-demand ou biweekly; até 80% |
| Pro 8% | 2; 8% / 5% | 4% balance-based | 8% estático | 3 por fase; ilimitado | News ±2 min proibido; weekend não permitido | On-demand ou biweekly; até 80% |
| Pro 6% | 2; 6% / 6% | 3% sobre maior balance/equity EOD | 6% estático | 3 por fase; ilimitado | News ±5 min proibido; weekend não permitido | On-demand ou biweekly; até 80% |
| Swing | 2; 10% / 5% | 5% balance-based | 10% estático | 3 por fase; ilimitado | News permitido com duração >2 min na janela; weekend permitido | Somente on-demand; até 80% |
| One | 1; 10% | 4% sobre maior balance/equity EOD | 6% trailing | 1 dia; ilimitado | News ±5 min proibido; weekend permitido | Somente on-demand; até 80% |
| Three | 3; 8% / 4% / 4% | 4% sobre maior balance/equity EOD | 6% estático | 3 por fase; ilimitado | News ±5 min proibido; weekend permitido | On-demand ou biweekly; até 80% |

- Inatividade: 30 dias.
- Regra global de duração: média superior a 2 minutos e pelo menos 50% do lucro de trades com duração superior a 2 minutos.
- On-demand: Best Day de 40% e mínimo de 2% de lucro bruto.
- Lot exposure padrão por tamanho: 2,5/5/10/20/40/80/120 lotes; Swing usa aproximadamente metade conforme tabela oficial.
- Stop loss e take profit não são obrigatórios.

## Práticas proibidas

- HFT, latency/reverse arbitrage, tick scalping abusivo, hedge coordenado e manipulação.
- Automação integral; EA somente como assistência aprovada no MT5.
- Copy trading sem comprovação de titularidade/autorização, account management e terceiros.
- Estratégias de gambling, all-or-nothing, uso abusivo de múltiplas contas e exploração de plataforma.

## Monitorabilidade Fortify

- **Automática:** meta, daily/max loss, trailing/EOD, dias, duração média, proporção de lucro por duração, lot exposure, inatividade, news e weekend.
- **Parcial:** Best Day, payout e comportamento multi-account podem ser alertados, mas a decisão final depende da revisão da mesa.
- **Manual:** aprovação de EA, ownership/copy, país/KYC, IP/VPS e classificação de prática proibida.

## Lacunas / indisponibilidades

- Tabela completa de símbolos e limites por ativo pode variar por plataforma (MT5, cTrader, DXtrade e TradeLocker).
- Take profit obrigatório não existe na política consultada; detalhes de slippage e execução ficam no ambiente contratado.
- Países e condições de onboarding devem ser validados na lista oficial vigente.

## Conflitos

- Nenhum conflito numérico material encontrado. As páginas de produto e as FAQs operacionais se complementam; o dataset mantém diferenças entre evaluation e Qualified Analyst para news/weekend.

> Regras podem mudar sem aviso. Confirme os termos oficiais e a modalidade de payout antes de operar.
