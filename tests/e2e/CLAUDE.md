# Playwright instructions

Repository-wide guidance lives in the root `CLAUDE.md`.

## Isolation

- The suite runs against its own API on port 5100 and client on port 3100 with `ASPNETCORE_ENVIRONMENT=Testing`, which selects `FakeEmailSender`. It never sends real email.
- `reuseExistingServer: false` is deliberate. Never point the suite at the developer servers on 5000/3000 or relax this flag.
- `start-server.mjs` starts a disposable `postgres:18-alpine` container named `tydee-e2e-postgres` on a random loopback port with trust auth and a unique `tydee_e2e_<timestamp>` database, starts the API, rebuilds the client, then starts the client. It writes the connection details to `.e2e-state.json` for the specs. `global-teardown.ts` removes the container and the state file.
- Docker must be running, and Chromium must be installed once with `npx playwright install chromium`.
- Do not reuse the developer database from `docker compose`; the suite must stay isolated from local data.
- `workers: 1` serializes the suite. Admin statistics are global, and every test shares one API process.
- The e2e API gets rate-limit overrides (`RateLimiting__*__PermitLimit`) in `start-server.mjs`. They apply to the disposable server only; never copy them into `appsettings.json`.

## Structure

- `support/` — leaf primitives: `env.ts` (URLs, consent storage state), `state.ts` (`.e2e-state.json`), `db.ts` (verification tokens, admin promotion; one connection per call), `time.ts` (UTC dates, unique emails), `select.ts` (Base UI selects), `domain.ts` (shared unions).
- `api/` — typed HTTP client with one module per API area and `types.ts` mirroring `src/Contracts`. Specs never call `fetch` directly.
- `builders/` — pure payload builders. No ids, no HTTP.
- `seed/seed.ts` — resolves account names to ids and seeds accounts, template, income, expenses, transfers, recurring expenses, and suggestions through the API.
- `pages/` — one page object per screen, plus `pages/overlays/` for the entry sheets. Page objects own every locator.
- `fixtures/users.ts` — creates verified, unverified, and admin users and signs them in through the BFF.
- `fixtures/index.ts` — extends the Playwright `test` with `verifiedUser`, `userApi`, `adminUser`, `adminApi`, `seed`, `signedIn`, `adminSignedIn`, `app`, and `adminApp`.
- `specs/` — user stories only. No locators, no raw HTTP, no SQL.

## Fixtures and test data

- Every test that needs a signed-in user gets a fresh verified one. `verifiedUser` registers through the API, reads `email_verification_token` from the disposable database, verifies, and logs in. Specs never share an account.
- `signedIn` logs the user in through the Next BFF with `page.request.post("/api/auth/login")`, so the browser context receives the `refresh_token` cookie and `AuthProvider` refreshes the in-memory token on the first navigation.
- `app` seeds the default accounts (Budget 50, Savings 30, Emergency Fund 20) and opens `/app`.
- For custom data, use `signedIn` + `seed` and seed **before** the first `/app` navigation. A full reload can restore a persisted query cache that is still fresh under the client's 30s `staleTime`, which would skip the refetch.
- `adminUser` registers, verifies, flips `users.is_admin`, and logs in again. The role claim is only added when a token is issued, so a token from before the update is not an admin.
- Consent is pre-seeded with `use.storageState` (`tydee-consent`) so the cookie banner never covers the bottom navigation or the floating action buttons. The cookie-banner test opts out with an empty storage state.

## Selectors

- There are no `data-testid` attributes. Use accessible roles, labels, and the copy the user sees.
- Base UI buttons rendered as links (`Button render={<Link />}`) expose `role="button"`, not `role="link"`. Use `getByRole("button", ...)` for settings legal links, the admin links, and the marketing header.
- `CardTitle` renders a `div`, not a heading. Assert card titles with `getByText`.
- Sheets and dialogs are `getByRole("dialog", { name: <sheet title> })`. The entry sheet title is the accessible name.
- Money renders in nested spans. Prefer asserting toasts, activity descriptions, and API values; when asserting an amount, scope to the card or hero and pass the formatted string (for example `₱500.00`).
- The amount field is a spinbutton; income allocation inputs follow it. Page objects account for that offset.

## Tests

- `onboarding.spec.ts` is the only UI-driven registration and setup flow; it reads the verification token with `support/db.ts`.
- `auth.spec.ts`, `legal.spec.ts`, `marketing.spec.ts`, `accounts.spec.ts`, `recurring.spec.ts`, `settings.spec.ts`, `admin.spec.ts`, and `offline.spec.ts` cover their named areas. `specs/money/` splits income, expense, transfer, adjustment, and dashboard behavior.
- Offline tests use `context.setOffline` plus a synthetic `offline`/`online` event, then assert the durable result (API row, pending row cleared, dashboard total). Do not assert on email bodies or SMTP output; read the database for tokens.
- Password reset cannot be completed end to end: the reset token is stored only as a hash and `FakeEmailSender` discards the raw token. Cover the request and missing-token states.

## Commands

Run from the repository root:

```bash
npm --prefix tests/e2e test
npm --prefix tests/e2e test -- specs/auth.spec.ts
npm --prefix tests/e2e test -- specs/money
npm --prefix tests/e2e test -- --list
npm --prefix tests/e2e test -- --headed --workers=1
```
