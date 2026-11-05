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

**Client**
- Hex colors or arbitrary color values instead of tokens from `app/globals.css`.
- Hand-formatted currency instead of `Money` / `formatMoney`.
- Direct `fetch` outside `lib/api` and the auth BFF, or a second state library.
- A query mutation that changes balances without invalidating `accounts` and `dashboard`.
- Missing label/input association or removed focus ring.
- `asChild` used with Base UI components instead of `render`.

**Tests**
- Behavior change without a test at the matching layer.
- Playwright pointed at ports 5000/3000, `reuseExistingServer` relaxed, or a real SMTP send.
- Assertions weakened, skipped, or deleted to make a suite pass.

**Repo hygiene**
- Secrets, `.env`, `appsettings.Development.json`, build output, `.next`, or `node_modules` staged.
- `CLAUDE.md` or `.claude/` files that should stay local (`.claude/settings.local.json`, `.claude/plans/`, `.claude/cache/`).
- Commit message not produced by `/commit` or rejected by `guard-commit.mjs`.
