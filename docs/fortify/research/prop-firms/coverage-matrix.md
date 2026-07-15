# Matriz de cobertura - Prop Firm Rules Library

Última atualização: 2026-07-15

Esta matriz separa presença comercial/legada de evidência oficial auditável. `Backlog` não significa que a mesa não exista no produto; significa que ainda não possui pacote de evidência e dataset normalizado suficiente para publicação auditável.

| Mesa canônica | Evidência oficial | Dataset auditável | Estado | Confiança | Principal lacuna |
| --- | --- | --- | --- | --- | --- |
| FTMO | Parcial | Sim, legado | Parcial | Média | Revisar versões/programas vigentes e adicionar metadados completos |
| FundingPips | Não | Não | Backlog | Baixa | Coletar termos oficiais por programa |
| FXIFY | Não | Não | Backlog | Baixa | Coletar termos oficiais por programa |
| The Trading Pit | Não | Não | Backlog | Baixa | Separar Futures e CFD/Forex |
| E8 Markets | Não | Não | Backlog | Baixa | Coletar regras vigentes por produto |
| FundedNext | Não | Não | Backlog | Baixa | Separar Evaluation, Express e Funded |
| The5ers | Não | Não | Backlog | Baixa | Separar High Stakes e Hyper Growth |
| BrightFunded | Não | Não | Backlog | Baixa | Coletar termos e payout vigentes |
| Apex Trader Funding | Parcial | Sim, legado | Parcial | Média | Revisar EOD/Intraday e regras PA vigentes |
| Topstep | Não | Não | Backlog | Baixa | Coletar Trading Combine e Funded oficiais |
| Hantec Trader | Parcial | Sim, legado | Parcial | Média | Substituir placeholders Express/Enhanced/EnhancedX |
| Fundscap | Não | Não | Backlog | Baixa | Confirmar fonte oficial e catálogo vigente |
| Alpha Capital Group | Não | Não | Backlog | Baixa | Coletar termos oficiais por programa |
| MyFundedFX | Não | Não | Backlog | Baixa | Verificar situação e termos oficiais atuais |
| ASAP Funding Prop | Sim | Sim | Publicável com lacunas marcadas | Alta | Funded leverage, fim de semana e reset técnico diário |
| NP Future | Sim | Sim | Publicável com conflitos marcados | Alta | Base temporal do Max Loss Standard e integração BlackArrow |

## Critério para sair do backlog

1. Fonte oficial vigente e URL estável.
2. Programa e fase separados, sem misturar avaliação e funded.
3. Data de revisão, confiança, completude e conflitos registrados.
4. Monitorabilidade classificada em `automatic_mt5`, `manual_check` e `not_supported_yet`.
5. Limites conferidos por tamanho de conta.
6. Revisão humana antes de publicação.

## Próxima fila recomendada

1. Completar FTMO, Apex e Hantec, pois já aparecem no dataset público.
2. Topstep e The Trading Pit, para ampliar cobertura de futuros.
3. FundingPips, FundedNext e The5ers, pela relevância no segmento MT5.
4. Demais mesas após confirmar demanda e disponibilidade de termos oficiais.

> As regras podem mudar sem aviso. Confirme sempre os termos oficiais da mesa antes de operar.
