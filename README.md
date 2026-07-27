# Tydee

A simple envelope-style expense and savings tracker. You create account placeholders
(Budget, Savings, Emergency Fund), allocate your income across them, and log daily
expenses against the account they come from.

## Structure

```
src/
  SharedKernel/     Result, Error, Entity, domain event primitives
  Domain/           Entities and domain errors
  Contracts/        Request/response DTOs
  Application/      Commands, handlers, validators (no MediatR - custom handler interfaces)
  Infrastructure/   EF Core (PostgreSQL), JWT, password hashing, SMTP email
  Web.Api/          Minimal API endpoints
tests/
  Tests/            xUnit tests
```

## Local setup

Requirements: .NET 10 SDK, Docker.

1. Start PostgreSQL (and optionally Seq for logs at http://localhost:8081):

   ```
   docker compose up postgres -d
   ```

2. Fill in the SMTP credentials in `src/Web.Api/appsettings.Development.json`
   (the file is gitignored). Any SMTP provider works; [Mailtrap](https://mailtrap.io)
   is handy for development since it captures emails without sending real ones.
   For anything beyond local dev, prefer user secrets over the settings file:

   ```
   cd src/Web.Api
   dotnet user-secrets set "Jwt:Secret" "your-secret-at-least-32-chars"
   dotnet user-secrets set "Smtp:Password" "your-smtp-password"
   ```

3. Run the API. Migrations apply automatically on startup in development:

   ```
   dotnet run --project src/Web.Api
   ```

4. Open Swagger at http://localhost:5000/swagger, or use `src/Web.Api/tydee.api.http`.

## Auth flow

| Endpoint | Description |
|---|---|
| `POST api/v1/auth/register` | Creates the account and emails a verification link (24h expiry) |
| `POST api/v1/auth/verify-email` | Verifies the email using the token from the link |
| `POST api/v1/auth/login` | Returns an access token (15 min) and refresh token (7 days). Rejects unverified emails |
| `POST api/v1/auth/refresh-token` | Rotates the refresh token. Reusing an old token revokes all sessions |

Refresh tokens are stored as SHA-256 hashes, so a database dump can't be replayed.
