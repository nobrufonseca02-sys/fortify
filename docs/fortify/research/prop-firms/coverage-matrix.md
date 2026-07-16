# Matriz de cobertura - Prop Firm Rules Library

Última atualização: 2026-07-15

`Publicável` exige programa separado por fase/produto, ao menos uma fonte oficial, data, confiança, completude e monitorabilidade. `Backlog` não cria programa no dataset público. Contagens de regras representam grupos monitoráveis, não fórmulas já ativadas no motor.

| Mesa canônica | Programas | Fontes | Completude | Confiança | Revisão | Auto | Manual | Campos críticos ausentes | Estado / backlog |
| --- | ---: | ---: | --- | --- | --- | ---: | ---: | --- | --- |
| FTMO | 2 | 7 | Completa | Alta | 2026-07-15 | 6 | 3 | Calendário de eventos Standard | Publicável |
| FundingPips | 2 | 4 | Completa | Alta | 2026-07-15 | 7 | 4 | Medidas temporárias mudam com frequência | Publicável; revisar news/weekend/leverage |
| FXIFY | 8 | 16 | Parcial/completa | Alta/média | 2026-07-15 | 9 | 6 | Weekend/leverage Pro e Lightning; lotes globais | Publicável com conflitos marcados |
| The Trading Pit | 2 | 4 | Parcial | Alta/média | 2026-07-15 | 5 | 6 | News/weekend CFD por contratação | Publicável com lacuna marcada |
| E8 Markets | 9 | 17 | Parcial/completa | Alta/média | 2026-07-15 | 9 | 6 | Contratos Zero; disponibilidade Signature | Publicável com conflitos marcados |
| FundedNext | 2 | 7 | Parcial | Alta/média | 2026-07-15 | 6 | 4 | News/weekend; conflito de dias 1-Step | Publicável com conflito marcado |
| The5ers | 2 | 5 | Completa | Alta | 2026-07-15 | 6 | 3 | Copy trading detalhado | Publicável |
| BrightFunded | 3 | 14 | Completa | Alta | 2026-07-15 | 8 | 5 | Leverage/lotes variam por plataforma/add-on | Publicável |
| Apex Trader Funding | 2 | 6 | Parcial | Alta | 2026-07-15 | 0 | 6 | Variantes Legacy PA e conector futures | Publicável; monitoramento manual |
| Topstep | 1 | 5 | Completa | Alta | 2026-07-15 | 0 | 6 | Conector futures | Publicável; monitoramento manual |
| Hantec Trader | 4 | 5 | Parcial | Alta | 2026-07-15 | 7 | 3 | Leverage EnhancedX | Publicável com lacuna marcada |
| Fundscap | 1 | 3 | Indisponível | Alta sobre indisponibilidade | 2026-07-15 | 0 | 1 | Rulebook prop vigente completo | Ficha de indisponibilidade oficial |
| Alpha Capital Group | 6 | 16 | Completa | Alta | 2026-07-15 | 10 | 5 | Símbolos/plataformas por contratação | Publicável |
| MyFundedFX | 1 | 2 | Indisponível | Alta sobre encerramento | 2026-07-15 | 0 | 1 | Todos os parâmetros vigentes | Ficha de encerramento oficial |
| ASAP Funding Prop | 3 | 2 | Parcial | Alta | 2026-07-15 | 8 | 3 | Leverage Funded e weekend | Publicável com lacunas marcadas |
| NP Future | 6 | 2 | Parcial | Alta | 2026-07-15 | 7 | 4 | Base temporal Max Loss Standard | Publicável com conflitos marcados |

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

## Critério para sair do backlog

1. Fonte oficial vigente e URL estável.
2. Programa e fase separados, sem misturar avaliação e funded.
3. Data, confiança, completude, status e conflitos registrados.
4. Monitorabilidade em `automatic_mt5`, `manual_check` e `not_supported_yet`.
5. Limites conferidos por tamanho e versão/data de compra.
6. Testes focados e revisão humana antes de publicar.

## Fila recomendada para Sprint 4

1. Revalidar periodicamente a disponibilidade comercial do E8 Signature e as regras compradas por data.
2. Monitorar eventual retomada oficial de MyFundedFX ou publicação de rulebook prop da Fundscap.
3. Versionar regras por data de compra quando a fonte oficial mantiver políticas legadas e atuais em paralelo.
4. Transformar os grupos `automatic_mt5` em regras executáveis somente após testes com snapshots reais e revisão humana.

> As regras podem mudar sem aviso. Confirme sempre os termos oficiais da mesa antes de operar.
