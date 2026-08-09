---
name: project-design-token-system
description: State of Fortify's visual identity/token system after the 2026-08-01 sitewide black/white/blue redesign
metadata:
  type: project
---

On 2026-08-01 the user requested a full sitewide visual identity replacement: the app read as
generic AI-page-builder output (cyan/steel gradient glow everywhere, glassmorphism, tactical
mono/uppercase-tracked labels, oversized "editorial" headings). New direction: **black and white
as the structural base, blue as the single accent** for actions/links/focus, minimalist but not
sparse (Bubble.io/Linear/Stripe-adjacent — restrained, confident, information-dense where it
matters), inspired loosely by Bubble.io. Semantic status colors (success/warning/destructive/info)
were kept intentionally distinct from the blue accent and from each other — this is a financial
risk product, color-blind status is a trust violation, not just a style choice.

**Why:** the previous system had accumulated ~10 decorative utility classes in `src/index.css`
(`.hero-surface` radial glow, `.card-premium` diagonal gradient border, `.text-gradient-*`,
`.btn-glow`, `.pill-btn-primary` gradient, `.display-editorial*`, tactical mono
uppercase-tracked labels like "SISTEMA ONLINE"/"CONSOLE DE RISCO") that had spread into most
pages, plus scattered ad-hoc Tailwind color literals (`cyan-*`, `amber-*`, `emerald-*`,
`sky-*`) bypassing the token system entirely, most concentrated in `AuthPage.tsx` (whole page
themed cyan, unrelated to `--primary`) and `TradingViewProvider.tsx`'s floating chart button
(cyan/purple glow box-shadow).

**How to apply:** future design work should build on top of the tokens now defined in
`src/index.css` (`--background/--foreground/--card/--surface-0..3/--surface-elevated`,
`--primary` = blue ~217 91% 60% dark / 52% light, `--success/--warning/--destructive/--info`
desaturated but hue-distinct) and `tailwind.config.ts`'s `colors` map — don't reintroduce raw
Tailwind color swatches (`amber-400`, `cyan-200`, etc.) for anything that means "status" or
"brand accent"; use the semantic class instead. Typography was consolidated to Inter only
(400–800 weights loaded) for both body and display, plus JetBrains Mono reserved *only* for
tabular financial numbers (prices, tickets, balances) — not for decorative uppercase-tracked
chrome labels, which now render as plain small-caps text. `font-black` (900) was dropped
everywhere in favor of `font-bold` (700) since 900 isn't loaded. A global
`prefers-reduced-motion` override was added in `index.css` (`@layer base`) that zeroes
animation/transition duration app-wide.

Utility classes `.hero-surface`, `.card-premium`, `.glass`/`.glass-header`, `.pill-btn`/
`.pill-btn-primary`, `.btn-glow`, `.eyebrow`, `.display-editorial(-sm)`, `.text-gradient-primary`/
`.text-gradient-steel`, `.divider-glow` were kept (many call sites) but redefined flat/neutral —
no markup changes needed at most call sites, the class names now just mean something calmer.
Genuinely dead decorative utilities (`.bg-grid`, `.bg-grid-fine`, `.signal-strip`,
`.badge-system`, `.glow-primary/success/destructive`, `.ring-soft`, `.reveal-up`, and later
`.chip*`, `.seg`, `.surface-quiet`, `.num-xl`, `.lift` once confirmed unused) were deleted
outright rather than left as dead CSS.

Known still-unused decorative components that were *not* touched (zero call sites, so zero user
impact, left alone to avoid unnecessary blast radius): `src/components/GlobeAnimation.tsx`,
`src/components/SlideToActivate.tsx`. `src/pages/AccountRules.tsx` is also dead — not routed
anywhere in `App.tsx`, only exercised by its own test file — it still has unfixed raw
`amber-*`/`emerald-*`/`red-*` colors from the old system; low priority since it's unreachable,
but worth fixing or deleting next time this area is touched.

See also [[feedback-density-pages]] for the PropFirmLibrary/Accounts information-density
judgment calls made in the same task.
