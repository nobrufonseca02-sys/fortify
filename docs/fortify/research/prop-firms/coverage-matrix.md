# Matriz de cobertura - Prop Firm Rules Library

Última atualização: 2026-07-15

`Publicável` exige programa separado por fase/produto, ao menos uma fonte oficial, data, confiança, completude e monitorabilidade. `Backlog` não cria programa no dataset público. Contagens de regras representam grupos monitoráveis, não fórmulas já ativadas no motor.

| Mesa canônica | Programas | Fontes | Completude | Confiança | Revisão | Auto | Manual | Campos críticos ausentes | Estado / backlog |
| --- | ---: | ---: | --- | --- | --- | ---: | ---: | --- | --- |
| FTMO | 2 | 7 | Completa | Alta | 2026-07-15 | 6 | 3 | Calendário de eventos Standard | Publicável |
| FundingPips | 2 | 4 | Completa | Alta | 2026-07-15 | 7 | 4 | Medidas temporárias mudam com frequência | Publicável; revisar news/weekend/leverage |
| FXIFY | 0 | 0 | Ausente | Baixa | - | 0 | 0 | Todos | Backlog Sprint 3 |
| The Trading Pit | 2 | 4 | Parcial | Alta/média | 2026-07-15 | 5 | 6 | News/weekend CFD por contratação | Publicável com lacuna marcada |
| E8 Markets | 0 | 0 | Ausente | Baixa | - | 0 | 0 | Todos | Backlog Sprint 3 |
| FundedNext | 2 | 7 | Parcial | Alta/média | 2026-07-15 | 6 | 4 | News/weekend; conflito de dias 1-Step | Publicável com conflito marcado |
| The5ers | 2 | 5 | Completa | Alta | 2026-07-15 | 6 | 3 | Copy trading detalhado | Publicável |
| BrightFunded | 0 | 0 | Ausente | Baixa | - | 0 | 0 | Todos | Backlog Sprint 3 |
| Apex Trader Funding | 2 | 6 | Parcial | Alta | 2026-07-15 | 0 | 6 | Variantes Legacy PA e conector futures | Publicável; monitoramento manual |
| Topstep | 1 | 5 | Completa | Alta | 2026-07-15 | 0 | 6 | Conector futures | Publicável; monitoramento manual |
| Hantec Trader | 4 | 5 | Parcial | Alta | 2026-07-15 | 7 | 3 | Leverage EnhancedX | Publicável com lacuna marcada |
| Fundscap | 0 | 0 | Ausente | Baixa | - | 0 | 0 | Todos | Backlog; confirmar catálogo oficial |
| Alpha Capital Group | 0 | 0 | Ausente | Baixa | - | 0 | 0 | Todos | Backlog Sprint 3 |
| MyFundedFX | 0 | 0 | Ausente | Baixa | - | 0 | 0 | Situação operacional e termos atuais | Backlog; não publicar sem fonte atual |
| ASAP Funding Prop | 3 | 2 | Parcial | Alta | 2026-07-15 | 8 | 3 | Leverage Funded e weekend | Publicável com lacunas marcadas |
| NP Future | 6 | 2 | Parcial | Alta | 2026-07-15 | 7 | 4 | Base temporal Max Loss Standard | Publicável com conflitos marcados |

## Cobertura Sprint 2

- O dataset público passou de 5 para 10 mesas e de 18 para 26 programas ativos.
- FTMO, Apex e Hantec deixaram de usar entradas legadas/placeholders no agregador.
- Topstep e The Trading Pit ampliam referência de futuros, ainda sem conector automático.
- FundingPips, FundedNext e The5ers ampliam regras monitoráveis via MT5.
- Nenhum programa foi criado para mesas sem fonte oficial revisada.

## Critério para sair do backlog

1. Fonte oficial vigente e URL estável.
2. Programa e fase separados, sem misturar avaliação e funded.
3. Data, confiança, completude, status e conflitos registrados.
4. Monitorabilidade em `automatic_mt5`, `manual_check` e `not_supported_yet`.
5. Limites conferidos por tamanho e versão/data de compra.
6. Testes focados e revisão humana antes de publicar.

## Fila recomendada para Sprint 3

1. FXIFY e E8 Markets.
2. BrightFunded e Alpha Capital Group.
3. Verificar situação operacional de MyFundedFX e catálogo oficial da Fundscap.
4. Só então aprofundar variantes adicionais de programas já cobertos.

> As regras podem mudar sem aviso. Confirme sempre os termos oficiais da mesa antes de operar.
