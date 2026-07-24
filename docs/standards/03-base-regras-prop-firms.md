# Base de Regras de Prop Firms para Fortify

Este documento define como procurar, preparar e validar documentos que alimentam a Biblioteca de Mesas e a IA de extracao de regras.

Ele e a adaptacao mais importante da base Bravy para o produto Fortify.

## Objetivo

Transformar documentos oficiais de prop firms em regras estruturadas que o Fortify consiga:

- exibir na Biblioteca de Mesas;
- aplicar a uma conta MT5;
- avaliar contra saldo, equity, posicoes e trades;
- gerar alertas no Dashboard;
- revisar quando a mesa mudar seus termos.

## Onde procurar documentos

Prioridade de fonte:

1. Pagina oficial de regras do programa.
2. PDF oficial de termos e condicoes.
3. FAQ oficial da mesa.
4. Contrato, dashboard do cliente ou account agreement exibido apos compra.
5. Email oficial de suporte confirmando regra especifica.

Evitar como fonte primaria:

- videos de YouTube;
- posts de afiliados;
- blogs sem vinculo oficial;
- prints soltos;
- resumos de comunidade;
- respostas antigas de chat sem data.

## Fontes oficiais iniciais para pesquisa

Comece pelas mesas que ja aparecem ou combinam com a direcao do Fortify. Esta lista nao substitui revisao humana; ela apenas aponta onde procurar primeiro.

| Mesa | Onde procurar primeiro | Tipo de regra mais util |
| --- | --- | --- |
| FTMO | Trading Objectives e FAQ oficial | objetivos, drawdown, news, weekend, instrumentos |
| Topstep | Help Center, Trading Combine parameters, Express Funded Account rules, Payout Policy | futures, drawdown, consistencia, payout |
| FundedNext | Help Center CFD e Futures, Trading Rules & Guidelines | estrategias proibidas, news, payout, regras por programa |
| The5ers | FAQ, Terms and Conditions, artigos oficiais por regra | news, prohibited practices, termos gerais |
| The Trading Pit | Trading Rules, paginas CFD/Futures, rewards policy | CFD/Futures, margin, payout, drawdown |
| Hantec Trader | Program Rules, FAQ, Terms and Conditions | challenge/funded, news, regras de programa |
| Alpha Capital Group | Terms and Conditions e Help Center | news, estrategias proibidas, termos por plano |

Quando uma mesa tiver dashboard/contrato visivel apenas apos compra, esse documento pode ter prioridade maior que a pagina publica. Nesse caso, salvar a data de captura e marcar como fonte restrita em `source_notes`.

## Termos de busca

Use combinacoes como:

```text
site:dominio-da-mesa.com trading rules
site:dominio-da-mesa.com rules pdf
site:dominio-da-mesa.com terms and conditions funded account
site:dominio-da-mesa.com challenge rules
site:dominio-da-mesa.com drawdown daily loss consistency payout
```

Em portugues, para mesas locais ou conteudos traduzidos:

```text
regras desafio prop firm
limite diario perda total consistencia payout
termos e condicoes mesa proprietaria PDF
```

## Tipos de documento que mais alimentam a IA

| Tipo | Valor para o Fortify | Observacao |
| --- | --- | --- |
| Trading Rules | Alto | Melhor fonte para limites e violacoes |
| Terms and Conditions | Alto | Melhor fonte legal, mas pode ser longo |
| FAQ | Medio/alto | Ajuda com edge cases |
| Program Comparison | Medio | Bom para account size, fases e metas |
| Payout Policy | Alto | Necessario para consistencia e saque |
| News Trading Policy | Alto | Necessario para janelas de noticia |
| Scaling Plan | Medio | Futuro, nao essencial para MVP |
| Blog/post promocional | Baixo | Usar apenas como apoio |

## Campos minimos para cadastrar uma fonte

Antes de extrair regras, registre mentalmente ou em planilha:

| Campo | Exemplo |
| --- | --- |
| `firm_name` | FTMO |
| `program_name` | Challenge 100k |
| `account_type` | evaluation, funded, instant funding |
| `market_type` | forex, futures, multi-asset |
| `phase` | phase 1, phase 2, funded |
| `account_size` | 100000 |
| `source_url` | URL oficial |
| `source_type` | rules page, PDF, FAQ, dashboard, support email |
| `source_date` | data exibida no documento, se houver |
| `captured_at` | data em que coletamos |
| `review_status` | needs_review, verified, deprecated |
| `reviewer` | quem validou |

## Regras que o Fortify ja entende melhor

O extrator de IA e o motor de regras ja trabalham melhor com estes conceitos:

