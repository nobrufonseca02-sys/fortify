# Matriz prática de regras por conta

Última revisão: 2026-07-17

Esta matriz resume os 54 registros da biblioteca. O dataset tipado contém 255 tamanhos/variantes operacionais com campos adicionais de plataforma, fases, preço, contratos/lotes, leverage, payout, KYC, proibições, versões, fontes e monitorabilidade.

Legenda: `auto` = monitorável com os dados MT5 atuais; `manual` = exige dashboard, contrato, calendário ou plataforma externa; `status` = sem conta operacional.

| Mesa | Programa | Contas | Meta | Daily | Max / tipo | Consistência | News / weekend | Payout | Mon. | Fonte |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ASAP Funding Prop | Challenge Express | $3K/$5K/$10K/$25K/$50K/$100K/$200K | 6% | 3% | 6% static | sem consistência | news livre na avaliação; final de semana: Não informado publicamente | 70% na Funded | auto | verified |
| ASAP Funding Prop | Funded Express | $3K/$5K/$10K/$25K/$50K/$100K/$200K | Não aplicável | 3% | 6% static; floating 1,5% | Trade Value Score 33% | news ±5 min proibido; final de semana: Não informado publicamente | 70%/15 dias | auto | verified |
| ASAP Funding Prop | Instant Account | $3K/$5K/$10K/$25K/$50K/$100K | Não aplicável | 3% | 6% static; floating 1,5% | Trade Value Score 33% | news ±5 min proibido; final de semana: Não informado publicamente | 70%/15 dias | auto | verified |
| NP Future | Standard - BlackArrow | $25K/$50K/$100K/$150K/$200K | $1.5K/$3K/$6K/$9K/$12K | $600/$1.2K/$1.8K/$2.7K/$3.6K | $1K/$2K/$3K/$4.5K/$6K static | 50% | regulamento; janela BlackArrow | sem payout na avaliação | manual | verified |
| NP Future | Standard - MT5 | $25K/$50K/$100K/$150K/$200K | $1.5K/$3K/$6K/$9K/$12K | $600/$1.2K/$1.8K/$2.7K/$3.6K | $1K/$2K/$3K/$4.5K/$6K static | 50% | regulamento; MT5 | sem payout na avaliação | auto | verified |
| NP Future | Funded - BlackArrow | $25K/$50K/$100K/$150K/$200K | Não aplicável | não possui | $1K/$2K/$3K/$4.5K/$6K EOD | 30% | regulamento; janela BlackArrow | 80/20; depois 90/10 | manual | verified |
| NP Future | Funded - MT5 | $25K/$50K/$100K/$150K/$200K | Não aplicável | não possui | $1K/$2K/$3K/$4.5K/$6K EOD | 30% | regulamento; MT5 | 80/20; depois 90/10 | auto | verified |
| NP Future | Flash - BlackArrow | $25K/$50K/$100K/$150K/$200K | meta por ciclo | $600/$1.2K/$1.8K/$2.7K/$3.6K | $1K/$2K/$3K/$4.5K/$6K EOD | 20% | regulamento; janela BlackArrow | teto por ciclo; 80/20 → 90/10 | manual | verified |
| NP Future | Flash - MT5 | $25K/$50K/$100K/$150K/$200K | meta por ciclo | $600/$1.2K/$1.8K/$2.7K/$3.6K | $1K/$2K/$3K/$4.5K/$6K EOD | 20% | regulamento; MT5 | teto por ciclo; 80/20 → 90/10 | auto | verified |
| FTMO | Challenge 1-Step | $10K/$25K/$50K/$100K/$200K | 10% | 3% | 10% EOD trailing | Best Day 50% | avaliação livre; Standard restringe eventos | 90%; ≥14 dias | auto | verified |
| FTMO | Challenge 2-Step | $10K/$25K/$50K/$100K/$200K | 10%/5% | 5% | 10% static | sem consistência | avaliação livre; Standard/Swing diferem | 80%→90%; ≥14 dias | auto | verified |
| Apex Trader Funding | EOD Evaluation | $25K/$50K/$100K/$150K | $1.5K/$3K/$6K/$9K | $500/$1K/$1.5K/$2K | $1K/$2K/$3K/$4K EOD | nenhuma na evaluation | estratégia normal; horários futures | PA 100%; modalidade vigente | manual | verified |
| Apex Trader Funding | Intraday Evaluation | $25K/$50K/$100K/$150K | $1.5K/$3K/$6K/$9K | não possui | $1K/$2K/$3K/$4K intraday | PA <50% | estratégia normal; horários futures | PA: 5 dias, mínimo $500 | manual | verified |
| Hantec Trader | Instant Funding | $1K/$2K/$5K/$10K/$25K/$50K | Não aplicável | 6% | 6% trailing | reward conforme contrato | news ±3 min; fecha sexta | 80%→95%; 14/7 dias | auto | verified |
| Hantec Trader | Express Challenge | $2K/$5K/$10K/$25K/$50K/$100K/$200K | 10% | 5% | 6% trailing | sem consistência | challenge livre; funded ±3 min | 80%→95% | auto | verified |
| Hantec Trader | Enhanced Challenge | $5K/$10K/$25K/$50K/$100K/$200K | 10%/5% | 5% | 10% static | 3 dias de 0,5% | challenge livre; funded ±3 min | 80%→95% | auto | verified |
| Hantec Trader | EnhancedX Challenge | $2K/$5K/$10K/$25K/$50K/$100K/$200K | 8%/4% | 4% | 8% static | Best Day 35% | challenge livre; funded ±3 min | 80%; ≥14 dias e 2% | auto | verified |
| Topstep | Trading Combine | $50K/$100K/$150K | $3K/$6K/$9K | DLL opcional | $2K/$3K/$4.5K EOD | Best Day 50% | horários futures | XFA 90/10; 3 ou 5 dias | manual | verified |
| The Trading Pit | Prime Futures | $50K/$100K/$150K | $3K/$6K/$9K | Pause $1K/$2K/$3K | $2K/$3K/$4.5K EOD | 40% | news permitido; sem overnight | 80%; 5 dias de $200 | manual | verified |
| The Trading Pit | CFD Prime 1-Phase | $2.5K/$5K/$10K/$20K/$50K/$100K/$200K | 10% | 3% | 6% static | por data/tamanho | confirmar contrato | 80%; mínimo $100/14 dias | auto | verified |
| FundingPips | 1 Step Model | $5K/$10K/$25K/$50K/$100K | 10% | 3% | 6% static | policy ≥$25K por data | evaluation livre; Master news/weekend restritos | 60/80/90/100% por ciclo | auto | verified |
| FundingPips | 2 Step Standard | $2.5K/$5K/$10K/$25K/$50K/$100K | 8% ou 10%/5% | 5% | 10% static | policy ≥$25K por data | evaluation livre; Master news/weekend restritos | 60/80/90/100% por ciclo | auto | verified |
| FundedNext | Stellar 1-Step | $6K/$15K/$25K/$50K/$100K/$200K | 10% | 3% | 6% static | add-on 40% | verificar política/add-on | 80% inicial; ciclo 5 dias úteis | auto | verified |
| FundedNext | Stellar 2-Step | $6K/$15K/$25K/$50K/$100K/$200K | 8%/5% | 5% | 10% static | add-on 40% | verificar política/add-on | 80%; 21 dias, depois 14 | auto | verified |
| The5ers | High Stakes New | $2.5K/$5K/$10K/$25K/$50K/$100K | 10%/5% | 5% | 10% static | 3 dias de 0,5% | holding permitido; news ±2 min | 80%→100%; 14 dias; mínimo $150 | auto | verified |
| The5ers | High Stakes Classic | $2.5K/$5K/$10K/$25K/$50K/$100K | 8%/5% | 5% | 10% static | 3 dias de 0,5% | holding permitido; news ±2 min | 80%→100%; 14 dias; mínimo $150 | auto | verified |
| FXIFY | One Phase | $10K/$25K/$50K/$100K/$250K | 10% | 3% | 6% trailing | nenhuma | padrão permite news/weekend | até 90%; on-demand | auto | verified |
| FXIFY | Two Phase Standard | $10K/$25K/$50K/$100K/$250K | 10%/5% | 4% | 10% trailing | nenhuma | padrão permite news/weekend | até 90%; 14/30 dias | auto | verified |
| FXIFY | Two Phase Classic | $5K–$100K | 5%/10% | 4% | 10% static | 25% funded | padrão permite; confirmar | até 100%; 14/30 dias | auto | verified |
| FXIFY | Two Phase Pro | $10K/$25K/$50K/$100K/$150K/$200K/$250K | 4%/8% | 4% | 8% static | cap diário $4K | news permitido; final de semana: Não informado publicamente | 80%; 10 dias; caps iniciais | auto | verified |
| FXIFY | Three Phase | $10K/$25K/$50K/$100K/$250K | 5%/5%/5% | 5% | 5% static | nenhuma | padrão permite news/weekend | até 90%; 14/30 dias | auto | verified |
| FXIFY | Instant Funding | $1K–$100K | Não aplicável | 8% | 8% trailing | nenhuma | news ±5 min proibido | até 90%; 14 dias | auto | verified |
| FXIFY | Instant Funding Lite | $2.5K/$5K/$10K/$25K/$50K/$100K | Não aplicável | 3% | 4% trailing | Best Day 20% | news ±5 min; sem weekend | 80%→90%; ≥10 dias; mínimo $50 | auto | verified |
| FXIFY | Lightning Challenge | checkout | 5% | 3% | 4% trailing | Best Day 30% | news ±5 min; final de semana: Não informado publicamente | até 90%; 7/14 dias | auto | verified |
| E8 Markets | E8 One Forex | $5K–$500K customizável | 6% preset | 3% preset | 4% dynamic preset | Performance 40% | challenge livre; Performance ±5 min | on-demand; buffer diário | auto | verified |
| E8 Markets | E8 One Crypto | $5K–$500K customizável | 6% preset | 3% preset | 4% dynamic preset | Performance 40% | challenge livre; Performance ±5 min | on-demand; buffer diário | auto | verified |
| E8 Markets | E8 Pro Forex | checkout | 8% | 2,5% | 8% static | daily profit cap 2% | news/overnight permitidos | diário após 1%; buffer 50% | auto | verified |
| E8 Markets | E8 Pro Crypto | checkout | 8% | 2,5% | 8% static | daily profit cap 2% | news/overnight permitidos | diário após 1%; buffer 50% | auto | verified |
| E8 Markets | E8 Signature Forex | $25K/$50K/$100K/$150K | 6% | Challenge: Não aplicável; PA 2% pause | $1K/$2K/$3K/$4.5K EOD | PA 35% | permitido; fecha diariamente | 80%; mínimo $100 | auto | verified |
| E8 Markets | E8 Signature Crypto | $25K/$50K/$100K/$150K | 6% | Challenge: Não aplicável; PA 2% pause | $1K/$2K/$3K/$4.5K EOD | PA 35% | permitido; fecha diariamente | 80%; mínimo $100 | auto | verified |
| E8 Markets | E8 Signature Futures | $25K/$50K/$100K/$150K | $1.5K/$3K/$6K/$9K | Challenge: Não aplicável; PA 2% pause | $1K/$2K/$3K/$4.5K EOD | PA 35% | permitido; sem overnight | 80%; mínimo $100; caps | manual | verified |
| E8 Markets | E8 Zero Futures Starter | $50K/$100K/$200K | $3K/$6.5K/$13.5K | Não aplicável | 3% EOD | Challenge 40%; PA: Não aplicável | permitido; sem overnight | 80/100%; diário; caps | manual | verified |
| E8 Markets | E8 Zero Futures Max | $50K/$100K/$200K | $3K/$6.5K/$13.5K | Não aplicável | 3% EOD | Challenge 40%; PA: Não aplicável | permitido; sem overnight | 80/100%; diário; caps | manual | verified |
| BrightFunded | 2-Step Bright | $5K/$10K/$25K/$50K/$100K/$200K | 8%/5% | 4% | 8% static | nenhuma | challenge livre; funded ±5 min | 80%; 30 dias, depois 14 | auto | verified |
| BrightFunded | 2-Step Classic | $5K/$10K/$25K/$50K/$100K/$200K | 10%/5% | 5% | 10% static | nenhuma | challenge livre; funded ±5 min | 80%; 30 dias, depois 14 | auto | verified |
| BrightFunded | 1-Step | $5K/$10K/$25K/$50K/$100K/$200K | 10% | 3% | 6% trailing | nenhuma | challenge livre; funded ±5 min | 80%; 30 dias, depois 14 | auto | verified |
| Alpha Capital Group | Alpha Pro 10% | $5K/$10K/$25K/$50K/$100K/$200K/$300K | 10%/5% | 5% | 10% static | payout Best Day 40% | evaluation livre; Qualified ±2 min | até 80%; on-demand/14 dias | auto | verified |
| Alpha Capital Group | Alpha Pro 8% | $5K/$10K/$25K/$50K/$100K/$200K/$300K | 8%/5% | 4% | 8% static | payout Best Day 40% | evaluation livre; Qualified ±2 min | até 80%; on-demand/14 dias | auto | verified |
| Alpha Capital Group | Alpha Pro 6% | $5K/$10K/$25K/$50K/$100K/$200K/$300K | 6%/6% | 3% | 6% static | payout Best Day 40% | evaluation livre; Qualified ±5 min | até 80%; on-demand/14 dias | auto | verified |
| Alpha Capital Group | Alpha Swing | $5K/$10K/$25K/$50K/$100K/$200K/$300K | 10%/5% | 5% | 10% static | payout Best Day 40% | news/weekend permitidos com regra de duração | até 80%; on-demand | auto | verified |
| Alpha Capital Group | Alpha One | $5K/$10K/$25K/$50K/$100K/$200K/$300K | 10% | 4% | 6% trailing | payout Best Day 40% | evaluation livre; Qualified ±5 min | até 80%; on-demand | auto | verified |
| Alpha Capital Group | Alpha Three | $5K/$10K/$25K/$50K/$100K/$200K/$300K | 8%/4%/4% | 4% | 6% static | payout Best Day 40% | evaluation livre; Qualified ±5 min | até 80%; on-demand/14 dias | auto | verified |
| MyFundedFX | Operação encerrada | Não aplicável | Não aplicável | Não aplicável | Não aplicável | Não aplicável | Não aplicável | Não aplicável | status | official_source_unavailable |
| Fundscap | Catálogo prop indisponível | Não aplicável | Não aplicável | Não aplicável | Não aplicável | Não aplicável | Não aplicável | Não aplicável | status | official_source_unavailable |

## Notas de aplicação

- As linhas acima são resumos. O motor deve usar `accountLevelRules`, não interpretar texto desta matriz.
- Preço `Não informado publicamente` não significa gratuito; significa que o checkout oficial é a única autoridade estável.
- O registro de versão deve ser selecionado pela data de compra, tipo de evaluation e plataforma.
- Contas futures permanecem `manual` até existir conector oficial no Fortify.
- MyFundedFX e Fundscap não podem ser selecionadas como conta operacional.

> As regras podem mudar sem aviso. Confirme sempre os termos oficiais da mesa antes de operar.
