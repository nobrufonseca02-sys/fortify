---
name: project-risk-calculator-redesign
description: Structural/visual redesign of src/pages/RiskCalculator.tsx (2026-08-15) — "trading console" layout, still built on the black/white/blue token system
metadata:
  type: project
---

On 2026-08-15 the user said `/risk-calculator` "tem cara de Lovable" and asked for something
simpler/more practical, inspired by real trading-terminal/fintech design references. Redesigned
`src/pages/RiskCalculator.tsx` presentation only — `calculateRisk()` in `src/lib/riskCalculator.ts`
and every derived value (rule-binding lookup, daily/drawdown limit math) were untouched.

**Direction taken:** asymmetric "trading console" layout instead of the old symmetric two-card
grid. A CSS grid (`lg:grid-cols-[minmax(0,1fr)_400px]`) puts the Decision panel (status, huge
recommended-lot number, risk/target/R:R stat tiles, daily-loss/drawdown gauges, the one primary
CTA "Copiar resumo do trade") first in DOM order and pinned to `lg:col-start-2` + `lg:sticky
lg:top-6` — so it's the first thing seen on mobile and stays visible while scrolling the input
form on desktop. The input form (Conta e risco / Trade / Ajustes avançados) sits in
`lg:col-start-1`, restyled as three `rounded-2xl border ... overflow-hidden` sections with a
`p-5 border-b border-border/60` header block each — this exact pattern (plus the `text-[11px]
uppercase tracking-wide text-muted-foreground` stat-label convention, the `ShieldCheck/ShieldAlert/
ShieldX` status-icon mapping, and the `rounded-xl border border-border/60 bg-background/30 p-3`
stat-tile shape) was lifted directly from `Dashboard.tsx` rather than invented, specifically to
keep this page from reading like a one-off template.

Native `<select>`s for Conta/Ativo were replaced with shadcn `Select` (with `SelectGroup`/
`SelectLabel` for the Forex/Metals/Indices/Commodities optgroups). Direção (buy/sell) and the
%/$ risk-mode switch were replaced with a small custom `Segmented` component (plain buttons, not
the shared `ToggleGroup` primitive) — `ToggleGroup`'s base `data-[state=on]:bg-accent` fights
per-option success/destructive tone classes via Tailwind's arbitrary-variant specificity, so a
hand-rolled segmented control was safer than fighting the primitive.

**Why:** the previous layout put the recommended lot size/status in a small tile inside a
symmetric sidebar column, competing visually with the input form — exactly the "no hierarchy,
looks AI-generated" complaint. See [[project-design-token-system]] for the underlying black/
white/blue token system this was built on top of (unchanged), and [[feedback-density-pages]] for
the general principle of matching established page conventions instead of inventing new ones per
page.

**How to apply:** if this page is revisited, keep the Decision-panel-is-always-visible principle;
don't move it back into a symmetric grid. Reuse the `Segmented`/`StatTile`/`LimitGauge` local
components already in the file rather than reinventing them if extending this page.

**2026-08-16 update — "still looks like Lovable" after the above.** The 2026-08-15 pass didn't
move the needle: matching Dashboard.tsx's badge/pill/soft-box vocabulary (colored `rounded-xl
border-color/20 bg-color/5` boxes repeated 6+ times for every fact) turned out to BE the generic-
AI-template tell, not a fix for it — copying an established page's conventions doesn't help when
that vocabulary is itself the problem. Concrete, verifiable finding: the file used `rounded-2xl`/
`rounded-xl` (16px/12px) throughout, but the project's actual radius scale (`--radius: 0.5rem` in
`src/index.css`, `tailwind.config.ts` `borderRadius.lg/md/sm`) caps at `rounded-lg` = 8px — even
the shared `Button` component never exceeds `rounded-lg`. Using default Tailwind/shadcn radii
instead of the product's own smaller token scale is a literal, checkable signal of not having read
the design system before generating markup.

Researched real references before touching code (WebSearch/WebFetch, browser automation still
dead in this environment): TradingView's 2024 panel redesign (via rondesignlab case study) uses a
dedicated monospace family for numeric data specifically to prevent misreading digits, and
desaturated (not neon) red/green for gain/loss; Stripe's dashboard reserves color *strictly* for
state ("color only ever means state... never decoration"); Mercury achieves distinctiveness
through "editorial typography, disciplined color creating visual calm" — tabular figures,
right-aligned, currency symbol set *lighter weight* than the value; Brex uses "exception-first
design: show what needs attention, hide what's on track" rather than rendering every metric at
equal visual weight; Bloomberg Terminal treats density as a deliberate feature for power users,
not something to soften with padding. FTMO/Myfxbook/Babypips confirmed the risk-based lot-sizing
math (0.5–1% risk convention) already matches professional/prop-firm expectations — that part
was never the problem, only the presentation layer was.

Rewrote the presentation layer again on top of these findings, same hard constraints
(`calculateRisk()` and all derived values untouched): capped every container at `rounded-lg`/`-md`/
`-sm`; collapsed the three input cards (Conta e risco / Trade / Ajustes avançados) into ONE
`divide-y` surface — one order-ticket-like form instead of three identically-carded blocks
competing with the Decision panel; killed the repeated soft-pastel-box pattern — `StatTile` and
`LimitGauge` now render as plain ledger rows inside a single bordered/divided strip (one border
drawn around the group, not one per fact), reserving the colored-box treatment for exactly one
place (the hero lot-size readout) so it means something when it appears; added a persistent
`border-l-4` accent rail on the Decision panel keyed to trade status (success/warning/destructive)
as a *structural* color cue, not just a small icon/text tint; added a local `Money`/`moneyParts`
helper that renders the currency symbol smaller/lighter than the digits for the promoted
risk/gain/limit figures (Mercury/Stripe pattern), while the original plain `money()` string helper
stays for `copySummary`'s clipboard text and dense inline text; `LimitGauge` now applies
exception-first coloring — a limit under 35% impact renders in muted/receded tone, only warning/
critical limits get full color+bold weight; all field/section labels moved to the
`font-mono uppercase tracking-wide` convention already used for stat labels, for one consistent
"instrument label" voice throughout the form instead of default sans-serif form labels. Verified
via `npm run typecheck` (clean), `npm run lint` (0 errors, only pre-existing unrelated `any`
warnings), `npm run build` (succeeds), `npm run test` (83/83 pass) — no RiskCalculator-specific
test file exists.

**How to apply (revised):** if "generic/Lovable" feedback recurs on a FORTIFY page, checking
"does this container's border-radius exceed the project's own `--radius` scale" and "how many
times does the same colored-soft-box shape repeat on this page" are now the two fastest concrete
diagnostics — both were true here and both were invisible until actually measured against the
token system rather than assumed from matching an existing page.
