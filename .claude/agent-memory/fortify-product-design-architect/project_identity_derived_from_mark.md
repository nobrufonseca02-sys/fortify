---
name: project-identity-derived-from-mark
description: 2026-08-16 pass formalizing FORTIFY's visual identity as explicitly derived from FortifyMark.tsx's geometry, not a new rebrand
metadata:
  type: project
---

On 2026-08-16 the user asked to "crie uma identidade visual para o Fortify" then immediately added
the hard constraint "não mude a logo, a partir da logo voce monta a identidade visual" — refine/
formalize the existing system into something explicitly traceable back to
`src/components/brand/FortifyMark.tsx` (two flat `currentColor` polygons, hard angles, no curves,
no inherent palette), NOT a from-scratch rebrand or new mark. Deliverable is the system applied in
code (`src/index.css`, `tailwind.config.ts`, page-level drift fixes) — no separate brand-guideline
artifact was requested or produced.

**What already existed going in** (see [[project-design-token-system]] and
[[project-risk-calculator-redesign]]): a real black/white/blue token system from the 2026-08-01
redesign, and a `--radius: 0.5rem` (8px) cap that was already the enforced standard per the
RiskCalculator work, but had never been written down as an explicit rule anywhere — it was only
implicit in "the shared Button component never exceeds rounded-lg."

**What this pass added to `src/index.css`:**
1. Rewrote the top-of-file identity comment to explicitly derive each token decision from the
   mark's form language: monochromatic-first + one accent (mark uses `currentColor`, carries no
   palette of its own → black/white does the structural work, blue is the one addition, restricted
   to actions/links/focus), small-but-not-zero radius (mark has zero curvature; UI can't run at
   literal 0px without feeling hostile, so 8px is a deliberate *translation* of "hard-angled," not
   a literal copy — this reasoning is written into the CSS comment so it survives past this
   conversation), flat surfaces with no ambient glow (mark is two solid fills, no gradient/shadow),
   mono numerals (mark's precision → numeric legibility, tabular-nums prevents digit misreads).
2. Added an explicit "radius scale" comment next to `--radius` stating that Tailwind's default
   `rounded-xl`/`-2xl`/`-3xl` (12/16/24px) are NOT wired to the `--radius` token (`tailwind.config.ts`
   only remaps `lg`/`md`/`sm`) — using them on a structural surface is drift, not a valid "bigger"
   choice. `rounded-full` stays legitimate for pills/avatars/dots.
3. Documented the shadow/elevation rule explicitly: elevation = the `--surface-0..3` step scale +
   1px border, never `box-shadow`, except for things that actually float above page flow (dialogs,
   popovers, toasts, the one fixed TradingView overlay button).
4. Documented the icon convention (lucide-react default 2px stroke, 14/16/20px sizes) — this was
   already followed everywhere audited, just wasn't written down.
5. **Baked `border-radius: var(--radius)` into `.hero-surface` directly** (in `@layer utilities`)
   instead of leaving every call site to remember `rounded-2xl hero-surface` — this was a real,
   mechanical, sitewide bug: 100% of the 3 `.hero-surface` call sites in the whole codebase
   (`Dashboard.tsx`, `PricingPage.tsx`, `PropFirmLibrary.tsx`) paired it with `rounded-2xl` (16px,
   off-token), fighting the class's own intent. Fixed all 3 call sites to drop the redundant
   `rounded-2xl` now that the class carries its own radius.

**Audit finding — `.card-premium` has the same self-fighting bug but was NOT fixed this pass:**
all 13 call sites of `.card-premium` (all in `src/pages/MT5Dashboard.tsx`, not one of the 3
priority pages) pair it with `rounded-xl border border-border bg-card` — the `border-border
bg-card` override defeats `.card-premium`'s own `--surface-1` background (the "layered surface
scale" documented in `index.css` for card-on-card hierarchy is consequently never visible anywhere
in the product, since this is its only consumer). Deliberately left `.card-premium`'s CSS
definition untouched rather than baking in radius like `.hero-surface` — doing so without also
fixing all 13 JSX call sites would create real cascade-order ambiguity between Tailwind's
generated `rounded-xl` utility and the custom `@layer utilities` class (unlike `.hero-surface`,
where I fixed 100% of the 3 call sites in the same pass). This is flagged as the top candidate for
a follow-up pass, not fixed speculatively.

**Fixed radius/shadow drift on the 3 priority pages** (`Dashboard.tsx`, `PricingPage.tsx`,
`Accounts.tsx` — all `rounded-xl`/`rounded-2xl` on structural containers → `rounded-lg`), plus the
shared `ui/card.tsx` primitive (`rounded-xl shadow-lg shadow-background/50` → `rounded-lg`, shadow
removed entirely to match the documented flat/no-glow rule — only 3 consumers:
`AccountDashboard.tsx`, `AdminPage.tsx`, `RuleManager.tsx`, verified low blast radius before
touching it).

**Known drift explicitly NOT fixed this pass** (reported to user, not guessed at):
- `.card-premium` self-fighting call sites in `MT5Dashboard.tsx` (see above).
- `AuthPage.tsx` still has page-wide raw `slate-950`/`white/12` literals and
  `rounded-[1.75rem]` — flagged in [[project-design-token-system]] back on 2026-08-01, still
  unfixed; out of scope this pass (public auth page, not one of the 3 named priority surfaces).
- `SettingsPage.tsx`, `ResetPassword.tsx`, `NotFound.tsx`, `ChatMessageBubble.tsx` also still use
  `rounded-2xl`/`rounded-3xl` — lower-traffic, not touched.
- `Dashboard.tsx`'s `ChecklistRow`/`AssetMetric` tile grids use the same "repeated neutral soft-box
  per fact" shape that was diagnosed as the generic-AI tell in [[project-risk-calculator-redesign]]
  (though less severe there — neutral `bg-background/30`, not colored pastel fills). Only the
  radius was fixed this pass; restructuring the grid into ledger rows like RiskCalculator would be
  a bigger structural change than "fix drift against the formalized system" and was left as a
  reportable observation, not actioned.
- Accounts.tsx's primary "Conectar Conta" button is still a hand-rolled `<button>` rather than the
  shared `Button` component (functional risk in a provisioning-flow file — left alone deliberately).

**Verification:** `npm run typecheck` clean, `npm run lint` 0 errors (450 pre-existing `any`/
hook-dep warnings, none new), `npm run build` succeeds, `npm run test` 83/83 pass. No visual
verification possible (browser automation confirmed dead again this session) — all radius/shadow
changes are class-swaps with no logic touched, low regression risk.

**How to apply:** if asked to continue this pass, `.card-premium` in `MT5Dashboard.tsx` (13 call
sites) is the highest-value next fix — same pattern as `.hero-surface`, just needs every call site
edited in the same commit as the CSS change. See [[project-design-token-system]] for the original
palette work and [[project-risk-calculator-redesign]] for where the radius-scale rule and the
"repeated soft-box = generic tell" diagnostic were first established.
