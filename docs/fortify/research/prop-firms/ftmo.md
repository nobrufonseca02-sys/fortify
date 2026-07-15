# FTMO - evidências oficiais

## Revisão

- Última revisão: 2026-07-15
- Confiança: alta
- Completude: completa para 1-Step e 2-Step; condições individuais do contrato/dashboard sempre prevalecem
- Programas publicados no dataset: FTMO Challenge 1-Step e FTMO Challenge 2-Step

## Fontes oficiais inspecionadas

- [Trading Objectives](https://ftmo.com/en/trading-objectives/)
- [1-Step Challenge](https://ftmo.com/en/1-step-challenge/)
- [2-Step Challenge](https://ftmo.com/en/2-step-challenge/)
- [Forbidden Trading Practices](https://ftmo.com/en/forbidden-trading-practices/)
- [Reward withdrawal FAQ](https://ftmo.com/faq/how-do-i-withdraw-my-profits/)
- [Swing Account FAQ](https://ftmo.com/faq/ftmo-swing-account-type/)

## Regras extraídas

| Campo | 1-Step | 2-Step |
| --- | --- | --- |
| Tamanhos | $10K, $25K, $50K, $100K, $200K | $10K, $25K, $50K, $100K, $200K |
| Fases/meta | 1 fase, 10% | 10% + 5% |
| Daily Loss | 3% | 5% |
| Maximum Loss | 10%, EOD trailing | 10%, estático |
| Dias | Sem mínimo | 4 por fase |
| Prazo | Ilimitado | Ilimitado |
| Consistência | Best Day 50% | Não aplicada à aprovação |
| Leverage | Standard até 1:100 | Standard até 1:100; Swing até 1:30 |
| Reward | 90%, a partir de 14 dias | 80%, até 90%; a partir de 14 dias |

O Daily Loss é recalculado às 00:00 CE(S)T e inclui P&L fechado, P&L flutuante, comissões e swaps. No 1-Step, o Maximum Loss acompanha o maior saldo diário e só sobe. No 2-Step, o limite total é estático.

## Operação, EA e proibições

- Avaliações permitem news e weekend holding; regras mudam na FTMO Account.
- Swing só existe no percurso 2-Step e remove restrições de notícia/weekend da conta Standard.
- EAs são aceitos quando legítimos, replicáveis e dentro dos limites de servidor.
- São proibidos exploração de feed/latência, coordenação entre contas, acesso por terceiros, overexposure, account rolling, HFT/manipulação e distribuição artificial de lucro para burlar Best Day.

## Payout, KYC e scaling

- Reward pode ser solicitado a partir do 14º dia após o primeiro trade, com posições e ordens fechadas.
- A FTMO informa revisão normal de 1 a 2 dias úteis.
- KYC e contrato são etapas externas ao MT5 e exigem verificação manual.
- O 2-Step pode chegar a 90% conforme scaling/premium; o 1-Step inicia em 90%.

## Conflitos e incertezas

- Não há conflito material entre as páginas revisadas.
- Restrições exatas de eventos da conta Standard dependem do calendário oficial vigente.
- Especificações por instrumento podem mudar e devem ser conferidas no dashboard.

## Monitorabilidade

### `automatic_mt5`

- Meta, Daily Loss, Maximum Loss, Best Day, dias negociados, P&L aberto e custos.

### `manual_check`

- Tipo Standard/Swing, KYC, contrato, revisão de Reward, acesso por terceiros e conduta coordenada.

### `not_supported_yet`

- Calendário FTMO de eventos restritos e identificação automatizada de manipulação multi-conta.

> As regras podem mudar sem aviso. Confirme sempre os termos oficiais da mesa antes de operar.
