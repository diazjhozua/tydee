---
name: review
description: Review the Tydee working diff before committing. Use for "review this", "review my changes", or as the pre-commit checklist.
---

# Review

Review `git diff` plus untracked files. Report findings as `path:line: severity: problem. fix.` — no praise, no scope creep. Only report issues that change behavior, correctness, security, or the project's stated conventions.

## Checklist

**Architecture**
- Any reference that points outward between `SharedKernel`, `Domain`, `Contracts`, `Application`, `Infrastructure`, `Web.Api`.
- Endpoints referencing `Domain`, or Infrastructure referencing `Contracts`.
- Use cases constructed with `HttpContext`, `IConfiguration`, or infrastructure types.
- New service not registered in the matching `DependencyInjection.cs`.

**Backend**
- `Error.Code` values changed or reused for a different meaning; codes are a client contract.
- Exception messages leaking connection strings, SMTP credentials, JWT secrets, or user data.
- `DateTime.Now` / `DateTime.UtcNow` instead of `IDateTimeProvider` in application code.
- Missing nullable annotations or block-scoped namespaces (both fail the build).
- Package version added to a `.csproj` instead of `Directory.Packages.props`.
- Balance changes that skip adjustments, transfers, or expenses in `BalanceCalculator`.
- A new or changed response field not mirrored in `src/Web.Client/lib/types/` and `tests/e2e/api/types.ts`.
- A migration that was only exercised on EF InMemory; schema, nullability, and indexes need a real PostgreSQL apply.

**Client**
- Hex colors or arbitrary color values instead of tokens from `app/globals.css`.
- Hand-formatted currency instead of `Money` / `formatMoney`.
- Direct `fetch` outside `lib/api` and the auth BFF, or a second state library.
- A query mutation that changes balances without invalidating `accounts` and `dashboard`.
- Missing label/input association or removed focus ring.
- `asChild` used with Base UI components instead of `render`.
- Duplicate DOM ids when a page form and a sheet form can be mounted together; use `useId`.
- A button disabled by `isPending` that stays disabled after an offline save because the mutation is paused (`isPending` is true, `isPaused` is also true).
- A non-dismissible dialog with no keyboard or backdrop escape, especially when its actions are disabled offline or while pending.
- Page-load `autoFocus` that opens the mobile keyboard before the user acts.
- A redirect target taken from a query parameter without a same-origin relative-path check.
- An edit flow that falls back to a different account or parent when the current one is absent from a filtered options list (for example an archived envelope).

**Tests**
- Behavior change without a test at the matching layer.
- Playwright pointed at ports 5000/3000, `reuseExistingServer` relaxed, or a real SMTP send.
- Assertions weakened, skipped, or deleted to make a suite pass.
- A new blocking dialog or prompt without updating the e2e fixtures, so existing specs stall behind it.

**Repo hygiene**
- Secrets, `.env`, `appsettings.Development.json`, build output, `.next`, or `node_modules` staged.
- `CLAUDE.md` or `.claude/` files that should stay local (`.claude/settings.local.json`, `.claude/plans/`, `.claude/cache/`).
- Commit message not produced by `/commit` or rejected by `guard-commit.mjs`.
