---
name: feedback-density-pages
description: Judgment calls on PropFirmLibrary/Accounts information density under the "trader only sees what their account's rules require" mandate
metadata:
  type: feedback
---

When asked (2026-08-01) to simplify `PropFirmLibrary.tsx` and `Accounts.tsx` so a trader "só
precisa das informações que a conta da mesa proprietária dele oferece": found both pages had
already been through a prior decluttering pass and judged the *existing shape* still correct
rather than restructuring further.

- `PropFirmLibrary.tsx` already uses a staged narrowing wizard (firm → program → account size →
  rules), and `RulesView` already shows only critical rules (Meta, Perda diária, Perda máxima,
  Drawdown) prominently with secondary rules behind a `<details>` disclosure. Verdict: correct
  shape, kept as-is; only retokenized ad-hoc `amber-*`/`emerald-*` colors to `warning`/`success`
  and flattened the gradient header.
- `Accounts.tsx` account cards already show only account-tied state (nickname, prop firm binding
  or "vincular regra" warning, health badge, MT5 connection+sync freshness, equity+P&L) — nothing
  extraneous found. Verdict: no structural change needed, only palette inheritance.

**Why this matters:** don't assume "simplify further" always means "restructure" — when a prior
pass already achieved the stated principle, re-verify against the principle explicitly and say
so, rather than churning the layout for the sake of visible effort. Only PropFirmLibrary/Accounts
color tokens changed, not their information architecture, in this pass.

**How to apply:** if asked to revisit these two pages again, check `git log` first — if no
structural changes happened since this entry's date, the shape is likely still intentional; look
for genuinely new clutter (e.g. a feature added new fields) rather than re-flattening what's
already flat. See [[project-design-token-system]] for the palette work done alongside this.
