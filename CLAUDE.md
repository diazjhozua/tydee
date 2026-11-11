# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Tydee is a mobile-first envelope-style expense and savings tracker. Users create account "envelopes" (Budget, Savings, Emergency Fund), split income across them with a percentage template, and log expenses against the envelope they came from. Balances are always computed from allocations, adjustments, transfers, and expenses — never stored — so editing or deleting an entry cannot leave a stale balance behind.

The .NET 10 minimal API serves JSON under `api/v1/...`; the Next.js client in `src/Web.Client` is a separate app with a BFF for auth cookies. PostgreSQL is the only database.

## Commands

Run from the repository root unless noted.

```bash
dotnet build tydee.slnx
dotnet test tydee.slnx
dotnet test tydee.slnx --filter FullyQualifiedName~CreateIncomeCommandHandlerTests
dotnet run --project src/Web.Api                     # http://localhost:5000, Swagger at /swagger

docker compose up -d postgres                        # PostgreSQL on 5432
docker compose up -d seq                             # optional logs at http://localhost:8081
docker compose down

dotnet ef migrations add <Name> --project src/Infrastructure --startup-project src/Web.Api
dotnet ef database update --project src/Infrastructure --startup-project src/Web.Api

npm --prefix src/Web.Client run dev                  # http://localhost:3000
npm --prefix src/Web.Client run build
npm --prefix src/Web.Client run lint                 # ESLint
npm --prefix src/Web.Client run typecheck            # tsc --noEmit
npm --prefix src/Web.Client test                     # Vitest
npm --prefix src/Web.Client test -- lib/utils/currency.test.ts
npm --prefix tests/e2e test                          # Playwright (Docker + Chromium)
```

Local setup needs `ConnectionStrings:Database` and `Jwt:Secret` (at least 32 characters). They come from `src/Web.Api/appsettings.Development.json` (gitignored, contains secrets) or user secrets. Start PostgreSQL with `docker compose up -d postgres`, then `dotnet run --project src/Web.Api`; migrations apply on every startup.

## Architecture

```
src/SharedKernel    Result, Error, ErrorType, ValidationError, Entity, domain events, IDateTimeProvider (leaf)
src/Domain          entities, error catalogs, domain events; depends on SharedKernel
src/Contracts       flat HTTP request/response DTOs; leaf, no Tydee references
src/Application     commands, queries, handlers, validators, result records, abstractions; depends on Domain + SharedKernel (+ EF Core)
src/Infrastructure  EF Core/Npgsql, JWT, password hashing, SMTP; depends on Application
src/Web.Api         ASP.NET Core minimal API host and IEndpoint classes; depends on Contracts + Infrastructure
src/Web.Client      Next.js 16 App Router client (not in the solution)
tests/Tests         xUnit handler and architecture tests
tests/e2e           Playwright suite
```

Dependency direction is inward only and enforced by `tests/Tests/Architecture/LayerTests.cs`. `Contracts` and `SharedKernel` are leaves. `Application` deliberately references EF Core and exposes `IApplicationDbContext` with `DbSet<T>` properties — do not add a repository abstraction just for purity. `Infrastructure` must not reference `Contracts`. Web endpoints must not reference `Domain`.

Request flow: an `IEndpoint` class under `src/Web.Api/Endpoints/<Model>/` binds a Contracts request, reads `IUserContext.UserId`, builds a command or query, and calls `ICommandHandler`/`IQueryHandler`. Scrutor discovers handlers in `Application/DependencyInjection.cs` and wraps them: `LoggingDecorator` is outermost for commands and queries; `ValidationDecorator` is inner and wraps commands only. Handlers take `IApplicationDbContext` and `IDateTimeProvider`, perform the work, and return Application result records. Each endpoint maps those records to Contracts DTOs by hand. `ResultExtensions.Match` turns success into `Results.Ok`/`Results.NoContent` and failure into `CustomResults.Problem`.

Creates return `200 { id }`; updates and deletes return `204`. Endpoint paths are hard-coded `api/v1/...` and tagged through `Endpoints/Tags.cs`.

Errors: expected failures use `Result`/`Error`/`ErrorType` from `SharedKernel`, with catalogs such as `AccountErrors`, `IncomeErrors`, and `UserErrors`. `CustomResults.Problem` maps `ErrorType` to the HTTP status and puts `Error.Code` in `ProblemDetails.title`. Validation failures use `ValidationError` and appear under `extensions.errors`. `GlobalExceptionHandler` is the safety net and turns malformed requests into 400s and everything else into an opaque 500.

