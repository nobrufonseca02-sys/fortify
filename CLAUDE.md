# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

The app is two processes: the Vite/React frontend and a separate Fastify gateway service
(`services/metaapi-gateway`) that has its own `package.json`/`node_modules` — run `npm install`
inside that folder too before first use.

```sh
npm run dev          # frontend + gateway together (scripts/dev-all.mjs)
npm run dev:app      # frontend only, http://localhost:8080
npm run dev:gateway  # gateway only, http://localhost:3001

npm run build        # production build (vite build)
npm run lint         # eslint .
npm run typecheck    # tsc --noEmit -p tsconfig.app.json — vite build does NOT type-check,
                      # this is the only thing that catches real type errors
npm run test         # vitest run (all tests, single pass)
npm run test:watch   # vitest watch mode

npx vitest run src/test/Accounts.test.tsx   # run a single test file
npx vitest run -t "auto-opens the connect"  # filter by test name
```

CI (`.github/workflows/ci.yml`) runs lint, typecheck, test, and build on every push/PR to `main`.

## Architecture

**Two prop-firm rule catalogs coexist — don't conflate them.** A static, hand-curated,
source-audited dataset lives in `src/data/propFirmRules.ts` (aggregated from per-firm files under
`src/data/prop-firms/`) and drives `PropFirmLibrary.tsx`, `RuleBindingSelector.tsx`, and
`src/lib/ruleBinding.ts`. A second, Supabase-table-backed catalog (`prop_firms`/`programs`/
`rule_set_versions` tables, queried via `src/hooks/usePropFirmLibrary.ts`) is used only by
`CreateAccount.tsx`'s Step 0 firm/program picker. They have different "operational firm" gating
logic and are not interchangeable.

**Rule binding is the audited source of truth for what governs an account.** A trading account's
actual monitored rules come from `account_rule_bindings` — a versioned, hashed snapshot written by
`saveAccountRuleBinding()` in `src/lib/ruleBinding.ts`. `RuleBindingSelector.tsx` is the one shared
component for picking firm → program → account size → platform → rule version, and requires an
explicit manual-acknowledgement checkbox before a binding can be saved. That checkbox must never
be auto-checked, even when the selector is pre-filled via its `initialSelection` prop — this is a
deliberate audit/safety requirement, not an oversight. There is also an older, pre-versioning
catalog (`trading_accounts.rule_set_id` / `rule_instances` / `rule_definitions`) still read in
places (see the "legacy" block in `AccountRuleManagement.tsx`) — new work should target
`account_rule_bindings`, not the legacy columns.

**Library → connect flow.** `PropFirmLibrary.tsx` lets a trader browse the static catalog and
hands off to `/accounts` via 5 query params (`propFirmSlug`, `programSlug`, `accountSizeId`,
`platform`, `ruleVersionId`), parsed by `parseLibraryRuleSelection()` in
`src/lib/libraryRuleSelection.tsx`. `Accounts.tsx` (`/accounts` — the single page for connecting
*and* viewing account health; `/mt5` is a legacy redirect to it, kept only so old links/bookmarks
still work) and `CreateAccount.tsx` (`/accounts/new`, the full manual wizard for firms not in the
static catalog) both consume it. `src/lib/accountProvisioning.ts`'s
`provisionAndConnectTradingAccount()` is the one place that does
insert-trading_account → gateway-connect → save-rule-binding as a single non-throwing operation
returning a structured result — reuse it rather than re-implementing that sequence. On a connect
attempt, whatever the outcome (MetaApi auth failure, binding-save failure, or full success), the
account still gets created and the UI should show it in place rather than routing the user
somewhere that loses that context.

**The gateway (`services/metaapi-gateway`) is the only thing allowed to hold the MetaApi token.**
The frontend never talks to MetaApi directly — it calls the gateway's `/metaapi/connect`,
`/metaapi/sync`, `/admin/*` etc. routes with a Supabase JWT bearer token (see
`gatewayJsonHeaders()` in `src/lib/gateway.ts`). The gateway re-validates the caller against
Supabase itself and independently re-checks plan/account-limit entitlement
(`getUserEntitlement`/`enforceAccountLimitForConnect` in `services/metaapi-gateway/src/server.ts`)
— client-side checks (`useSubscriptionPlan`, `PlanStatusPanel`) are UX only, not the real gate.

**Supabase client**: the shared singleton is `src/integrations/supabase/client.ts`. Note
`CreateAccount.tsx` historically instantiates its own separate client — be aware of that if
touching that file.

**TypeScript is intentionally loose** (`strict: false`, `noImplicitAny: false` in
`tsconfig.app.json`; `@typescript-eslint/no-explicit-any` is a warning, not an error). Don't rely
on strict-null-checks-style guarantees; a lot of Supabase query results are cast through `any`.

**Testing**: Vitest + Testing Library. Page-level tests mock hook modules directly
(`vi.mock('@/hooks/useAuth', ...)`, `vi.mock('@/hooks/useAccountsStore', ...)`, etc.) rather than
mocking Supabase query chains deeply — see `src/test/Accounts.test.tsx` for the current pattern.
Components that call `useQueryClient()` need a `QueryClientProvider` wrapper in tests.

**Routing/code-splitting**: every routed page in `src/App.tsx` is `React.lazy`-loaded; protected
routes live under `ProtectedRoutes`, gated by `useAuth()`'s session.
