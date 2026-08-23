---
name: project-authpage-redesign
description: 2026-08-17 pass applying the black/white/blue identity system to src/pages/AuthPage.tsx (login/signup/forgot), the item flagged as highest-priority drift in project-identity-derived-from-mark
metadata:
  type: project
---

Third pass in the identity-system thread (after [[project-risk-calculator-redesign]] and
[[project-identity-derived-from-mark]], which explicitly flagged `AuthPage.tsx` as "still has
leftover styling... off-palette colors and oversized corners... public-facing and high-traffic,
out of scope this pass"). This pass closed that item.

**Reference used:** user asked to draw on Skiper UI's "skiper21" ("Family Wallet" auth component —
drawer-based surface, animated view transitions, OTP/passkey/wallet-connect) but only a text
description was available (browser automation dead again). Explicit hard constraint from the user:
borrow only the *interaction/visual language* (smooth transitions between auth states, polished
multi-step reveal) — do NOT add phone/passkey/wallet-connect/OTP, since Fortify's actual auth
surface is only email+password login/signup, password reset, and Google OAuth. No auth
method/logic was touched — verified by diffing only className/JSX presentation, all
`supabase.auth.*` calls and the `AuthMode` state machine are byte-identical to before.

**What was off-palette (concrete findings, matching the diagnostic pattern from
[[project-risk-calculator-redesign]]):** the whole page used Tailwind's default `slate-*` scale
(`text-slate-200/400/500`) instead of this project's hueless `--muted-foreground` token — `slate`
carries a blue tint that fights the "neutrals are pure gray" rule documented in `index.css`.
Structural surfaces used raw literals (`bg-[#030712]`, `bg-slate-950/82`, `border-white/12`,
`bg-white/[0.055]`) instead of `bg-background`/`bg-card`/`border-border`. The auth card was
`rounded-[1.75rem]` (28px) and the bullet chips were `rounded-2xl` (16px) — both exceed the
project's `--radius: 0.5rem` (8px) cap.

**Fix approach:** swapped every raw color literal for the matching semantic token
(`text-foreground`, `text-muted-foreground`, `border-border`, `bg-background`). Confirmed first
that `:root[data-theme='light']` is defined in `index.css` but never actually toggled anywhere in
`src` (grepped — no `data-theme`/`ThemeProvider` wiring exists), so the whole app today always
renders the dark palette regardless; switching AuthPage's hardcoded hex/slate to theme tokens is
therefore a zero-risk visual no-op today, not a theme-toggle gamble. Card and bullet-chip radius
capped to `rounded-lg` (8px). Reused existing dead/underused utilities instead of hand-rolling:
`.eyebrow` (defined in `index.css`, previously unused anywhere) for the "Risk command center" label,
and `.display-editorial` (defined but zero call sites before this — sibling `.display-editorial-sm`
had exactly one, at `PropFirmLibrary.tsx:554`) for the H1, matching that file's
`className="display-editorial-sm text-foreground"` convention. Simplified the Google-login `Button`
and both text `Input`s to drop their hand-rolled color-override classNames entirely and just consume
the shared `Button`/`Input` primitives' own token-based default styling (`outline` variant, default
Input styling) — CLAUDE.md's "reuse before creating" applied to *removing* one-off overrides, not
just avoiding new components.

**Deliberate judgment call, flagged for the user rather than silently applied:** bullet-chip
checkmark icons changed from `text-primary` (blue) to `text-muted-foreground` (neutral gray).
Reasoning: the identity doc is explicit that blue is reserved for actions/links/focus, and these
checkmarks are decorative feature markers, not interactive — so per the documented rule they
shouldn't carry the accent. This is the one change in the pass that's a stylistic interpretation
rather than a mechanical token-swap; easy to revert to `text-primary` if the user disagrees.

**Motion changes (still using `motion/react`, already a dependency — v12, the renamed
framer-motion — no new dependency added):**
1. Added `useReducedMotion()` and threaded `rise()`/`dur()`/`wait()` helpers through every
   `motion.div` on the page (hero heading, bullet stagger, auth card, mode crossfade, trust row,
   copyright) — collapses offsets/durations/delays to ~0 for `prefers-reduced-motion: reduce`
   users. This was a real gap: `index.css`'s global reduced-motion rule only forces
   `animation-duration: 0.01ms` on CSS `@keyframes`-based animation, which does NOT cover
   Motion's WAAPI-driven `animate`/`transition` props — so the page's entrance/crossfade
   animations were previously unguarded despite the sitewide CSS rule existing.
2. Replaced the hand-rolled spinning `motion.div` (rotate 360°, infinite, JS-driven — also outside
   the CSS reduced-motion rule's reach) with `lucide-react`'s `Loader2` + Tailwind's `animate-spin`
   utility, for both the submit button and (newly) the Google button. This matches the loading-spinner
   convention already used in 10 other page files (`Accounts.tsx`, `CreateAccount.tsx`,
   `MT5Dashboard.tsx`, etc. — grepped for `Loader2|animate-spin` before adding), and because it's a
   CSS-keyframe animation it now correctly respects the sitewide reduced-motion rule automatically.
3. Added `layout={!shouldReduceMotion}` to the auth-card `motion.div` so Motion smoothly animates
   the card's height/position when switching modes (signup has an extra Name field, forgot drops
   the password field) — this is the one direct borrow from the skiper21 reference concept ("smooth
   drawer animations... dynamic view transitions"), implemented with the animation library already
   in the file rather than anything new. Did not add directional slide-per-step (e.g., x-offset based
   on login→signup→forgot ordering) — judged as unnecessary complexity for a 3-state crossfade that
   already reads cleanly; flagged as a possible future enhancement, not done speculatively.

**Verification:** `npm run typecheck` clean, `npm run lint` 0 errors (450 pre-existing warnings,
identical count to the prior pass — nothing new from this file), `npm run build` succeeds
(`AuthPage` chunk 13.98 kB / 4.51 kB gzip), `npm run test` 83/83 pass (no dedicated `AuthPage.tsx`
test file exists — grepped `src/test` to confirm before/after). No visual verification possible,
browser automation confirmed dead again this session.

**How to apply:** if this page is revisited, the `AuthBackground` video-overlay component still uses
raw `bg-background/NN` opacity literals inside arbitrary-value gradient strings
(`bg-[radial-gradient(...,hsl(var(--background)/0.24)...)]`) — these are intentionally
token-referencing (not raw hex) but are unavoidably verbose/arbitrary because Tailwind has no
first-class multi-stop gradient utility; leave as-is unless a cleaner primitive gets added. The
top-right "Suporte"/"Login" pills and the bullet chips deliberately do NOT reuse the existing
`.pill-btn`/`.hero-surface` utility classes from `index.css`, even though they're visually similar —
those utilities bake in an *opaque* `--surface-N` background, and this page needs translucency
(`bg-background/60`, `/92`) so the cinematic video shows through, which would fight the utility
classes' own background property in the same cascade layer (the exact fragility pattern already
flagged for `.card-premium` in [[project-identity-derived-from-mark]]). Hand-writing the
token-based classes here was the safer choice, not an oversight.