## Persistence

- `IApplicationDbContext` in Application is the persistence boundary. `ApplicationDbContext` in Infrastructure implements it with EF Core 10, Npgsql, and `UseSnakeCaseNamingConvention`; the default schema is `public`.
- DbSets: `Users`, `RefreshTokens`, `Accounts`, `Incomes`, `IncomeAllocations`, `Expenses`, `RecurringExpenses`, `Adjustments`, `Transfers`, `Suggestions`. Entity configurations live beside each area under `src/Infrastructure/<Area>/`.
- Balances are computed in `Application/Accounts/BalanceCalculator.cs`: income allocations + adjustments + transfers in − transfers out − expenses, grouped per account. Never add a stored balance column.
- Migrations live in `src/Infrastructure/Database/Migrations` and are applied on every startup by `MigrationExtensions.ApplyMigrations()`.
- Domain events are raised on entities, collected in `ApplicationDbContext.SaveChangesAsync`, and dispatched after the save succeeds through `IDomainEventsDispatcher` (scoped handlers).
- `tests/e2e` starts its own disposable PostgreSQL container and database; it never touches the development database.

## Auth and security

- JWT access tokens last 15 minutes; refresh tokens last 7 days and are stored as SHA-256 hashes.
- The BFF keeps the refresh token in an httpOnly cookie that is a session cookie by default; ticking "Remember me" on the login page makes it persist for 7 days, recorded by an httpOnly `remember_me` companion cookie that the refresh route reads so rotation preserves the choice.
- Refresh tokens rotate on every use. Reusing a revoked token revokes every active session for that user (`TokenReuseDetected`). Password reset also revokes all active sessions.
- Login locks an account for 15 minutes after 5 failed attempts. Locked and unknown accounts answer exactly like a wrong password.
- Email verification tokens expire after 24 hours; password reset tokens after 1 hour. `ForgotPassword` answers identically for unknown emails.
- Passwords use ASP.NET Core Identity's `PasswordHasher`. The `Admin` policy requires the `Admin` role; `Admin:Emails` grants it on login and never revokes a manually set flag.
- Rate limiting: a global fixed window, an `auth` policy on auth endpoints, and a `suggestion` policy. Configuration lives under `RateLimiting` in `appsettings.json`.
- CORS origins come from `Cors:AllowedOrigins`. Security headers (`nosniff`, `DENY`, `no-referrer`) are set in `UseSecurityHeaders`; HSTS is enabled outside Development; the Kestrel `Server` header is disabled.

## Client

- Next.js 16 App Router, React 19, Tailwind v4 with oklch tokens, Base UI shadcn (`base-nova`), TanStack Query, Zustand, axios.
- Routes: marketing `/`; auth `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`; app `/app`, `/log-expense`, `/accounts`, `/recurring`, `/recurring/[id]`, `/settings`, `/admin`, `/setup`; public legal pages under `/privacy`, `/terms`, and similar.
- Auth uses a BFF: `app/api/auth/*` route handlers keep the refresh token in an httpOnly `refresh_token` cookie; the browser holds only the short-lived access token in `lib/stores/authStore.ts`. The axios interceptor in `lib/api/client.ts` refreshes on 401 through `/api/auth/refresh`.
- Server data is fetched by `lib/api/<area>.ts` modules and wrapped in TanStack Query hooks under `lib/hooks/`. Zustand holds only local UI state: auth tokens, balance visibility, cookie consent.
- TanStack Query persists paused mutations to localStorage and replays them when the browser comes back online. `providers/QueryProvider.tsx` registers the replayable mutation functions with `setMutationDefaults`; new offline-capable mutations must be added there.
- The client is a PWA (`@serwist/next`) and is mobile-first: `AppShell` has a sticky header, bottom navigation, bottom-sheet entry forms, and a 375px-first layout.
- `NEXT_PUBLIC_API_URL` is used by browser calls; `API_URL` is used server-side by the auth route handlers. `NEXT_PUBLIC_APP_URL` sets metadata and the verification link base.

## Tests

