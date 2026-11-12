# Client instructions

Repository-wide guidance, including backend conventions, lives in the root `CLAUDE.md`.

## State

- Routes: marketing `/`; auth `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`; app `/app`, `/log-expense`, `/accounts`, `/recurring`, `/recurring/[id]`, `/settings`, `/admin`, `/setup`; public legal pages. The app layout is `components/layout/AppShell`.
- Server state belongs to TanStack Query hooks in `lib/hooks/`. Do not introduce another data store.
- Zustand holds local UI state only:
  - `lib/stores/authStore.ts` — in-memory access token and expiry. The refresh token is an httpOnly cookie set by the BFF. It is a session cookie unless the user ticks "Remember me" on the login page; `lib/auth/cookies.ts` owns both cookies and the 7-day max age, and the refresh route preserves the choice through the `remember_me` companion.
  - `lib/stores/balanceVisibilityStore.ts` — persisted "hide balances" flag.
  - `lib/stores/consentStore.ts` — persisted cookie-banner choice.
  - `lib/stores/dashboardViewStore.ts` — persisted per-section list/grid choice for the dashboard's category breakdown, accounts, and recent activity. Recent activity's grid is desktop-only; phones always show the list (`lib/hooks/useIsMdUp.ts` decides).
- `providers/AuthProvider.tsx` rehydrates the access token once on cold load by calling `refreshAccessToken()`. `providers/QueryProvider.tsx` owns the query client, persistence, and offline replay.
- `useMe()` and `useDashboard()` are enabled only after the auth store has a token, so they do not fire before `AuthProvider` finishes.
- The per-user `defaultPage` preference (`"Home"` or `"LogExpense"`) lives on `GET /api/v1/me` and is set with `PUT /api/v1/me/default-page`. `useLogin` applies it when there is no explicit `next`; `AppOpenRedirect` applies it once when the proxy sends `/` to `/app?open=1`; `DefaultPagePrompt` forces a choice while it is `null`. Redirect policy and `safeNextPath` live in `lib/utils/defaultPage.ts`.

## Query keys and invalidation

- `accountKeys.all = ["accounts"]`; `accountKeys.list(includeArchived)`.
- `["dashboard", year, month]`, `["expenses", ...]`, `["incomes", ...]`, `["me"]`, `["recurring-expenses", includeArchived]`, `["admin", ...]`, `["suggestions", ...]`.
- Any mutation that changes balances must invalidate `accounts`, `dashboard`, and the affected list (`expenses` or `incomes`). `useInvalidateMoneyData` in `lib/hooks/useAccounts.ts` is the shared helper.
- Offline-replayed mutations are invalidated by the cache-level `onSuccess` in `providers/QueryProvider.tsx`, because the hook's own `onSuccess` never runs for a mutation restored after a full app close.

## API modules

- `lib/api/client.ts` is the axios instance: bearer token from `authStore`, 401 refresh through `/api/auth/refresh`, and `ApiError` conversion.
- One module per area under `lib/api/` (`accounts.ts`, `incomes.ts`, `expenses.ts`, `transfers.ts`, `adjustments.ts`, `recurringExpenses.ts`, `dashboard.ts`, `me.ts`, `admin.ts`, `suggestions.ts`). Hooks call these modules; components never call axios directly.
- `lib/api/auth.ts` calls the Next BFF routes under `app/api/auth/*`. Those routes forward to `API_URL` and set or clear the `refresh_token` cookie. `login`, `register`, and `verify-email` go through the BFF; `forgot-password`, `reset-password`, and `resend-verification` call the API directly.
- `ApiError.displayMessage` is the user-facing message: the first validation description, else `detail`, else `title`, else a generic fallback. Use it in toasts and inline errors. `ApiError.title` carries the server `Error.Code`.

## Offline behavior

- TanStack Query persists only paused mutations (`shouldDehydrateMutation: state.isPaused`) to localStorage and resumes them on reconnect.
- Every replayable mutation must be registered with `setMutationDefaults` in `providers/QueryProvider.tsx`. Currently: expense create/update/delete and income create/update/delete.
- `components/shared/OfflineBanner.tsx` shows connectivity; `useOnlineStatus` is the shared hook. Offline-queued items are marked `pendingSync` in the dashboard activity and must not be edited or deleted while pending.

## Styling

- All colors come from the oklch tokens in `app/globals.css`. No hex literals or arbitrary color values in components.
- `hero-gradient` is reserved for the monthly spend card and the primary add action.
- Use the existing radius scale (`rounded-xl` inputs, `rounded-2xl` cards, `rounded-3xl` hero); do not introduce sharp corners.
- Render money through `components/shared/Money.tsx` so tabular numerals and the balance-hiding mask stay consistent. Format outside JSX with `lib/utils/currency.ts` (`formatMoney`, `currencySymbol`, `SUPPORTED_CURRENCIES`).
- Base UI components take a `render` prop, not `asChild`. When rendering a link through `Button`, pass `nativeButton={false}`.
- Entry forms use `Sheet` (bottom sheet) and confirmations use `Dialog`; both come from `components/ui` and restore focus.

## Hydration guards

- `Money` uses `useSyncExternalStore` to render the unmasked value on the server and the persisted visibility state only after mount. Keep this pattern for anything that reads localStorage during render.
- `app/layout.tsx` applies the stored theme with an inline script before paint and marks `<html>` with `suppressHydrationWarning`.
- Do not read `localStorage` or `window` during render in server components; do it in effects or through the stores.

## Environment

| Variable (`.env.local`) | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Browser-side API base URL (bearer-token calls); inlined at build time |
| `API_URL` | Server-side API base URL for the auth BFF routes |
| `NEXT_PUBLIC_APP_URL` | Public site URL used by metadata and verification links |

## Commands

```bash
npm run dev
npm run build
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm test            # Vitest, colocated *.test.ts(x)
npm test -- lib/utils/currency.test.ts
```

`next dev` writes to `.next-dev` and production builds to `.next` (`distDir` in `next.config.ts`). Do not merge them: `next build --webpack` and Turbopack dev produce incompatible route manifests, which shows up as 404s on every app route.

Run commands from the repository root with `npm --prefix src/Web.Client ...` when you do not want to change directories.
