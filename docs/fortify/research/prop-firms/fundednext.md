# FundedNext - evidências oficiais

## Revisão

- Última revisão: 2026-07-15
- Confiança: média no Stellar 1-Step por conflito documental; alta no 2-Step
- Completude: parcial/completa
- Programas publicados: Stellar 1-Step e Stellar 2-Step

## Fontes oficiais inspecionadas

- [Stellar 1-Step rules](https://help.fundednext.com/en/articles/8021061-what-are-the-rules-for-the-stellar-1-step-challenge-at-fundednext)
- [Stellar 1-Step target](https://help.fundednext.com/en/articles/8030875-what-is-the-profit-target-of-the-stellar-1-step-challenge)
- [Stellar 2-Step rules](https://help.fundednext.com/en/articles/8021076-what-rules-do-i-need-to-follow-in-the-stellar-2-step-challenge)
- [Stellar 2-Step targets](https://help.fundednext.com/en/articles/8021071-what-is-the-profit-target-of-the-stellar-2-step-challenge)
- [Daily vs Maximum Loss](https://help.fundednext.com/en/articles/9941519-daily-loss-limit-vs-maximum-loss-limit)
- [Reward frequency](https://help.fundednext.com/en/articles/10701585-how-often-will-i-receive-my-performance-reward)
- [Add-ons](https://help.fundednext.com/en/articles/8592191-how-does-the-add-on-feature-work-with-the-fundednext-new-challenge-purchase)

## Regras extraídas

| Programa | Meta | Daily Loss | Max Loss | Dias |
| --- | --- | --- | --- | --- |
| Stellar 1-Step | 10% | 3% | 6% estático | 2 |
| Stellar 2-Step | 8% + 5% | 5% | 10% estático | 5 por fase |

- Tamanhos: $6K, $15K, $25K, $50K, $100K e $200K.
- Daily Loss reinicia às 00:00 server time e inclui P&L aberto/fechado.
- EA/indicadores são permitidos dentro dos parâmetros.
- Copy entre Challenge Accounts do mesmo trader é permitido; entre pessoas é proibido.
- Manipulação, latency exploitation e fraude são proibidas.

## Payout, KYC e operação

- Reward Share inicial 80%, escalável para 90%; add-on pode alterar para 95%.
- 1-Step funded: ciclos de 5 dias úteis.
- 2-Step funded: primeiro ciclo de 21 dias e seguintes de 14 após payout lucrativo.
- KYC é obrigatório antes da FundedNext Account.
- News/weekend dependem da política vigente e contratação: verificar no dashboard oficial.

## Conflito registrado

A FAQ específica do 1-Step informa 2 dias. A página genérica de add-ons ainda menciona remover uma regra de 5 dias. O dataset adota 2 dias por especificidade e atualidade, preservando o conflito.

## Monitorabilidade

- `automatic_mt5`: metas, perdas, dias, número de trades e P&L.
- `manual_check`: titularidade/copy, IP/VPN/VPS, KYC, news e Reward review.
- `not_supported_yet`: correlação entre titulares e detecção de manipulação.

## Account-level review

- Revisão: 2026-07-17; 2 programas e 12 tamanhos normalizados.
- Stellar 1-Step e 2-Step cobrem $6K/$15K/$25K/$50K/$100K/$200K.
- Fases, dias/trades mínimos, limites e ciclos de reward permanecem separados por programa.
- Lacunas: preços, lotes máximos e política news/weekend/add-on vigente por contratação.
- Matriz consolidada: [account-rules-matrix.md](account-level/account-rules-matrix.md).

> As regras podem mudar sem aviso. Confirme sempre os termos oficiais da mesa antes de operar.
