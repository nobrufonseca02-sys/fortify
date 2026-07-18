# Motor operacional de regras vinculadas

Última revisão: 2026-07-18

## Escopo do Sprint 7

O primeiro motor operacional lê exclusivamente o snapshot imutável do vínculo ativo em `account_rule_bindings`. Ele avalia três famílias compatíveis com dados MT5 já persistidos:

1. perda diária;
2. drawdown/perda máxima;
3. meta de lucro da fase atual.

O motor é frontend-only, puro e tipado. Ele não bloqueia trades, não muda o sync, não cria endpoints e não altera regras oficiais. Sua saída orienta a UI da conta com `safe`, `warning`, `critical`, `breached`, `not_monitorable` ou `pending_binding`.

## Mapa de dados

### Disponível

| Fonte | Dados usados |
| --- | --- |
| `account_rule_bindings.rule_snapshot` | Limites textuais, fases, tipo/cálculo de drawdown, moeda, plataforma, mercado, monitorabilidade, versão, hash e fontes oficiais. |
| `trading_accounts` | Saldo/equity inicial e atual, maior equity, perda diária usada, data de reset e fase da conta. |
| `mt5_account_snapshots` | Saldo, equity, P&L diário, P&L flutuante, maior saldo, data e timestamp. |
| `mt5_trades` | Lucro, comissão, swap e horário de fechamento. |
| `mt5_positions` | P&L flutuante atual. |

### Ausente ou incompleto

- timezone oficial e horário exato de reset diário por versão;
- garantia de que o histórico de trades cobre todo o dia regulatório;
- fechamento EOD oficial da mesa e calendário de feriados;
- piso, trava e cap de alguns trailing drawdowns;
- fase atual em contas antigas;
- semântica numérica para regras marcadas como `unknown`, `unavailable`, `partial` ou “verificar”;
- conectores automáticos para Futures, BlackArrow, Rithmic, Tradovate e plataformas equivalentes.

### Consequência

Ausência ou ambiguidade nunca produz estado seguro. A regra recebe `not_monitorable` e explica o dado faltante. Conta sem vínculo recebe `pending_binding` e nenhum cálculo automático.

## Fonte de verdade e precedência

1. O limite sempre vem de `rule_snapshot`; campos numéricos legados não substituem uma regra versionada.
2. O valor operacional atual vem do snapshot MT5 mais recente e dos dados da própria conta.
3. O saldo nominal do snapshot é a base percentual preferida; `trading_accounts.start_balance` é apenas fallback.
4. O hash, a versão e as URLs oficiais do vínculo são preservados no resultado.
5. Somente itens classificados em `automaticMt5` podem concluir automaticamente.
6. `manualCheck` aparece como “Validação manual”; `notSupportedYet`, como “Ainda não suportado”.

## Fórmulas

### Perda diária

Limite percentual:

```text
limite_diario = saldo_inicial * percentual / 100
```

Consumo:

1. usa `daily_pnl` do snapshot do dia corrente;
2. se ausente, usa `daily_loss_used` com reset compatível;
3. como fallback, soma P&L, comissão e swap dos trades fechados no dia mais P&L flutuante das posições;
4. `perda_atual = max(0, -pnl_diario)`.

Sem P&L diário confiável, a avaliação é `not_monitorable`. O MVP usa a data UTC dos registros; regras cujo reset depende de outro timezone exigem evolução do modelo.

### Drawdown máximo

Limite percentual:

```text
limite_maximo = saldo_inicial * percentual / 100
```

Para drawdown estático:

```text
referencia = saldo_inicial
valor_atual = menor(saldo_atual, equity_atual)
consumo = max(0, referencia - valor_atual)
```

Para trailing/intraday, a referência usa `highest_equity` ou o maior valor sincronizado compatível. Para EOD, usa o maior saldo registrado nos snapshots. Quando o snapshot declara explicitamente que o limite “trava no saldo inicial”, a referência é limitada a `saldo_inicial + limite`. Se o tipo estiver ambíguo, depender de estado de payout não disponível ou o histórico não formar referência confiável, a regra é `not_monitorable`.

Futures e BlackArrow não recebem cálculo MT5. Travas, caps e pisos não descritos explicitamente não são inferidos.

### Meta de lucro

```text
meta = saldo_inicial * percentual_da_fase / 100
lucro_acumulado = max(0, saldo_atual - saldo_inicial)
progresso = lucro_acumulado / meta
```

Se houver múltiplas fases, `trading_accounts.phase` deve corresponder ao ID ou rótulo do snapshot. Sem fase: “Fase da conta não informada.” Operações/funded sem meta numérica permanecem `not_monitorable`.

## Faixas de consumo

Para perda diária e drawdown:

| Consumo do limite | Estado |
| ---: | --- |
| abaixo de 70% | `safe` |
| 70% a menos de 85% | `warning` |
| 85% a menos de 100% | `critical` |
| 100% ou mais | `breached` |

A meta de lucro informa progresso ou meta atingida e não é tratada como violação. O estado geral é o pior estado entre as três avaliações automáticas; dados não monitoráveis prevalecem sobre uma conclusão segura, mas não escondem alertas `warning`, `critical` ou `breached`.

## Implementação

- `src/lib/ruleEngine/ruleEngineTypes.ts`: contratos, parser conservador e estados.
- `src/lib/ruleEngine/dailyLossCalculations.ts`: perda diária.
- `src/lib/ruleEngine/drawdownCalculations.ts`: drawdown estático/trailing/EOD/intraday.
- `src/lib/ruleEngine/profitTargetCalculations.ts`: fase e meta de lucro.
- `src/lib/ruleEngine/evaluateAccountRules.ts`: monitorabilidade, agregação e alertas.
- `src/components/rules/BoundRuleEvaluationCard.tsx`: apresentação compacta.
- `src/pages/AccountRuleManagement.tsx`: leitura dos dados já sincronizados e integração.

## Legado

O catálogo UUID (`rule_set_versions`, `rule_instances`, `rule_evaluations`) continua visível para compatibilidade, agora rotulado como configuração legada. Ele não substitui o snapshot versionado.

Estratégia de retirada:

1. manter leitura do legado para contas antigas;
2. priorizar vínculo ativo em toda nova avaliação;
3. migrar cada conta somente com confirmação de mesa/programa/fase/versão;
4. comparar resultados em paralelo antes de desativar avaliações antigas;
5. remover escrita legada apenas quando todas as contas operacionais tiverem vínculo auditável.

## Fora do escopo

- notícias, payout, KYC, VPN, EA/copy trade e estratégias proibidas;
- calendário externo e notificações;
- execução ou bloqueio de ordens;
- automação de plataformas sem MT5;
- alterações de sync, MetaApi, Stripe ou schema.
