---
name: add-api-endpoint
description: Add a new backend feature or API endpoint to Tydee following the Clean Architecture vertical slice. Use when the task needs a new domain type, command/query handler, infrastructure service, or HTTP route.
---

# Add an API endpoint

Follow an existing slice such as `Endpoints/Accounts/CreateAccount.cs` -> `CreateAccountCommand` + handler + validator -> `IApplicationDbContext`. Dependencies point inward only; `tests/Tests/Architecture/LayerTests.cs` fails otherwise.

## Steps

1. **Contracts** — add flat request/response DTOs and enums under `src/Contracts/<Area>/`. The project is a leaf: no Tydee references and no infrastructure packages. Keep the wire shape identical to the client types in `src/Web.Client/lib/types/`.
2. **Domain** — add the model and its invariants under `src/Domain/<Area>/`, with an `<Area>Errors.cs` catalog of `Error` values. Domain references only `SharedKernel`.
3. **Application** — add the command or query, handler, validator, and result records under `src/Application/<Area>/<Action>/`.
   - Commands implement `ICommand` or `ICommand<TResponse>`; queries implement `IQuery<TResponse>`.
   - Handlers implement `ICommandHandler<...>` / `IQueryHandler<...>`, inject `IApplicationDbContext`, and add `IDateTimeProvider` when they write timestamps. Return `Result` / `Result<T>`.
   - Scope every query by `UserId` from the command/query; never trust a client-supplied user id.
   - Expected failures use the Domain error catalog. Do not invent new `Error.Code` values without checking the client.
   - Validators use FluentValidation; the `ValidationDecorator` turns failures into a `ValidationError`.
   - Handlers return Application result records. Do not reference `Contracts`.
   - When a response gains a field, mirror it in `src/Web.Client/lib/types/` and `tests/e2e/api/types.ts` in the same change. Additive backend fields are still a client contract.
4. **Register** — handlers and validators are discovered by Scrutor in `src/Application/DependencyInjection.cs`. No manual registration is needed unless the feature adds a new abstraction.
5. **Infrastructure** — add an entity configuration under `src/Infrastructure/<Area>/` and a migration when the schema changes. Register new services in `src/Infrastructure/DependencyInjection.cs`. Never reference `Contracts`. InMemory tests do not prove indexes, nullability, or SQL behavior; apply the migration to a throwaway PostgreSQL database (the e2e suite's disposable container counts).
6. **Endpoint** — add a sealed `IEndpoint` class under `src/Web.Api/Endpoints/<Model>/` with a literal `api/v1/...` path and a `Tags` constant. Bind a Contracts request, read `IUserContext.UserId`, build the command/query, call the handler interface, map the Application result to a Contracts DTO, and return `result.Match(..., CustomResults.Problem)`. Creates return `200 { id }`; updates and deletes return `204`. Endpoints must not reference `Domain`.
7. **Errors** — `CustomResults.Problem` maps `Result` failures to `ProblemDetails` with a stable `code` (the `Error.Code`). `GlobalExceptionHandler` remains the safety net. Never leak configuration details in messages.
8. **Tests** —
   - `tests/Tests/<Area>CommandHandlerTests.cs` using `TestDb.Create()`, `Seed`, and the fakes in `TestInfrastructure`.
   - Add validator coverage when rules are non-trivial.
   - Architecture rules must still pass.
   - Do not weaken or delete existing tests.
9. **Client** — add the call to `src/Web.Client/lib/api/<area>.ts`, the type to `lib/types/<area>.ts`, and a TanStack hook in `lib/hooks/` when the UI consumes it.
10. Run the `verify` skill at the standard tier.

## Rules

- Minimal APIs only. No controllers, no MediatR.
- `Contracts` and `SharedKernel` are leaves. `Infrastructure` must not reference `Contracts`. Web endpoints must not reference `Domain`. `Application` may reference EF Core through `IApplicationDbContext`.
- Expected failures return `Result<T>`; infrastructure failures may throw and are caught by `GlobalExceptionHandler`.
- Never change an existing route, JSON field name, enum casing, `Error.Code`, cookie name, or an already-applied migration without updating the client and tests. Add a new migration instead of editing history.
- `TreatWarningsAsErrors` is on: nullable annotations and file-scoped namespaces are mandatory.
- Package versions go in `Directory.Packages.props`, never in a `.csproj`.
