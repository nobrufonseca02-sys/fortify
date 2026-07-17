# Análise de lacunas por conta

Última revisão: 2026-07-17

## Escopo e critério

Esta análise cobre os 54 registros canônicos da biblioteca Fortify. Os 52 programas operacionais foram expandidos em 255 tamanhos/variantes tipados. MyFundedFX e Fundscap permanecem como perfis de status, sem contas operacionais inventadas.

Classificação:

- `critical_missing`: falta um campo indispensável para configurar a conta com precisão.
- `important_missing`: o núcleo de risco existe, mas uma regra operacional ainda depende do checkout, dashboard ou contrato.
- `optional_missing`: dado útil, sem impacto direto no monitoramento do limite.
- `not_public`: a fonte oficial não publica o valor de forma estável.
- `not_applicable`: o campo não se aplica ao estágio.
- `legacy_or_unavailable`: não há produto vigente auditável.

Valores desconhecidos no dataset usam exclusivamente `Verificar no site oficial`, `Não informado publicamente` ou `Não aplicável`.

## Resultado executivo

- Campos críticos de meta, perda diária, perda máxima, tipo/cálculo de drawdown, plataforma e fonte estão explícitos em todos os 255 registros operacionais.
- Preço público estável foi encontrado por tamanho para Topstep e Prime Futures da The Trading Pit. Nos demais programas, preço foi marcado como `Não informado publicamente`.
- As maiores lacunas importantes são: preço dinâmico, lote/contrato em CFDs, valor mínimo de saque, scaling e regras que mudam por add-on.
- FXIFY Lightning, E8 One/Pro e alguns produtos customizáveis preservam tamanho como faixa ou checkout porque a fonte oficial não publica uma grade estável.
- Regras versionadas foram registradas para BrightFunded, FundingPips, Hantec, Topstep, Apex e The Trading Pit.

## Lacunas por programa

