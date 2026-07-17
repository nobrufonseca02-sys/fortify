# Matriz de cobertura - Prop Firm Rules Library

Última atualização: 2026-07-17

`Publicável` exige programa separado por fase/produto, ao menos uma fonte oficial, data, confiança, completude e monitorabilidade. A coluna `Contas` representa registros tipados por tamanho/variante, não compras disponíveis no momento. `Backlog` não cria programa operacional.

| Mesa canônica | Prog. | Contas | Tamanhos cobertos | Comp. conta | Fontes | Lacunas críticas | Auto | Manual | Não suportado | Revisão | Prioridade |
| --- | ---: | ---: | --- | --- | ---: | --- | ---: | ---: | ---: | --- | --- |
| FTMO | 2 | 10 | $10K–$200K | completa | 7 | nenhuma; preço/lotes são importantes | 6 | 3 | 2 | 2026-07-17 | média |
| FundingPips | 2 | 11 | $2.5K–$100K | completa/versionada | 4 | nenhuma; regras temporárias | 7 | 4 | 2 | 2026-07-17 | alta |
| FXIFY | 8 | 31 | grades + faixas/checkout | parcial/completa | 17 | tamanhos exatos Classic/Instant/Lightning | 9 | 6 | 3 | 2026-07-17 | alta |
| The Trading Pit | 2 | 10 | CFD $2.5K–$200K; Futures $50K–$150K | parcial/completa | 4 | nenhuma; CFD por contratação | 5 | 6 | 2 | 2026-07-17 | alta |
| E8 Markets | 9 | 22 | grades + presets customizáveis | parcial/completa | 17 | tamanhos Pro e contratos Zero | 9 | 6 | 3 | 2026-07-17 | alta |
| FundedNext | 2 | 12 | $6K–$200K | parcial/completa | 7 | nenhuma; news/weekend por add-on | 6 | 4 | 2 | 2026-07-17 | média |
| The5ers | 2 | 12 | $2.5K–$100K | completa | 5 | nenhuma | 6 | 3 | 2 | 2026-07-17 | média |
| BrightFunded | 3 | 18 | $5K–$200K | completa/versionada | 16 | nenhuma; preço/leverage dinâmicos | 8 | 5 | 3 | 2026-07-17 | média |
| Apex Trader Funding | 2 | 8 | $25K–$150K | parcial/completa | 6 | nenhuma; sem conector futures | 0 | 6 | 3 | 2026-07-17 | média |
| Topstep | 1 | 3 | $50K/$100K/$150K | completa/versionada | 6 | nenhuma; sem conector TopstepX | 0 | 6 | 2 | 2026-07-17 | média |
| Hantec Trader | 4 | 26 | $1K–$200K | parcial/completa | 6 | tamanhos/leverage EnhancedX | 7 | 3 | 2 | 2026-07-17 | alta |
| Fundscap | 1 | 0 | none | legacy/unavailable | 3 | rulebook vigente completo | 0 | 1 | 1 | 2026-07-17 | baixa |
| Alpha Capital Group | 6 | 42 | $5K–$300K | completa | 16 | nenhuma; símbolos por checkout | 10 | 5 | 3 | 2026-07-17 | média |
| MyFundedFX | 1 | 0 | none | legacy/unavailable | 2 | operação encerrada | 0 | 1 | 1 | 2026-07-17 | baixa |
| ASAP Funding Prop | 3 | 20 | $3K–$200K | parcial/completa | 2 | nenhuma; leverage/weekend Funded | 8 | 3 | 1 | 2026-07-17 | média |
| NP Future | 6 | 30 | $25K–$200K por plataforma | parcial/completa | 2 | nenhuma; conflito $200K preservado | 7 | 4 | 2 | 2026-07-17 | alta |

## Cobertura Sprint 2

- O dataset público passou de 5 para 10 mesas e de 18 para 26 programas ativos.
- FTMO, Apex e Hantec deixaram de usar entradas legadas/placeholders no agregador.
- Topstep e The Trading Pit ampliam referência de futuros, ainda sem conector automático.
- FundingPips, FundedNext e The5ers ampliam regras monitoráveis via MT5.
- Nenhum programa foi criado para mesas sem fonte oficial revisada.

## Cobertura Sprint 3

- O dataset passou de 10 para 16 mesas e de 26 para 54 registros de programas/status.
- FXIFY recebeu 8 programas, E8 Markets 9, BrightFunded 3 e Alpha Capital Group 6.
- MyFundedFX e Fundscap receberam uma ficha auditável cada, com todos os campos críticos explicitamente indisponíveis; nenhuma regra histórica ou de terceiro foi inventada.
- Programas, fontes, conflitos e monitorabilidade estão tipados e conectados ao agregador sem alterar os registros concluídos nas Sprints 1 e 2.

## Cobertura Sprint 4

- Os mesmos 16 nomes e 54 registros foram preservados.
- 52 programas ativos agora expõem 255 registros tipados por tamanho/variante.
- Cada conta tem fases, limites, cálculo do drawdown, plataforma, payout, operação, versões, fontes, confiança, completude e monitorabilidade explícitos.
- MyFundedFX e Fundscap expõem zero contas operacionais.
- Topstep e Prime Futures possuem preço oficial por tamanho; demais preços dinâmicos foram marcados como não públicos.
- BrightFunded, FundingPips, Hantec, Topstep, Apex e The Trading Pit possuem condições versionadas por data/produto.
- Matriz detalhada: [account-level/account-rules-matrix.md](account-level/account-rules-matrix.md).
- Lacunas detalhadas: [account-level/account-rules-gap-analysis.md](account-level/account-rules-gap-analysis.md).

## Critério para sair do backlog

1. Fonte oficial vigente e URL estável.
2. Programa e fase separados, sem misturar avaliação e funded.
3. Data, confiança, completude, status e conflitos registrados.
4. Monitorabilidade em `automatic_mt5`, `manual_check` e `not_supported_yet`.
5. Limites conferidos por tamanho e versão/data de compra.
6. Testes focados e revisão humana antes de publicar.

## Fila recomendada para Sprint 5

1. Criar seleção segura de `program + account size + version` na criação da conta.
2. Converter apenas regras `automatic_mt5` de alta confiança em fórmulas executáveis com fixtures reais.
3. Adicionar conectores oficiais para futures antes de automatizar Apex, Topstep, TTP ou E8 Futures.
4. Agendar revisão de fontes temporárias e comparar mudanças sem sobrescrever contas antigas.
5. Monitorar eventual retomada de MyFundedFX ou rulebook público da Fundscap.

> As regras podem mudar sem aviso. Confirme sempre os termos oficiais da mesa antes de operar.