- `dotnet test tydee.slnx` runs xUnit with Shouldly and NSubstitute. Handlers are constructed directly against an EF Core InMemory database (`TestDb.Create()`) and seeded with `Seed.User` / `Seed.Account`; fakes live in `TestInfrastructure/Fakes.cs`.
- InMemory does not enforce relational constraints or migrations. Do not rely on it to prove indexes, SQL behavior, or migration correctness; verify those on a throwaway PostgreSQL database.
- `tests/Tests/Architecture/LayerTests.cs` uses NetArchTest to enforce the layer rules and that endpoints are sealed and do not reference Domain.
- Vitest + React Testing Library tests are colocated with the client code as `*.test.ts(x)`; setup is `src/Web.Client/vitest.setup.ts`.
- Playwright runs against an isolated API on 5100 and client on 3100 with `ASPNETCORE_ENVIRONMENT=Testing`, a disposable PostgreSQL container, fake email, and `reuseExistingServer: false`. It must not reuse the developer servers on 5000/3000 or the development database.

## Conventions

- Minimal APIs only; no controllers or MediatR. CQRS uses Tydee's own `ICommand`/`IQuery` + handler interfaces, with Scrutor registration and decorators.
- Put HTTP request and response DTOs in `Contracts`; Application result records stay in Application and are mapped to Contracts in the endpoint.
- Expected failures return `Result<T>`; infrastructure failures may throw and are mapped by `GlobalExceptionHandler`. Never change an existing route, JSON field name, enum casing, `Error.Code`, cookie name, or migration without updating the client and tests.
- Persistence goes through `IApplicationDbContext`. `Contracts` and `SharedKernel` stay leaves; `Infrastructure` never references `Contracts`; endpoints never reference `Domain`.
- `TreatWarningsAsErrors`, nullable, and file-scoped namespaces are mandatory for all .NET projects; Sonar analyzers run in the build. Central package versions live in `Directory.Packages.props`.
- Use `IDateTimeProvider` for timestamps in application code so tests can substitute it.
- No hardcoded colors in client components; use the oklch tokens in `src/Web.Client/app/globals.css`. Render amounts through `Money` and `lib/utils/currency.ts`.
- Conventional Commits via the `/commit` skill; `guard-commit.mjs` blocks non-conforming messages. No attribution trailers.
- `CLAUDE.md` and `.claude/{settings.json,agents,hooks,skills}` are committed. `.claude/settings.local.json`, `.claude/plans/`, and `.claude/cache/` are local only.

## Agentic workflow

- Run the `verify` skill (`/verify`) before every commit: fast tier for a narrow edit, standard tier for code changes, full tier (adds Playwright) before a release.
- The `review` skill (`/review`) is the pre-commit checklist for this repo; run it on the working diff.
- The `create-issue` skill (`/create-issue`) files a GitHub issue as a bug, feature, or task: it verifies the claim with `code-explorer`, checks for duplicates, shows a preview, then creates it with `gh issue create` after confirmation.
- The `close-issue` skill (`/close-issue`) closes a resolved issue after the fix is merged and verified: it drafts a summary comment with commit or PR references, shows the exact comment and close reason, then comments and closes with `gh` after confirmation.
- `/feature-dev` is the entry point for multi-layer features: it explores with `code-explorer`, designs with `code-architect` (plus the `frontend-design` skill for UI), builds with the slice skills, reviews with `code-reviewer` + `architecture-reviewer` + `ui-reviewer`, and finishes with `verify`, then offers `/commit` and, when an issue is tracked, `/close-issue`.
- Sub-agents: `code-explorer` traces existing slices, `code-architect` writes blueprints, `code-reviewer` checks bugs and simplicity, `architecture-reviewer` for layer and DI checks, `feature-builder` for multi-file vertical slices, `test-runner` to diagnose failures, `ui-reviewer` for accessibility and token usage.
- `add-api-endpoint` and `add-client-feature` encode the vertical-slice patterns used by the `IEndpoint` slices and the home/accounts screens; `code-architect` preloads both, and `code-reviewer` preloads `review`.
- `feature-dev`, `frontend-design`, and the `code-*` agents are vendored from the Claude plugins of the same name (Apache-2.0, licenses kept beside the skills) and customized for Tydee; the plugins are disabled in `.claude/settings.json` to avoid duplicate agents.

## Subdirectory instructions

| Path | Scope |
|---|---|
| `src/Web.Client/CLAUDE.md` | Next client state, tokens, API modules, offline behavior, tests |
| `tests/e2e/CLAUDE.md` | Playwright isolation rules |