| Mesa | Programa | Variantes | Crítico | Importante | Preço | Completude |
| --- | --- | ---: | --- | --- | --- | --- |
| ASAP Funding Prop | Challenge Express | 7 | none | weekend, preço, reset, saque/scaling | not_public | complete |
| ASAP Funding Prop | Funded Express | 7 | none | leverage, weekend, preço, saque/scaling | not_public | partial |
| ASAP Funding Prop | Instant Account | 6 | none | weekend, preço, saque/scaling | not_public | partial |
| NP Future | Standard - BlackArrow | 5 | none | preço, prazo, reset e automação detalhada | not_public | partial |
| NP Future | Standard - MT5 | 5 | none | preço, prazo, reset e automação detalhada | not_public | partial |
| NP Future | Funded - BlackArrow | 5 | none | mínimo de saque, scaling e prazo | not_public | complete |
| NP Future | Funded - MT5 | 5 | none | mínimo de saque, scaling e prazo | not_public | complete |
| NP Future | Flash - BlackArrow | 5 | none | preço, scaling e reset | not_public | complete |
| NP Future | Flash - MT5 | 5 | none | preço, scaling e reset | not_public | complete |
| FTMO | FTMO Challenge 1-Step | 5 | none | preço por tamanho, lotes e mínimo de saque | not_public | complete |
| FTMO | FTMO Challenge 2-Step | 5 | none | preço por tamanho, lotes e mínimo de saque | not_public | complete |
| Apex Trader Funding | EOD Trailing Drawdown Evaluation | 4 | none | preço e payout EOD por versão de PA | not_public | partial |
| Apex Trader Funding | Intraday Trailing Drawdown Evaluation | 4 | none | preço e tier de scaling da PA | not_public | complete |
| Hantec Trader | Instant Funding | 6 | none | preço, mínimo de saque e scaling | not_public | complete |
| Hantec Trader | Express Challenge | 7 | none | preço, mínimo de saque e scaling | not_public | complete |
| Hantec Trader | Enhanced Challenge | 6 | none | preço, mínimo de saque e scaling | not_public | complete |
| Hantec Trader | EnhancedX Challenge | 7 | none | leverage, preço e tamanhos vigentes | not_public | partial |
| Topstep | Trading Combine | 3 | none | mínimo de saque da XFA e restrições temporárias | covered | complete |
| The Trading Pit | Prime Futures Challenge | 3 | none | valor mínimo de reward e política por data | covered | complete |
| The Trading Pit | CFD Prime 1-Phase | 7 | none | preço, news/weekend e regras por data/tamanho | not_public | partial |
| FundingPips | 1 Step Model | 5 | none | preço e scaling; condições temporárias | not_public | complete |
| FundingPips | 2 Step Standard | 6 | none | preço e scaling; condições temporárias | not_public | complete |
| FundedNext | Stellar 1-Step | 6 | none | preço, news/weekend, lote máximo | not_public | partial |
| FundedNext | Stellar 2-Step | 6 | none | preço, news/weekend, lote máximo | not_public | complete |
| The5ers | High Stakes New | 6 | none | preço e copy trading detalhado | not_public | complete |
| The5ers | High Stakes Classic | 6 | none | preço, refund/HUB e copy detalhado | not_public | complete |
| FXIFY | One Phase | 5 | none | preço e lote máximo | not_public | complete |
| FXIFY | Two Phase Standard | 5 | none | preço e lote máximo | not_public | complete |
| FXIFY | Two Phase Classic | 1 faixa | exact sizes | preço, leverage e checkout vigente | not_public | partial |
| FXIFY | Two Phase Pro | 7 | none | preço, leverage e weekend | not_public | complete |
| FXIFY | Three Phase | 5 | none | preço e lote máximo | not_public | complete |
| FXIFY | Instant Funding | 1 faixa | exact sizes | preço e lote máximo | not_public | complete |
| FXIFY | Instant Funding Lite | 6 | none | preço e lote máximo | not_public | complete |
| FXIFY | Lightning Challenge | 1 checkout | exact sizes | preço, leverage e weekend | not_public | partial |
| E8 Markets | E8 One Forex | 1 faixa customizável | preset exact sizes | preço e parâmetros escolhidos | not_public | partial |
| E8 Markets | E8 One Crypto | 1 faixa customizável | preset exact sizes | preço e parâmetros escolhidos | not_public | partial |
| E8 Markets | E8 Pro Forex | 1 checkout | exact sizes | preço e tamanhos vigentes | not_public | complete |
| E8 Markets | E8 Pro Crypto | 1 checkout | exact sizes | preço e tamanhos vigentes | not_public | complete |
| E8 Markets | E8 Signature Forex | 4 | none | preço e disponibilidade comercial | not_public | partial |
| E8 Markets | E8 Signature Crypto | 4 | none | preço e disponibilidade comercial | not_public | partial |
| E8 Markets | E8 Signature Futures | 4 | none | preço, contratos e disponibilidade | not_public | partial |
| E8 Markets | E8 Zero Futures Starter | 3 | max contracts | preço e contrato máximo | not_public | complete |
| E8 Markets | E8 Zero Futures Max | 3 | max contracts | preço e contrato máximo | not_public | complete |
| BrightFunded | 2-Step Bright | 6 | none | preço, leverage/lotes por plataforma/add-on | not_public | complete |
| BrightFunded | 2-Step Classic | 6 | none | preço, leverage/lotes por plataforma/add-on | not_public | complete |
| BrightFunded | 1-Step | 6 | none | preço, leverage/lotes por plataforma/add-on | not_public | complete |
| Alpha Capital Group | Alpha Pro 10% | 7 | none | preço, símbolos e mínimo de saque | not_public | complete |
| Alpha Capital Group | Alpha Pro 8% | 7 | none | preço, símbolos e mínimo de saque | not_public | complete |
| Alpha Capital Group | Alpha Pro 6% | 7 | none | preço, símbolos e mínimo de saque | not_public | complete |
| Alpha Capital Group | Alpha Swing | 7 | none | preço, símbolos e mínimo de saque | not_public | complete |
| Alpha Capital Group | Alpha One | 7 | none | preço, símbolos e mínimo de saque | not_public | complete |
| Alpha Capital Group | Alpha Three | 7 | none | preço, símbolos e mínimo de saque | not_public | complete |
| MyFundedFX | Operação encerrada - catálogo indisponível | 0 | legacy_or_unavailable | not_applicable | not_applicable | legacy |
| Fundscap | Programas prop - catálogo público indisponível | 0 | legacy_or_unavailable | not_applicable | not_applicable | legacy |

## Prioridade de fechamento

1. Capturar grades de checkout versionadas sem automatizar endpoints privados.
2. Confirmar tamanhos E8 Pro, FXIFY Lightning/Classic e contratos E8 Zero em fonte pública estável.
3. Versionar regras temporárias de FundingPips e Topstep com data de encerramento quando publicada.
4. Adicionar conectores futures antes de classificar Apex, Topstep, TTP e E8 Futures como automáticos.
5. Manter MyFundedFX e Fundscap sem contas até surgir rulebook oficial vigente.

> As regras podem mudar sem aviso. Confirme sempre os termos oficiais da mesa antes de operar.
