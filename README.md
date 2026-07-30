# Tydee

A simple envelope-style expense and savings tracker. You create account placeholders
(Budget, Savings, Emergency Fund), split your income across them with a percentage
template, and log daily expenses against the account they come from — so you always
know how much you have left to spend and how much you've kept.

## Features

- Email + password auth with email verification and rotating refresh tokens
- Accounts ("envelopes") with a Spending or Saving type; archive instead of delete
- Allocation template — set once (e.g. 70/20/10), every income pre-fills the split
- Income logging with per-account allocations, expense logging with account, note, and date
- Balances are always computed from allocations minus expenses, never stored, so
  editing or deleting an entry can't leave a stale balance behind
- Dashboard: per-account balances, total spent this month, recent activity
- Selectable display currency (PHP, USD, EUR, GBP, JPY, AUD, CAD, SGD)
- Mobile-first web client with light/dark/system theme

## Structure

```
src/
  SharedKernel/     Result, Error, Entity, domain event primitives
  Domain/           Entities and domain errors
  Contracts/        Request/response DTOs
  Application/      Commands, queries, handlers, validators (no MediatR - custom handler interfaces)
  Infrastructure/   EF Core (PostgreSQL), JWT, password hashing, SMTP email
  Web.Api/          Minimal API endpoints (.NET 10)
  Web.Client/       Next.js app (Tailwind v4, shadcn, TanStack Query, Zustand)
tests/
  Tests/            xUnit tests
```

## Getting started

Requirements: .NET 10 SDK, Node.js, Docker.

1. Start PostgreSQL (and optionally Seq for logs at http://localhost:8081):

   ```
   docker compose up postgres -d
   ```

2. Fill in the SMTP credentials in `src/Web.Api/appsettings.Development.json`
   (the file is gitignored). Any SMTP provider works — a Gmail app password or
   [Mailtrap](https://mailtrap.io) for development. For anything beyond local
   dev, prefer user secrets over the settings file:

   ```
   cd src/Web.Api
   dotnet user-secrets set "Jwt:Secret" "your-secret-at-least-32-chars"
   dotnet user-secrets set "Smtp:Password" "your-smtp-password"
   ```

3. Run the API. Migrations apply automatically on startup in development:

   ```
   dotnet run --project src/Web.Api
   ```

   Swagger lives at http://localhost:5000/swagger, and `src/Web.Api/tydee.api.http`
   has ready-made requests for every endpoint.

4. Run the web client (copy `.env.example` to `.env.local` first):

   ```
   cd src/Web.Client
   npm install
   npm run dev     # http://localhost:3000
   ```

Register at http://localhost:3000/register — the verification email links back to
the client. Your first login drops you into a two-step setup: create your
envelopes, then set the income split.

## API

### Auth

| Endpoint | Description |
|---|---|
| `POST /api/v1/auth/register` | Creates the account and emails a verification link (24h expiry) |
| `POST /api/v1/auth/verify-email` | Verifies the email using the token from the link |
| `POST /api/v1/auth/login` | Returns an access token (15 min) and refresh token (7 days). Rejects unverified emails |
| `POST /api/v1/auth/refresh-token` | Rotates the refresh token. Reusing an old token revokes all sessions |

Refresh tokens are stored as SHA-256 hashes, so a database dump can't be replayed.

### Budgeting and profile (bearer token required)

| Endpoint | Description |
|---|---|
| `POST /api/v1/accounts` | Create an account (envelope). Type is `Spending` or `Saving` |
| `GET /api/v1/accounts` | List accounts with computed balances (`?includeArchived=true` for all) |
| `PUT /api/v1/accounts/{id}` | Rename an account or change its type |
| `DELETE /api/v1/accounts/{id}` | Archive an account (history is kept, account becomes unusable) |
| `PUT /api/v1/accounts/template` | Set allocation percents for all active accounts; must total 100 |
| `POST /api/v1/incomes` | Log income with per-account allocations that sum to the amount |
| `PUT /api/v1/incomes/{id}` | Edit an income; allocations are replaced |
| `DELETE /api/v1/incomes/{id}` | Delete an income and its allocations |
| `POST /api/v1/expenses` | Log an expense against an account |
| `GET /api/v1/expenses` | List expenses, newest first (`?accountId=&page=&pageSize=`) |
| `PUT /api/v1/expenses/{id}` | Edit an expense |
| `DELETE /api/v1/expenses/{id}` | Delete an expense |
| `GET /api/v1/dashboard` | Balances, total spent this month, and recent activity |
| `GET /api/v1/me` | Profile and preferred currency |
| `PUT /api/v1/me/currency` | Set the preferred display currency |

CORS origins for the browser client come from `Cors:AllowedOrigins` in
`appsettings.json` (defaults to http://localhost:3000).

## Web client

Mobile-first Next.js app in `src/Web.Client` — Inter typography, emerald "fintech"
theme with a light/dark/system toggle, bottom-sheet entry forms, and a gradient
spend summary on the home screen.

Auth uses a BFF pattern: Next.js route handlers under `app/api/auth/*` keep the
refresh token in an httpOnly cookie, the browser only ever holds the short-lived
access token in memory, and an axios interceptor refreshes it transparently on 401.

| Variable (`.env.local`) | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Browser-side axios calls (Bearer token) |
| `API_URL` | Server-side auth route handlers (cookie handling) |
