---
name: calculadora-repouso-nao-e-erro
description: O motor de risco devolve status "Crítico" para formulário vazio; a apresentação precisa suprimir isso — e por que não foi corrigido no motor
metadata:
  type: project
---

`calculateRisk()` em `src/lib/riskCalculator.ts` marca `status = "Crítico"` sempre que
`warnings.length > 0`. Como um formulário vazio já gera o warning "Informe entrada e stop",
**a calculadora abria gritando "Crítico" em vermelho antes de o trader digitar qualquer coisa**.

Isso foi resolvido **só na camada de apresentação**: `RiskCalculator.tsx` deriva
`hasTradeInput` dos próprios outputs do motor e, quando falso, mostra um estado "Repouso"
neutro (traço no lugar do lote, limites intactos, sem vermelho, sem lista de alertas).

**Why:** o motor de regras é linha vermelha para o agente de UI/UX — mexer ali é escopo do
`fortify-product-engineer`. E conflatar "entrada incompleta" com "risco crítico" é um problema
de modelagem do motor, não de pintura. Foi relatado ao fundador, não consertado.

**How to apply:** se alguém for mexer no motor de risco, o conserto de raiz é separar
`status` (juízo de risco) de `valid` (completude da entrada) — provavelmente um estado
`"Indeterminado"` quando faltar `stopDistance` ou `valuePerUnit`. Se isso for feito, a guarda
`hasTradeInput` na página vira redundante e pode sair. Ver [[calculadora-dois-insights]].

Limitação relacionada, também relatada e não corrigida: a folga diária parte do limite cheio
— a calculadora **não desconta a perda já realizada no dia**, mesmo com conta MetaApi
selecionada. A tela diz isso em microcopy ("sem perda realizada hoje") em vez de fingir
precisão.
