# Hantec Trader - evidências oficiais

## Revisão

- Última revisão: 2026-07-15
- Confiança: alta
- Completude: completa para Instant, Express e Enhanced; parcial para leverage do EnhancedX
- Programas publicados: Instant Funding, Express, Enhanced e EnhancedX

## Fontes oficiais inspecionadas

- [Instant Funding](https://htrader.hmarkets.com/programs/instant-funding/)
- [Express Challenge](https://htrader.hmarkets.com/programs/express-challenge/)
- [Enhanced Challenge](https://htrader.hmarkets.com/programs/enhanced-challenge/)
- [EnhancedX rules](https://help.htrader.hmarkets.com/en/support/solutions/articles/158000445799-enhancedx-2-step-consistency-)
- [Challenge Types](https://help.htrader.hmarkets.com/en/support/solutions/folders/158001038630)

## Regras extraídas

| Programa | Meta | Daily Loss | Total Loss | Dias/consistência |
| --- | --- | --- | --- | --- |
| Instant | sem meta | 6% | 6% trailing | sem mínimo |
| Express | 10% | 5% | 6% trailing | sem mínimo |
| Enhanced | 10% + 5% | 5% | 10% estático | 3 dias de 0,5% por fase |
| EnhancedX | 8% + 4% | 4% | 8% estático | consistência 35%, sem mínimo |

Daily Loss usa o maior entre balance/equity anterior às 00:00 server time. O trailing de Instant/Express acompanha closed balance e trava no saldo inicial após atingir 6% de lucro.

## Operação, EA e payout

- Challenge normalmente não restringe news; Trader Account proíbe abrir/fechar ±3 minutos de red-folder news.
- Express, Enhanced e EnhancedX permitem weekend holding. Instant exige fechamento na sexta às 23:45 GMT+3.
- EA é proibido no Instant; nos demais é aceito se não violar estratégias restritas.
- Split padrão 80%, até 95% com add-on. EnhancedX: primeiro Reward após 14 dias, mínimo 2%, retirada integral do lucro disponível.
- KYC e contrato ocorrem antes da Hantec Trader Account.

## Proibições e incertezas

- Hard breach ao exceder Daily/Total Loss.
- Proibidos exploits e estratégias da lista restrita oficial.
- EnhancedX limita risco aberto funded a 3%.
- Leverage do EnhancedX não aparece no artigo revisado: `Não informado publicamente`.

## Monitorabilidade

- `automatic_mt5`: meta, perdas, trailing, dias lucrativos, consistência, inatividade e risco aberto.
- `manual_check`: news, add-ons, KYC, payout e estratégias restritas.
- `not_supported_yet`: calendário Forex Factory e verificação automática de jurisdição.

## Account-level review

- Revisão: 2026-07-17; 4 programas e 26 tamanhos/variantes.
- Enhanced vigente cobre $5K–$200K; Express/EnhancedX preservam suas grades e Instant cobre $1K–$50K.
- O cálculo diário foi versionado: contas desde 01/02/2026 usam o maior entre balance/equity; contas anteriores têm regra balance-only.
- Lacunas: preços, tamanhos vigentes do EnhancedX, leverage EnhancedX e mínimo de saque.
- Matriz consolidada: [account-rules-matrix.md](account-level/account-rules-matrix.md).

> As regras podem mudar sem aviso. Confirme sempre os termos oficiais da mesa antes de operar.
