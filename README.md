<p align="center">
  <a href="" rel="noopener">
    <img width="200" height="200" src="assets/logo.svg" alt="Tydee logo"></a>
</p>

<h3 align="center">Tydee</h3>

<div align="center">

[![Status](https://img.shields.io/badge/status-active-success.svg)]()
[![GitHub Issues](https://img.shields.io/github/issues/diazjhozua/tydee.svg)](https://github.com/diazjhozua/tydee/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/diazjhozua/tydee.svg)](https://github.com/diazjhozua/tydee/pulls)
[![License](https://img.shields.io/badge/license-proprietary-red.svg)](LICENSE)

</div>

---

<p align="center"> A mobile-first envelope budget that always knows what is left to spend.
    <br>
</p>

## 📝 Table of Contents

- [About](#about)
- [Getting Started](#getting_started)
- [Running the tests](#tests)
- [Usage](#usage)
- [Deployment](#deployment)
- [Built Using](#built_using)
- [Authors](#authors)
- [Acknowledgements](#acknowledgement)
- [License](#license)

## 🧐 About <a name = "about"></a>

Tydee is an envelope-style expense and savings tracker. You create account "envelopes"
(Budget, Savings, Emergency Fund), split your income across them with a percentage
template, and log daily expenses against the envelope they came from. Every balance is
computed from allocations, adjustments, transfers, and expenses rather than stored, so
editing or deleting an entry can never leave a stale balance behind.

The project is a .NET 10 minimal API backed by PostgreSQL and a separate Next.js 16
client. Authentication uses short-lived JWT access tokens, rotating refresh tokens kept
in an httpOnly cookie by the client's BFF, email verification, and password reset. The
client is a mobile-first PWA with offline expense and income entry.

## 🏁 Getting Started <a name = "getting_started"></a>

These instructions get a copy of the project running locally for development and testing.
See [deployment](#deployment) for notes on running it on a live system.

### Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js 22](https://nodejs.org/) and npm
- [Docker](https://docs.docker.com/get-docker/) with Compose
- Git

### Installing

1. Clone the repository:

   ```
   git clone https://github.com/diazjhozua/tydee.git
   cd tydee
   ```

2. Start PostgreSQL. The compose file creates the `tydee` database and user, and
   optionally Seq for logs at http://localhost:8081:

   ```
   docker compose up -d postgres
   docker compose up -d seq
   ```

   Point the API at the database with:

   ```
   ConnectionStrings__Database=Host=localhost;Port=5432;Database=tydee;Username=tydee;Password=Tydee_Dev123!
   ```

3. Configure the API. `Jwt:Secret` must be at least 32 characters, and SMTP credentials
   are needed for verification and reset emails. Prefer user secrets over the gitignored
   `src/Web.Api/appsettings.Development.json`:

   ```
   cd src/Web.Api
   dotnet user-secrets set "Jwt:Secret" "your-secret-at-least-32-chars"
   dotnet user-secrets set "Smtp:Password" "your-smtp-password"
   ```

   Any SMTP provider works. [Mailtrap](https://mailtrap.io) is convenient for
   development, and a Gmail app password works for a personal setup.

4. Run the API. Migrations apply automatically on startup:

   ```
   dotnet run --project src/Web.Api
   ```

   Swagger lives at http://localhost:5000/swagger, and
   `src/Web.Api/tydee.api.http` has ready-made requests for every endpoint.

5. Run the web client. Copy `src/Web.Client/.env.example` to
   `src/Web.Client/.env.local`, then install and start:

   ```
   cd src/Web.Client
   npm install
   npm run dev     # http://localhost:3000
   ```

   The local client needs `NEXT_PUBLIC_API_URL=http://localhost:5000`,
   `API_URL=http://localhost:5000`, and `NEXT_PUBLIC_APP_URL=http://localhost:3000`.

Register at http://localhost:3000/register. The verification email links back to the
client, and the first login opens a two-step setup: create your envelopes, then set the
income split.

## 🔧 Running the tests <a name = "tests"></a>

The .NET solution runs xUnit tests with Shouldly and NSubstitute. Handlers are constructed
against an EF Core InMemory database, while NetArchTest enforces the Clean Architecture
layer boundaries:

```
dotnet test tydee.slnx
```

Run a single test class or method with a filter:

```
dotnet test tydee.slnx --filter FullyQualifiedName~CreateIncomeCommandHandlerTests
```

The client has Vitest and React Testing Library tests colocated beside the code, plus
type checking and ESLint:

```
npm --prefix src/Web.Client run typecheck
npm --prefix src/Web.Client run lint
npm --prefix src/Web.Client test
```

### End-to-end tests

Playwright covers the marketing page and the full register, verify, log in, and setup
flow. The suite starts its own disposable PostgreSQL container and database, runs the API
on port 5100 and the client on port 3100 with `ASPNETCORE_ENVIRONMENT=Testing`, and never
touches the development database or the servers on 5000/3000. Docker must be running, and
Chromium must be installed once:

```
npm --prefix tests/e2e exec playwright install chromium
npm --prefix tests/e2e test
```

### Coding style and static checks

The .NET build treats warnings as errors and runs Sonar analyzers; nullable reference
types and file-scoped namespaces are required. The client uses ESLint plus `tsc --noEmit`.
Run both before committing:

```
dotnet build tydee.slnx
npm --prefix src/Web.Client run lint
npm --prefix src/Web.Client run typecheck
```

## 🎈 Usage <a name="usage"></a>

1. Register and verify your email.
2. Log in and complete setup: create envelopes such as Budget, Savings, and Emergency
   Fund, then set the percentage split used to pre-fill every income.
3. Log an income and confirm the per-envelope allocations, or adjust them before saving.
4. Log expenses against the envelope they came from, with a note and date.
5. Open the dashboard for per-account balances, total spent this month, and recent
   activity. Balances are recalculated from the underlying entries on every request.
6. Change the display currency in settings (PHP, USD, EUR, GBP, JPY, AUD, CAD, or SGD),
   hide balances when needed, and install the PWA for offline expense and income entry.

Archiving an envelope keeps its history but removes it from new entries. Editing or
deleting an income, expense, transfer, or adjustment updates every affected balance
immediately because no balance is stored.

## 🚀 Deployment <a name = "deployment"></a>

Tydee runs self-hosted on a private lab server. Pushing to `main` builds and publishes
two container images to the GitHub Container Registry:

- `ghcr.io/diazjhozua/tydee-api:latest` from `src/Web.Api/Dockerfile`
- `ghcr.io/diazjhozua/tydee-client:latest` from `src/Web.Client/Dockerfile`

The client image bakes in `NEXT_PUBLIC_API_URL` at build time (the workflow uses the
public API URL) and uses the same value for `API_URL` so the auth BFF can reach the API.
The API image listens on port 5000 and applies migrations on startup.

Provide production configuration through environment variables or a secret store:

```
ConnectionStrings__Database=Host=<host>;Port=5432;Database=tydee;Username=<user>;Password=<password>
Jwt__Secret=<at-least-32-characters>
Jwt__Issuer=<issuer>
Jwt__Audience=<audience>
Cors__AllowedOrigins__0=https://<client-host>
Smtp__Host=<smtp-host>
Smtp__Username=<smtp-user>
Smtp__Password=<smtp-password>
Smtp__FromEmail=<from-address>
Smtp__FrontendUrl=https://<client-host>
Email__Provider=Smtp
```

Put the client and API behind a TLS-terminating reverse proxy, keep PostgreSQL on a
private network, and back up the database. Azure Database for PostgreSQL is supported by
changing only the connection string.

## ⛏️ Built Using <a name = "built_using"></a>

- [.NET 10](https://dotnet.microsoft.com/) and ASP.NET Core minimal APIs - API host
- [PostgreSQL](https://www.postgresql.org/) - Database
- [EF Core 10](https://learn.microsoft.com/ef/core/) with Npgsql - Persistence
- [Next.js 16](https://nextjs.org/) and [React 19](https://react.dev/) - Web client
- [Tailwind CSS v4](https://tailwindcss.com/) and [Base UI](https://base-ui.com/) - Styling and components
- [TanStack Query](https://tanstack.com/query) and [Zustand](https://zustand.docs.pmnd.rs/) - Server and local state
- [Docker](https://www.docker.com/) and GitHub Actions - Packaging and delivery

## ✍️ Authors <a name = "authors"></a>

- [@diazjhozua](https://github.com/diazjhozua) - Idea and initial work

See also the list of [contributors](https://github.com/diazjhozua/tydee/contributors)
who participated in this project.

## 🎉 Acknowledgements <a name = "acknowledgement"></a>

- The Tydee mark uses the Lucide `Coins` glyph
- The ASP.NET Core, EF Core, Npgsql, Next.js, TanStack Query, Base UI, and Tailwind teams
  for the foundations this project builds on
- The Claude Code agent and skill ecosystem that supports the repository workflow

## License <a name = "license"></a>

Tydee is proprietary software. All rights reserved. The Tydee name, software, design, and
branding are owned by the project author and are not licensed for copying, resale, or
redistribution except as permitted by law or with prior written permission. See
[LICENSE](LICENSE) for the full notice and the Terms & Conditions in the app at `/terms`
for the service terms.
