# Playwright instructions

Repository-wide guidance lives in the root `CLAUDE.md`.

- The suite runs against its own API on port 5100 and client on port 3100 with `ASPNETCORE_ENVIRONMENT=Testing`, which selects `FakeEmailSender`. It never sends real email.
- `reuseExistingServer: false` is deliberate. Never point the suite at the developer servers on 5000/3000 or relax this flag.
- `start-server.mjs` starts a disposable `postgres:18-alpine` container named `tydee-e2e-postgres` on a random loopback port with trust auth and a unique `tydee_e2e_<timestamp>` database, rebuilds the client, then starts the API and client. It writes the connection details to `.e2e-state.json` for the specs. `global-teardown.ts` removes the container and the state file.
- Docker must be running, and Chromium must be installed once with `npx playwright install chromium`.
- Do not reuse the developer database from `docker compose`; the suite must stay isolated from local data.
- Each test gets a fresh browser context. The onboarding spec registers a unique email per run, reads `email_verification_token` directly from the disposable database with `pg`, verifies the email, logs in, completes the two-step setup, and asserts the dashboard.
- Run with `npm --prefix tests/e2e test` from the repository root.
- Assert user-visible behavior. Do not assert on email bodies or SMTP output; read the database for tokens.
