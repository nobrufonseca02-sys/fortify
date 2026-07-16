# BrightFunded

Revisão oficial em 2026-07-15. Três avaliações foram separadas porque usam metas e mecanismos de drawdown diferentes.

## Fontes oficiais consultadas

| Fonte oficial | Acesso | Observação |
| --- | --- | --- |
| [Evaluation rules](https://help.brightfunded.com/en/articles/9241611-what-are-the-current-rules-for-the-evaluation-process) | 2026-07-15 | Parâmetros dos programas Bright e Classic. |
| [BrightFunded 1-Step](https://help.brightfunded.com/en/articles/14284743-brightfunded-1-step) | 2026-07-15 | Meta, trailing, dias e regras do 1-Step. |
| [Daily permitted loss](https://help.brightfunded.com/en/articles/12291765-how-does-my-daily-permitted-loss-work) | 2026-07-15 | Fórmula que considera balance/equity e floating. |
| [Como obter funded](https://help.brightfunded.com/en/articles/9241590-how-do-i-get-funded) | 2026-07-15 | Processo após aprovação. |
| [News trading](https://help.brightfunded.com/en/articles/9241694-can-i-trade-news) | 2026-07-15 | Diferença entre evaluation e funded. |
| [Weekend holding](https://help.brightfunded.com/en/articles/9268323-is-it-allowed-to-hold-positions-over-the-weekend) | 2026-07-15 | Overnight/weekend. |
| [Copy trading](https://help.brightfunded.com/en/articles/9241709-is-copy-trading-allowed) | 2026-07-15 | Cópia somente entre contas próprias. |
| [Expert Advisors](https://help.brightfunded.com/en/articles/9241699-can-i-use-ea) | 2026-07-15 | Automação e restrições de plataforma. |
| [Estratégias proibidas](https://help.brightfunded.com/en/articles/9241704-which-strategies-are-prohibited-at-brightfunded) | 2026-07-15 | Exploração, HFT, terceiros e abuso. |
| [Inatividade](https://help.brightfunded.com/en/articles/11774572-inactivity-rule-policy) | 2026-07-15 | Janela de 30 dias e trade mínimo de 60 segundos. |
| [Reward split](https://help.brightfunded.com/en/articles/9268736-how-does-my-reward-split-work-on-my-funded-account) | 2026-07-15 | Split e ciclos de saque. |
| [Ativos](https://help.brightfunded.com/en/articles/9268749-what-trading-assets-instruments-offers-brightfunded) | 2026-07-15 | Forex, índices, commodities e cripto. |
| [Plataformas](https://help.brightfunded.com/en/articles/10855521-what-trading-platform-does-brightfunded-offer) | 2026-07-15 | MT5, DXtrade e cTrader. |
| [Países restritos](https://help.brightfunded.com/en/articles/9286630-what-countries-are-restricted-at-brightfunded) | 2026-07-15 | Lista oficial de compliance. |

## Programas identificados

- 2-Step Bright.
- 2-Step Classic.
- 1-Step.

## Regras por programa

| Programa | Fases/meta | Daily loss | Max loss | Dias | Consistência | News/weekend | Payout |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2-Step Bright | 2; 8% / 5% | 4% do saldo inicial; piso usa maior balance/equity no rollover | 8% estático | 5 por fase, trade ≥60s; ilimitado | Sem regra vigente | Challenge livre; funded ±5 min proibido; weekend permitido | 80%; primeiro 30 dias, depois 14; add-ons 14/7, 90%; escala até 100% |
| 2-Step Classic | 2; 10% / 5% | 5% com a mesma fórmula | 10% estático | 5 por fase, trade ≥60s; ilimitado | Sem regra vigente | Mesma política | Mesma política |
| 1-Step | 1; 10% | 3% com a mesma fórmula | 6% trailing em tempo real; trava ao atingir +6% | 5, trade ≥60s; ilimitado | Sem regra vigente | Mesma política | Mesma política |

- Daily loss incorpora resultado flutuante, fechado, comissões e swaps.
- Stop loss e take profit obrigatórios não foram encontrados nas regras oficiais.
- EA é permitido, com limitações técnicas no DXtrade; copy trading é aceito apenas entre contas do mesmo titular.

## Práticas proibidas

- HFT, arbitragem de latência/preço, tick scalping abusivo, grid/martingale exploratório e manipulação de feed.
- Hedge coordenado, copy entre pessoas, account management e compartilhamento de credenciais.
- Estratégias all-or-nothing, overleveraging, abuso de notícias e exploração de falhas da plataforma.

## Monitorabilidade Fortify

- **Automática:** meta, daily com equity, max loss estático/trailing, high-water mark em tempo real, dias/trade ≥60s, inatividade, posições negativas e janela de notícias.
- **Parcial:** weekend, split/ciclo de payout, EA e copy podem gerar alertas, mas dependem do contrato e da titularidade.
- **Manual:** IP/VPS, estratégia proibida, país/KYC, ownership e add-ons comprados.

## Lacunas / indisponibilidades

- Leverage e limites de lote variam por ativo, plataforma e add-on; não há tabela única estável para os três programas.
- Stop loss/take profit obrigatórios não foram publicados.
- A lista de símbolos pode mudar por plataforma e deve ser confirmada no terminal.

## Conflitos

- Nenhum conflito material entre as páginas oficiais consultadas. Add-ons podem alterar payout, frequência e leverage; o dataset preserva a regra padrão e sinaliza a dependência contratual.

> Regras podem mudar sem aviso. Confirme sempre os termos oficiais antes de operar.
