# Fortify Project Guide

This repository contains Fortify, a Vite + React + TypeScript product for trading-risk monitoring, prop-firm rules, Supabase-backed data, Stripe billing, and MT5/MetaAPI integration.

## Important Paths

- `src/`: React app, hooks, data, UI, and business logic.
- `src/data/propFirmRules.ts`: prop-firm rule definitions.
- `src/lib/`: reusable business logic, gateway clients, billing, and risk helpers.
- `src/test/`: Vitest coverage for rule engine, prop-firm library, selectors, and demos.
- `services/metaapi-gateway/`: Node service for MetaAPI/MT5 gateway work.
- `supabase/migrations/`: database migrations and security-sensitive schema changes.
- `docs/fortify/`: Fortify product and architecture docs.
- `docs/standards/`: higher-level standards and LLM context.

## Commands

- Install root dependencies: `npm install`
- Run local app and gateway: `npm run dev`
- Run Vite app only: `npm run dev:app`
- Run gateway only: `npm run dev:gateway`
- Build: `npm run build`
- Lint: `npm run lint`
- Test: `npm run test`

## Engineering Rules

- Read relevant docs before modifying product behavior, Supabase, billing, risk rules, or MetaAPI/MT5 flows.
- Keep `.env` files private. Do not print or modify secrets unless explicitly asked.
- Preserve existing React, shadcn-ui, Tailwind, Supabase, and Vitest patterns.
- For UI work, build the actual workflow screen, not a marketing page.
- For risk-rule changes, update tests and cite the prop-firm behavior source when available.
- For Supabase work, consider RLS, tenant ownership, migrations, and rollback safety.
- For MT5/MetaAPI work, keep gateway boundaries clear and avoid leaking credentials to the frontend.

## Definition Of Done

- The requested behavior is implemented or the blocker is explicit.
- Relevant tests, lint, build, or targeted checks were run when feasible.
- The final response names changed files and any validation gaps.
- Commercial or UX changes are reviewed visually when they affect layout.

## Recommended Skills

- Use `$fortify-feature-delivery` for product features and bug fixes.
- Use `$fortify-risk-rules` for prop-firm/risk engine work.
- Use `$fortify-mt5-gateway` for MetaAPI, gateway, and account sync work.
