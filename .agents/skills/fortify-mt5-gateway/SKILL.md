---
name: fortify-mt5-gateway
description: Work on Fortify MT5 and MetaAPI integration, including the Node gateway service, account sync, trade data, credentials boundaries, and frontend gateway clients.
---

# Fortify MT5 Gateway

Use this skill when the task involves MetaAPI, MT5 accounts, gateway service behavior, or frontend account sync.

## Source Order

1. Read `docs/fortify/08-metaapi-mt5.md`.
2. Read `docs/fortify/05-gateway-node.md`.
3. Inspect `services/metaapi-gateway/src/server.ts`.
4. Inspect `src/lib/gateway.ts` and MT5-related hooks.
5. Check `.env.example` files, not live `.env` secrets, unless explicitly asked.

## Rules

- Keep credentials server-side.
- Do not expose MetaAPI tokens in frontend code.
- Treat sync status, retries, and account ownership as user-facing reliability concerns.
- Handle network/API failures explicitly.
- Prefer typed response shapes and narrow gateway endpoints.

## Validation

Use focused checks:

- gateway package scripts where available
- root `npm run test` for frontend consumers
- manual endpoint smoke checks only when credentials and server context are safe

## Output Format

Return:

- integration area
- files changed
- credential/security considerations
- validation run
- remaining operational risk
