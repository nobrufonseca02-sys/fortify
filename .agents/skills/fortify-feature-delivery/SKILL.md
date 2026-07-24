---
name: fortify-feature-delivery
description: Implement Fortify product features and bug fixes using the repository's React, TypeScript, Supabase, shadcn-ui, Tailwind, gateway, and Vitest patterns.
---

# Fortify Feature Delivery

Use this skill for Fortify implementation work.

## Before Editing

1. Read `AGENTS.md`.
2. Read relevant docs under `docs/fortify/` and `docs/standards/`.
3. Inspect affected source files and tests.
4. Identify whether the change touches UI, Supabase, billing, risk rules, MT5/MetaAPI, or auth.

## Implementation Rules

- Preserve existing architecture and naming.
- Keep changes scoped to the request.
- Use TypeScript types and existing helpers.
- Avoid modifying `.env` or logging secrets.
- Add or update tests for business logic changes.
- For UI changes, check responsive layout and real workflow usability.

## Validation

Use the smallest meaningful checks:

- `npm run test`
- `npm run lint`
- `npm run build`
- targeted Vitest when only one area changed

## Final Output

Report changed files, validation run, and any residual risk.
