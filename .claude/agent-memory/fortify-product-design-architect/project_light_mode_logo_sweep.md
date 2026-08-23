---
name: project-light-mode-logo-sweep
description: 2026-08-17 fix for white-only brand/logo assets (TradingView mark, prop-firm logos) disappearing on adaptive bg-background/bg-card once light mode ships them white
metadata:
  type: project
---

User (owner) reported light mode hides the TradingView logo and prop-firm library logos, asked
for a full light-mode sweep. Root cause (confirmed by opening every asset and reading raw
SVG fill values / viewing raster pixels, not guessed): several third-party brand assets under
`src/assets/brands/` are white-fill-only (no baked-in background), and were being placed inside
containers using `bg-background`/`bg-card` — tokens that flip to white in light mode
(`:root[data-theme='light']` in `src/index.css`, toggled by `AppLayout.tsx` setting
`document.documentElement.dataset.theme`). White-on-white = invisible.

**Confirmed white-only/near-invisible-on-light assets** (opened each file, not assumed):
`ftmo.svg`, `alpha-capital-group.svg`, `apex-trader-funding.svg`, `e8-markets.svg`,
`asap-funding-prop.svg`, `fxify.svg` (100% `fill="white"` paths), plus `fundednext.png` and
`topstep.webp` (near-fully white/transparent raster) and `tradingview-mark-transparent.png`.
`hantec-trader.svg` and `the-trading-pit.svg` are mixed (colored icon + white wordmark text —
partially broken). Assets confirmed SAFE and left untouched: `brightfunded.png` (blue icon,
reads fine on light or dark), `the5ers.png`/`fundingpips.jpg`/`np-future.png` (all have their own
baked-in colored background, not transparent), `easymarkets.svg` (multi-color, dark-navy text as
the dominant fill).

**Fix pattern** (per explicit user instruction — do not recolor third-party brand marks): give
the logo's container a fixed, theme-independent dark background instead of an adaptive one.
Two flavors landed:
1. New reusable token pair in `src/index.css` (`:root` only, deliberately NOT overridden in the
   `:root[data-theme='light']` block): `--brand-chip-bg: 0 0% 9%`, `--brand-chip-border: 0 0% 20%`.
   Wired into `tailwind.config.ts` as `bg-brand-chip` / `border-brand-chip-border`. Applied to
   the firm-logo tile `bg-background` → `bg-brand-chip` swap in **three** call sites across
   **two files**: `src/pages/PropFirmLibrary.tsx` (`FirmCard`, one tile) and
   `src/pages/CreateAccount.tsx` (two separate tiles — the firm-grid picker AND the
   selected-firm summary card; both had the identical bug, found via grep for
   `assets/brands` imports, not named by the user).
2. For the TradingView floating action button in `TradingViewProvider.tsx` (`bg-card` →
   `bg-[#131722]`), reused the exact fixed dark navy already established as correct precedent in
   `RiskCalculator.tsx` line ~433 (`bg-[#131722]` around the same `TradingViewMarkIcon`) rather
   than inventing a second token — that call site was already doing the right thing pre-existing,
   which is how the correct pattern was discovered.

**`TradingViewLogo` (wordmark span, hardcoded `text-white`) was investigated and found NOT
actually broken** — its only call site is the TradingView modal header, which sits on
hardcoded hex backgrounds (`bg-[#05060a]`, `bg-[#070914]/92`), not `bg-background`/`bg-card`, so
it never flips light. Left as-is; added an explanatory comment above the component (not a
functional change) documenting why it's safe and what would need to change if it's ever reused
on a theme-adaptive surface — see [[project_identity_derived_from_mark]] pattern of writing
reasoning into the code so it survives past the conversation.

**Broader sweep performed, nothing else found**: grepped for `fill="white"`/`fill: white`
(svg/tsx), `text-white`, `bg-black`/`bg-slate-9xx`/`bg-gray-9xx` (mirrored bug: fixed-dark bg +
adaptive text going invisible in light — none found, only shadcn modal backdrops used those),
hardcoded `bg-[#hex]` (only the two already-covered TradingView spots), and every file importing
from `src/assets/brands/` (exactly the 2 named + 1 found: PropFirmLibrary, CreateAccount,
TradingViewProvider — confirmed exhaustive via grep, not sampled).

**Verification**: `npm run typecheck` clean, `npm run lint` 0 errors/450 pre-existing warnings
(same baseline as [[project_identity_derived_from_mark]]), `npm run build` succeeds,
`npm run test` 83/83 pass. No visual/browser verification possible (Playwright MCP unavailable
this session) — all conclusions about actual pixel content came from reading raw SVG source and
viewing raster files directly via the Read tool's image support, not assumption.

**How to apply**: `--brand-chip-bg`/`--brand-chip-border` is now the standard answer for "new
single-color brand asset needs a home" — reach for it before inventing a one-off hex value,
except for TradingView specifically where `bg-[#131722]` (their own brand navy) is already the
established convention in two places.
