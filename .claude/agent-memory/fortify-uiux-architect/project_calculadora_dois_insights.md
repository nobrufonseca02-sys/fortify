---
name: calculadora-dois-insights
description: Restrição dura do fundador para a Calculadora de Risco — no máximo 2 insights na tela; quais foram escolhidos e por quê
metadata:
  type: project
---

O fundador definiu, em 2026-09-12, uma **restrição dura** para a Calculadora de Risco
(`src/pages/RiskCalculator.tsx`): *"algo simples para que o trader consiga calcular o trade
correto e tenha no máximo 2 insights para que ele tenha um controle de trade sustentável"*.

Os dois insights escolhidos e implementados:

1. **"Se bater o stop, sobra hoje"** — folga restante do limite diário de perda.
2. **"Até quebrar a conta"** — folga restante do drawdown máximo.

Hierarquia acordada: **1 número herói** (lote recomendado) + **2 insights de folga** + 1 linha
discreta de referência (alvo / R:R). Foram rebaixados de propósito: ganho no alvo, R:R e risco
em dólar (este virou subtítulo do herói).

**Why:** a tela antes mostrava cinco números com peso parecido (risco, ganho no alvo, R:R,
perda diária, drawdown), obrigando o trader a interpretar em vez de ler, em pleno pregão. A
regra dos dois insights é a forma do fundador de forçar hierarquia — o trabalho é **reduzir**,
não adicionar.

**How to apply:** qualquer pedido futuro de "adicionar um indicador" nessa tela deve primeiro
identificar o que sai. Se alguém pedir para trazer de volta R:R ou ganho no alvo como tile,
lembrar que foram rebaixados deliberadamente, não esquecidos. Ver
[[calculadora-repouso-nao-e-erro]].