| Conceito | Tipo usado pela IA | Chave comum no banco |
| --- | --- | --- |
| Perda diaria maxima | `MAX_DAILY_LOSS` | `max_daily_loss` |
| Perda total maxima | `MAX_TOTAL_LOSS` | `max_total_loss` |
| Trailing drawdown | `TRAILING_MAX_LOSS` | `trailing_drawdown` |
| Meta de lucro | `PROFIT_TARGET` | `profit_target` |
| Dias minimos de trading | `MIN_TRADING_DAYS` | `min_trading_days` |
| Consistencia do melhor dia | `CONSISTENCY_BEST_DAY_CAP` | `consistency_best_day_cap` |
| Inatividade | `INACTIVITY_LIMIT` | `inactivity_limit` |
| Restricao de noticias | `NEWS_RESTRICTION_WINDOW` | `news_restriction` |
| Scalping/minimo de duracao | `SCALPING_RULE` | `scalping_restriction` |
| Maximo de posicoes simultaneas | `MAX_STACKING_TRADES` | `max_stacking_trades` |
| Limite de payout/lucro | `PROFIT_CAP_PAYOUT` | `profit_cap_payout` |

Se uma regra oficial nao encaixar nesses tipos, nao force. Marque como `needs_review` e descreva em `source_notes`.

## Como preparar um documento para a IA

Preferir texto limpo. Remova:

- menus;
- banners;
- rodapes repetidos;
- propaganda;
- blocos duplicados;
- comentarios de usuario.

Manter:

- nome da mesa;
- nome do programa;
- fase da conta;
- tamanho da conta;
- limites numericos;
- unidade do limite;
- condicao de violacao;
- se inclui floating loss;
- horario/reset diario;
- regra de payout;
- data ou versao do documento.

## Template para alimentar a IA

Use este formato quando colar texto no extrator ou em uma tarefa Codex:

```markdown
# Fonte oficial de regras

Mesa:
Programa:
Fase:
Tamanho da conta:
Mercado:
URL oficial:
Data capturada:
Data/versao exibida pela fonte:

## Texto oficial relevante

Cole aqui apenas o trecho oficial de regras, limites, payout, drawdown, noticias, scalping e consistencia.

## Observacoes de revisao humana

- Existem regras conflitantes?
- Alguma regra depende do dashboard interno?
- Algum limite muda por tamanho de conta?
- Alguma regra muda entre challenge e funded?
```

## Checklist de revisao antes de marcar como verificada

1. A fonte e oficial?
2. A URL ainda abre?
3. A regra pertence ao programa correto?
4. A fase esta correta?
5. O valor esta na unidade certa: `%`, `$`, dias ou minutos?
6. A regra inclui ou exclui floating PnL?
7. O reset diario tem timezone claro?
8. A regra e hard violation ou apenas alerta?
9. O texto fala de equity, balance ou realized PnL?
10. Ha diferenca entre challenge e funded?
11. Ha diferenca por account size?
12. `source_url`, `source_notes`, `verified_at` e `review_status` estao preenchidos?

## Como isso entra no Fortify hoje

Frontend:

- Biblioteca de Mesas: `src/pages/PropFirmLibrary.tsx`;
- Hook de leitura: `src/hooks/usePropFirmLibrary.ts`;
- Extrator: `src/components/RuleExtractor.tsx`.

Banco:

- `prop_firms`: mesa/corretora;
- `programs`: programa;
- `rule_set_versions`: versao das regras;
- `rule_definitions`: tipo canonico de regra;
- `rule_instances`: valor da regra para uma versao/programa;
- `rule_evaluations`: resultado calculado contra uma conta.

IA:

- funcao Supabase: `supabase/functions/extract-rules/index.ts`;
- entrada ideal: URL oficial ou texto limpo;
- saida esperada: JSON com `firmName`, `rules`, `summary`, `accountTypes`.

## Padrao de qualidade para o MVP

Para o MVP, prefira menos mesas com regras confiaveis a muitas mesas com dados duvidosos.

Meta realista:

- 5 a 8 mesas prioritarias;
- 2 a 4 programas por mesa;
- regras principais verificadas: perda diaria, perda total/trailing drawdown, meta de lucro, consistencia, payout e noticias;
- cada versao com `source_url` e `review_status`.

## Sinais de que a base esta boa

- O trader entende de onde veio cada regra.
- O admin sabe quais regras precisam de revisao.
- A IA extrai limites sem inventar valores.
- O Dashboard consegue explicar o risco com base em regras verificadas.
- Uma mudanca da mesa pode virar nova `rule_set_version`, sem sobrescrever historico.
