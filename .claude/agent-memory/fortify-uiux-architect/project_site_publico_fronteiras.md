---
name: site-publico-fronteiras
description: Quais componentes do site público podem ser restilizados sem vazar para /vendas ou para o produto logado
metadata:
  type: project
---

Mapa de fronteiras do site público, confirmado por leitura de imports em 2026-09-12.

**Pode restilizar — alcança só as seis páginas internas (`/vendas/*`):**
- Primitivas do `PublicShell.tsx`: `PublicCard`, `PublicPanel`, `PublicButton`, `PublicSection`,
  `SectionHeading`, `PublicPageHeader`, `PublicClosingCta`, `PublicFooter`.
- `src/pages/landing/landingSections.tsx` inteiro — importado **apenas** por `RecursosPage` e
  `FaqPage`.

**Não pode:**
- `LandingNav.tsx` — usado pelas internas **e** por `/vendas`, que o fundador proibiu de tocar.
- Qualquer coisa dentro de `FortifyHero`.
- **`PricingPage.tsx`** — é um componente só para `/vendas/planos` (`variant="public"`) e para
  `/pricing` logado. `isPublic` só troca a casca externa e uma classe de container; o visual dos
  cartões é compartilhado. Restilizar os cartões vazaria para o produto logado.

**Why:** `/vendas` importa do PublicShell apenas `AUTH_SIGNUP_PATH`, `trackCta` e
`useForcedLightTheme` — utilitários, nenhuma primitiva visual. É isso que torna seguro restilizar
as primitivas.

**How to apply:** antes de mexer em qualquer componente público, rodar
`grep -rn "<NomeDoComponente" src` e conferir se `/vendas` ou alguma tela logada está na lista.
Se estiver, parar e relatar em vez de mexer. Ver [[site-publico-raio-unico]].
