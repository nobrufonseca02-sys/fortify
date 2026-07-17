# E8 Markets

Revisão oficial em 2026-07-15. O catálogo foi modelado por produto e mercado porque E8 One, Pro, Signature e Zero possuem mecanismos de risco distintos.

## Fontes oficiais consultadas

| Fonte oficial | Acesso | Observação |
| --- | --- | --- |
| [Product overview](https://help.e8markets.com/en/articles/13106558-all-product-overviews-e8-one-vs-e8-zero-vs-e8-pro-vs-e8-signature) | 2026-07-15 | Comparação dos produtos atuais. |
| [E8 One](https://help.e8markets.com/en/articles/11775980-e8-one) | 2026-07-15 | Preset Forex, challenge e Performance. |
| [E8 One Crypto](https://help.e8markets.com/en/articles/13429922-e8-one-crypto) | 2026-07-15 | Variante cripto. |
| [E8 Pro Forex](https://help.e8markets.com/en/articles/15274219-e8-pro-forex) | 2026-07-15 | Meta, cap diário, perdas e payout. |
| [E8 Pro Crypto](https://help.e8markets.com/en/articles/15323777-e8-pro-crypto) | 2026-07-15 | Variante cripto do Pro. |
| [E8 Signature Forex](https://help.e8markets.com/en/articles/11755943-e8-signature-forex) | 2026-07-15 | EOD dynamic, Daily Pause e payout. |
| [E8 Signature Crypto](https://help.e8markets.com/en/articles/11864571-e8-signature-crypto) | 2026-07-15 | Variante cripto do Signature. |
| [E8 Signature Futures](https://helpfutures.e8markets.com/en/articles/11864618-e8-signature-futures) | 2026-07-15 | Metas, EOD, contratos e fechamento. |
| [E8 Zero Futures Starter/Max](https://helpfutures.e8markets.com/en/articles/15935817-e8-zero-starter-and-max) | 2026-07-15 | Presets atuais e diferença de payout. |
| [Plataformas FX/crypto](https://help.e8markets.com/en/articles/9799834-available-trading-platforms) | 2026-07-15 | TradeLocker, Match-Trader, cTrader e MT5. |
| [Plataformas futures](https://helpfutures.e8markets.com/en/articles/10207237-available-trading-platforms) | 2026-07-15 | Tradovate e disponibilidade atual. |
| [Políticas proibidas FX/crypto](https://help.e8markets.com/en/articles/6929927-trading-policies-and-prohibited-trading-strategies) | 2026-07-15 | Abuso, EA, hedge, exploração e terceiros. |
| [Políticas proibidas futures](https://helpfutures.e8markets.com/en/articles/10209270-trading-policies-and-prohibited-trading-strategies) | 2026-07-15 | HFT, bot/AI, Front Month e manipulação. |
| [Stop loss](https://help.e8markets.com/en/articles/9453409-is-there-any-stop-loss-rule) | 2026-07-15 | SL não obrigatório. |
| [Países aceitos](https://help.e8markets.com/en/articles/5514278-accepted-countries) | 2026-07-15 | Restrições de onboarding. |

## Programas identificados

- E8 One Forex e E8 One Crypto.
- E8 Pro Forex e E8 Pro Crypto.
- E8 Signature Forex, Crypto e Futures.
- E8 Zero Futures Starter e Max.

## Regras por programa

| Programa | Meta | Daily loss | Max loss | Consistência / dias | Operação | Payout |
| --- | --- | --- | --- | --- | --- | --- |
| One Forex/Crypto | 6% | 3% do saldo inicial | 4% dynamic por maior saldo fechado, trava no inicial | Sem mínimo/máximo; Best Day 40% no Performance; inatividade 60 dias | News livre no challenge e ±5 min proibido no Performance; overnight/weekend permitido | On-demand; limite ligado ao daily; até 100% |
| Pro Forex/Crypto | 8% | 2,5% | 8% estático | Sem mínimo/máximo; Daily Profit Cap 2%; inatividade 60 dias | News e weekend permitidos | Diário após 1%; 50% permanece como buffer; até 100% |
| Signature Forex/Crypto | 6% | Sem daily no challenge; pause suave 2% no Performance | EOD dynamic: $1K/$2K/$3K/$4,5K | Best Day 35%; 5 dias lucrativos entre payouts após o primeiro | Fechamento diário 23:00 server time; news permitido | 80%; mínimo $100; buffer e caps |
| Signature Futures | $1,5K/$3K/$6K/$9K | Sem daily no challenge; pause suave 2% no Performance | EOD dynamic: $1K/$2K/$3K/$4,5K | Best Day 35%; 5 dias lucrativos; inatividade 7 dias | 2/4/8/12 contratos; sem overnight, fechamento 15:10 CT | 80%; mínimo $100; buffer/caps; até 5 payouts nas compras abrangidas |
| Zero Futures Starter | $3K/$6,5K/$13,5K | Sem daily | 3% EOD dynamic | Best Day 40% no challenge; sem mínimo formal, efetivamente 3 dias; inatividade 7 dias | News permitido; sem overnight; Front Month | Diário; caps $1K/$1,6K/$2,1K; máximo 5 payouts |
| Zero Futures Max | $3K/$6,5K/$13,5K | Sem daily | 3% EOD dynamic | Best Day 40% no challenge; sem mínimo formal, efetivamente 3 dias; inatividade 7 dias | News permitido; sem overnight; Front Month | Diário; caps $3K/$5K/$7K; máximo 5 payouts |

- Stop loss e take profit não são obrigatórios nos programas FX/crypto.
- Ativos: Forex, índices, metais e cripto nos programas CFD; futuros listados e contrato Front Month nos programas futures.
- Plataformas oficiais: TradeLocker, Match-Trader, cTrader e MT5 para FX/crypto; Tradovate para futures.

## Práticas proibidas

- Estratégia all-or-nothing, hedge entre contas, exploração de preço/latência, manipulação e conta por terceiro.
- EA compartilhado ou estratégia idêntica distribuída entre titulares.
- Em futures: bots/AI, HFT acima do limite oficial de mensagens/ordens, instrumento fora do Front Month, copy entre titulares e abuso de múltiplas contas.

## Monitorabilidade Fortify

- **Automática MT5/CFD:** metas, daily, static/dynamic drawdown, high-water mark fechado, Daily Profit Cap, Best Day, inatividade, notícias e fechamento diário.
- **Parcial:** EOD futures e contratos podem ser calculados, mas exigem conector de futuros/Tradovate ainda não disponível.
- **Manual:** titularidade, EA/bot/copy, payout/buffer, países/KYC, produto customizado e revisão de abuso.

## Lacunas / indisponibilidades

- Limites exatos de contratos do Zero devem ser confirmados na tabela vigente do checkout.
- A página pública não fornece todos os símbolos/leverage de cada preset customizado.
- Condições de payout podem depender da data de compra; o dataset registra apenas a regra oficialmente publicada e datada.

## Conflitos

- A página específica do E8 One informa 3% daily e 4% dynamic; a FAQ de conta customizada já exibiu presets diferentes. Foi priorizada a página específica atual.
- Páginas atuais do Signature coexistem com coleção identificada como legado. A disponibilidade comercial deve ser confirmada no checkout.
- A página de plataformas futures afirma que somente Zero está disponível, enquanto a página Signature Futures permanece atualizada. O programa é mantido com completude parcial e conflito explícito.

## Account-level review

- Revisão: 2026-07-17; 9 programas e 22 tamanhos/variantes.
- Signature e Zero têm linhas explícitas por tamanho; One permanece como faixa customizável e Pro depende do checkout.
- Regras Forex, Crypto e Futures não foram combinadas; contratos futures e forced close permanecem específicos.
- Lacunas: tamanhos/preços E8 Pro, contratos Zero e disponibilidade comercial Signature.
- A coexistência de páginas Signature e a indicação de disponibilidade futures continua registrada como conflito.
- Matriz consolidada: [account-rules-matrix.md](account-level/account-rules-matrix.md).

> Regras podem mudar por data de compra. Confirme sempre o produto e os termos exibidos no checkout oficial.
