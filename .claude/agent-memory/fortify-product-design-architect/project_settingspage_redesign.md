---
name: project-settingspage-redesign
description: 2026-08-30 layout redesign of SettingsPage.tsx to the hero-surface/card-premium/pill-btn identity system; confirms card-premium needs a manual rounded-lg pairing.
metadata:
  type: project
---

Redesigned `src/pages/SettingsPage.tsx` (was the last page never touched by the sitewide
identity pass — bare `<h1>`, ad hoc `rounded-2xl ... shadow-lg shadow-background/30` cards,
shadcn `<Button>` for actions, hand-rolled motion). Pure layout/visual change — every Supabase
call (`user_profiles` select/upsert), `useAuth`/`useSubscriptionPlan` usage, toast copy,
`saveProfile`/`managePlan` logic, and the three real profile fields (Nome completo, E-mail
read-only, Telefone) were kept byte-for-byte. No password-change/2FA/avatar/notification field
exists in this file's data model — don't invent one even if a task brief mentions "troca de
senha".

New shape: `hero-surface` header (eyebrow "Sua conta" + `display-editorial-sm` + a `pill-btn
pill-btn-primary` shortcut to `managePlan`, duplicated intentionally with the section's own
button since it reuses the same handler), two `card-premium rounded-lg` sections (profile +
subscription), local `SettingsIconChip` (h-11 w-11 rounded-lg border bg-background/80, copied
from AuthPage's icon-chip treatment — icons are `text-foreground`, never `text-primary`, since
--primary is reserved for actions/links) and local `StatTile` (RuleCard's dt/dd visual language
from PropFirmLibrary, wrapped in a `<dl>`). Motion switched from hand-rolled
`initial/animate/transition` to `fortifyMotion.gentle` from `src/lib/motion.ts`, gated through
`useReducedMotion()` from `motion/react` (not the CSS `prefers-reduced-motion` rule, which
doesn't cover Motion's own transform/opacity tweening — same fix already applied in
[[project_authpage_redesign]]).

**Confirmed footgun**: `.card-premium` in index.css only sets background+border, no
border-radius — unlike `.hero-surface` which bakes in `var(--radius)`. `MT5Dashboard.tsx` pairs
`card-premium` with the banned `rounded-xl`, which is exactly the drift flagged as "still broken"
in [[project_identity_derived_from_mark]]. The correct pairing is `card-premium` + plain
`rounded-lg` (maps to `var(--radius)` = 8px via tailwind.config's `borderRadius.lg`). Use this
memory as the reference next time MT5Dashboard.tsx's `card-premium rounded-xl` instances get
fixed.

No test file exists for SettingsPage (grepped `src/test`, zero hits) so there was no
test-coupling risk. Typecheck and eslint scoped to the file are clean (eslint: 0 errors, 4
pre-existing `@typescript-eslint/no-explicit-any` warnings from the same Supabase `as any` casts
the brief required to preserve verbatim).
