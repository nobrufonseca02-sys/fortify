---
name: project-accounts-page-redesign
description: 2026-08-30 visual-only redesign of src/pages/Accounts.tsx (header/form/cards) on top of the black/white/blue token system
metadata:
  type: project
---

On 2026-08-30, restyled `src/pages/Accounts.tsx` (header, connect form, account cards) as a
"holding card" layout, following the same rules already established in
[[project-design-token-system]] / [[project-identity-derived-from-mark]] /
[[project-risk-calculator-redesign]]. Zero logic touched — `handleConnect`,
`provisionAndConnectTradingAccount()`, `refreshConnectionData`, the 4-state `healthStatus`
derivation, and every string `src/test/Accounts.test.tsx` asserts on (13 tests) are byte-identical;
only markup/classes changed. Verified via `npx tsc --noEmit`, `npx eslint src/pages/Accounts.tsx`
(0 errors), and `npx vitest run src/test/Accounts.test.tsx` (13/13 pass, no selector changes
needed).

**What changed:**
- Header: plain `border-b` block → `.hero-surface` panel with `.eyebrow` ("Contas conectadas") +
  `.display-editorial-sm` h1 (kept the literal text "Minhas Contas" the test regex needs). The
  inline count spans became rounded-full stat chips (same conditions/text, just chip-shaped).
  "Conectar Conta" button switched from a hand-rolled `<button className="rounded-lg bg-primary...">`
  to `.pill-btn.pill-btn-primary` — this was the last hand-rolled primary CTA flagged in
  [[project-identity-derived-from-mark]]'s "known drift not fixed" list; now fixed.
- Connect form: bare `rounded-lg border bg-card` box → `.hero-surface`, with an eyebrow+title
  header, inputs given a 2-col grid + left-icon treatment (`absolute left-3.5 ... h-4 w-4` icon +
  `pl-10` on the shadcn `Input`) copying `AuthPage.tsx`'s established icon-input pattern (Wallet/
  Hash/Link2/KeyRound — Hash and KeyRound newly imported). `RuleBindingSelector` wrapped in a
  `border-t` + eyebrow section for visual separation from the identity fields, but rendered with
  identical props/condition (`{libraryResolved && (...)}`) — not touched internally.
- Account cards: switched the outer card from `rounded-lg border border-border bg-card` to
  `card-premium` (paired correctly with `rounded-lg`, not `rounded-xl` — the radius-drift bug
  documented against `.card-premium`'s 13 `MT5Dashboard.tsx` call sites in
  [[project-identity-derived-from-mark]] was NOT repeated here). This is `.card-premium`'s first
  correctly-paired call site outside that known-drift file. Three visual sections: identity (bound
  prop-firm name bumped `text-xs`→`text-sm`), a connection-health strip now wrapped in
  `rounded-md bg-muted/10 px-2.5 py-2`, and an enlarged financial block (equity `text-xl md:text-2xl`
  with the P&L % as its own colored rounded-full pill instead of small inline text). Delete
  (Trash2) button got a bigger touch target (`p-1.5 -m-1`, icon `w-3.5→w-4`) while keeping the same
  opacity-0→100-on-hover/focus behavior and `stopPropagation`.
- `GuidedEmptyState` untouched (already design-system-aligned per [[feedback-density-pages]]).

**How to apply:** if `.card-premium` in `MT5Dashboard.tsx` is ever fixed (still the top follow-up
per [[project-identity-derived-from-mark]]), Accounts.tsx's card is now a second real reference for
"how `.card-premium` should be paired" (bg/border from the class, radius from `rounded-lg` at the
call site, no `bg-card` override). No further known drift in this file.
