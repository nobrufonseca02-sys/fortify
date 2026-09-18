---
name: site-publico-raio-unico
description: Decisão de raio único de 8px nas duas superfícies do Fortify, e por que a exceção do site foi encerrada
metadata:
  type: project
---

O site público rodava com **três raios simultâneos e nenhum declarado**: `rounded-2xl` no
`PublicCard`, `rounded-3xl` nos painéis grandes, `rounded-lg` nas seções vindas de
`landingSections.tsx`. Em 2026-09-12 isso foi unificado em **um só raio, `rounded-lg` (o mesmo
`--radius: 0.5rem` do produto)**, e a decisão passou a estar escrita no documento de identidade
(`Desktop\fortify-marketing\fortify_identidade_visual.md`, seção 5).

**Why:** o argumento do teto de 8px é a angulação dura do FortifyMark — sem curva, sem chanfro — e
esse argumento não enfraquece porque o fundo é claro. Um raio único nas duas superfícies é prova
de família mais forte do que manter uma segunda escala só para o site. Além disso, `rounded-2xl`
em cartão branco é o desenho mais genérico de SaaS que existe, e o pedido do fundador era
justamente "aspecto original".

**How to apply:** a única exceção viva é a **pílula de CTA** (`rounded-full` no site,
`.pill-btn` no produto), que lê como token e não como container. Qualquer `rounded-xl/2xl/3xl`
novo em superfície estrutural — dos dois lados — é desvio. Ver [[site-publico-fronteiras]].
