# The5ers - evidências oficiais

## Revisão

- Última revisão: 2026-07-15
- Confiança/completude: alta/completa para High Stakes New e Classic
- Programas publicados: High Stakes New e High Stakes Classic

## Fontes oficiais inspecionadas

- [High Stakes program](https://the5ers.com/high-stakes/)
- [High Stakes rules](https://help.the5ers.com/what-are-the-general-rules-for-the-high-stakes-program/)
- [Drawdown rule](https://help.the5ers.com/what-is-the-drawdown-rule-for-high-stakes/)
- [News policy](https://help.the5ers.com/is-news-trading-allowed-in-the-high-stakes-program/)
- [Payout policy](https://help.the5ers.com/payout-policy-and-hub-credit-in-the-high-stakes-program/)

## Regras extraídas

| Variante | Meta fase 1 | Meta fase 2 | Daily Loss | Max Loss | Dias |
| --- | --- | --- | --- | --- | --- |
| New | 10% | 5% | 5% | 10% estático | 3 lucrativos/fase |
| Classic | 8% | 5% | 5% | 10% estático | 3 lucrativos/fase |

- Dia lucrativo exige 0,5% do saldo inicial.
- Daily Loss usa o maior entre balance/equity no rollover; Max Loss é absoluto.
- Prazo ilimitado, mas 30 dias sem atividade expiram a conta.
- Leverage 1:100, MT5 Hedge, tamanhos $2.5K a $100K.

## News, weekend, EA/copy e payout

- Holding em news é permitido; executar ordens na janela de ±2 minutos de red-folder news é soft breach.
- Lucros da janela são removidos e perdas permanecem.
- Overnight/weekend holding é permitido; índices podem gerar swap elevado.
- Payout funded a cada 14 dias, mínimo $150, split inicial 80% escalando até 100%.
- Limites de contas e titularidade exigem verificação manual; não foi publicada permissão irrestrita de copy trading.

## Monitorabilidade

- `automatic_mt5`: metas, perdas, dias lucrativos, inatividade e snapshot de rollover.
- `manual_check`: notícias, KYC/payout, titularidade e limites de contas.
- `not_supported_yet`: calendário Forex Factory e correlação entre contas.

## Incertezas

- As variantes New e Classic coexistem; o usuário deve escolher a versão exata contratada.
- Benefícios de HUB credit/refund dependem da data e pagamento utilizado.

> As regras podem mudar sem aviso. Confirme sempre os termos oficiais da mesa antes de operar.
