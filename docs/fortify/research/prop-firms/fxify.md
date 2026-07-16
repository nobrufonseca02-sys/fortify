# FXIFY

Revisão oficial em 2026-07-15. O dataset publica oito programas vigentes ou ainda documentados oficialmente, sem completar lacunas por inferência.

## Fontes oficiais consultadas

| Fonte oficial | Acesso | Observação |
| --- | --- | --- |
| [One Phase](https://fxify.com/programs/one-phase/) | 2026-07-15 | Metas, drawdown, dias, payout e alavancagem. |
| [Two Phase](https://fxify.com/programs/two-phase/) | 2026-07-15 | Regras do Standard e comparação oficial de variantes. |
| [Three Phase](https://fxify.com/programs/three-phase-challenge/) | 2026-07-15 | Três fases, metas e perdas. |
| [Assessment rules](https://fxify.com/faqs/all-faqs/what-are-the-rules-for-the-assessment-account/) | 2026-07-15 | Regras gerais das avaliações. |
| [Two Phase Pro](https://fxify.com/blog/introducing-fxify-2-phase-pro/) | 2026-07-15 | Regras, dias lucrativos, cap e payout da variante Pro. |
| [Instant Funded FAQ](https://fxify.com/faqs/instant-funded-faq/) | 2026-07-15 | Regras específicas do Instant Funding. |
| [Instant Funding Lite](https://fxify.com/blog/introducing-fxify-instant-funding-lite/) | 2026-07-15 | Parâmetros, consistência, notícias e payout do Lite. |
| [Lightning Plan](https://fxify.com/faqs/lightning-plan/) | 2026-07-15 | Coleção atual do Lightning. |
| [Static drawdown](https://fxify.com/faqs/all-faqs/what-is-static-drawdown/) | 2026-07-15 | Definição oficial do piso estático. |
| [Max trailing drawdown](https://fxify.com/faqs/all-faqs/how-do-you-calculate-the-max-trailing-drawdown/) | 2026-07-15 | Fórmula geral do trailing por saldo fechado. |
| [Daily loss](https://fxify.com/faqs/all-faqs/how-do-you-calculate-the-daily-loss-limit/) | 2026-07-15 | Cálculo do limite diário e floating P&L. |
| [Payout](https://fxify.com/faqs/all-faqs/how-do-i-withdraw-my-profits/) | 2026-07-15 | Ciclos e condições gerais de saque. |
| [Estratégias permitidas e proibidas](https://fxify.com/faqs/all-faqs/what-strategies-can-i-use/) | 2026-07-15 | EA, HFT, arbitragem, abuso e terceiros. |
| [Copy trading](https://fxify.com/faqs/all-faqs/is-copy-trading-allowed/) | 2026-07-15 | Limites de cópia e titularidade. |
| [Inatividade](https://fxify.com/faqs/all-faqs/is-there-a-breach-for-inactivity/) | 2026-07-15 | Prazo geral de 60 dias. |
| [Países aceitos](https://fxify.com/faqs/all-faqs/what-countries-are-accepted/) | 2026-07-15 | Restrições geográficas oficiais. |

## Programas identificados

- One Phase.
- Two Phase Standard.
- Two Phase Classic.
- Two Phase Pro.
- Three Phase.
- Instant Funding.
- Instant Funding Lite.
- Lightning Challenge.

## Regras por programa

| Programa | Tipo/fases | Meta | Daily loss | Max loss | Dias / consistência | Notícias e fim de semana | Payout |
| --- | --- | --- | --- | --- | --- | --- | --- |
| One Phase | Challenge, 1 fase | 10% | 3% sobre saldo anterior às 17:00 EST | 6% trailing por saldo fechado | 5 dias; sem consistência publicada | Notícias e weekend permitidos no padrão, sujeito a abuso/add-on | Primeiro on-demand após 5 dias; depois 30/14 dias; até 90% |
| Two Phase Standard | Challenge, 2 fases | 10% / 5% | 4% | 10% trailing | 5 dias por fase; sem consistência publicada | Permitido no padrão | Primeiro on-demand; depois 30/14 dias; até 90% |
| Two Phase Classic | Challenge, 2 fases | 5% / 10% | 4% | 10% estático | 4 dias por fase; funded com 25% | Permitido, sujeito às regras gerais | 14/30 dias; até 100% |
| Two Phase Pro | Challenge, 2 fases | 4% / 8% | 4% | 8% estático | 3 dias lucrativos por fase, mínimo 0,5%; cap diário contado de $4.000 | Notícias permitidas; weekend indisponível | 10 dias; 80%; caps nos dois primeiros |
| Three Phase | Challenge, 3 fases | 5% / 5% / 5% | 5% | 5% estático | 5 dias por fase; sem consistência publicada | Permitido no padrão | Primeiro on-demand; depois 30/14 dias; até 90% |
| Instant Funding | Instant funded | Sem meta | 8% | 8% trailing | Sem mínimo; inatividade 60 dias | Notícias ±5 min e weekend proibidos | Primeiro em 14 dias; depois 14 dias; até 90% |
| Instant Funding Lite | Instant funded | Sem meta | 3% | 4% trailing | 5 dias operados e 10 totais; Best Day 20% | Notícias ±5 min e weekend proibidos | Após 10 dias; mínimo $50; 80%, até 90% |
| Lightning Challenge | Challenge, 1 fase | 5% | 3% | 4% trailing | Limite atual de 5 dias; Best Day 30% | Notícias ±5 min; weekend indisponível | Primeiro em 7 dias funded; depois 14 dias; até 90% |

- Daily loss inclui P&L flutuante, comissões e swaps quando aplicável.
- Stop loss/take profit não são obrigatórios nos programas gerais. No Lightning, o stop loss é obrigatório por padrão e a terceira ocorrência sem SL é hard breach.
- Ativos oficiais incluem Forex, índices, metais/commodities, ações e cripto, variando por programa e plataforma.
- Países restritos permanecem vinculados à lista oficial, que pode mudar por compliance.

## Práticas proibidas

- HFT, latency arbitrage, reverse hedging e exploração de atraso de preço.
- Account management, compartilhamento de conta, sinais/EA de terceiros e copy trading fora das condições oficiais.
- Spam de ordens, conluio, estratégias all-or-nothing e abuso de alavancagem/notícias.
- Instant Funding e Lite proíbem EA e copy trading; programas de avaliação aceitam automação apenas dentro das regras gerais.

## Monitorabilidade Fortify

- **Automática:** metas, daily loss com equity, max loss, trailing por high-water mark fechado, dias operados, prazo, Best Day, exposição, posições no rollover e janela de notícias quando houver calendário confiável.
- **Parcial:** stop loss obrigatório do Lightning, holding de fim de semana, payout e caps; dependem do programa contratado e do estado do ciclo.
- **Manual:** titularidade, EA/copy trading, IP/VPS, abuso coordenado, país/KYC e confirmação de add-ons/checkout.

## Lacunas / indisponibilidades

- Weekend e alavancagem do Two Phase Pro não estão publicados com clareza na fonte oficial consultada.
- Weekend e alavancagem do Lightning exigem confirmação no checkout/dashboard.
- Limites de lote não foram encontrados como tabela oficial estável para todos os programas.
- Take profit obrigatório não foi identificado; fica marcado como indisponível, não como proibido.

## Conflitos

- A comparação oficial do Two Phase Classic informa metas 5%/10%, 4 dias, max loss estático e consistência funded de 25%, divergindo da FAQ genérica do Standard. O dataset prioriza a página específica da variante.
- A coleção atual do Lightning indica prazo de 5 dias, enquanto a comunicação de lançamento indicava 7. O dataset usa 5 dias por atualidade e mantém o conflito registrado.

> Regras podem mudar sem aviso. O trader deve confirmar os termos oficiais da contratação antes de operar.
