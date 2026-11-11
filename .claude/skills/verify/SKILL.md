---
name: verify
description: Run Tydee's verification tiers before committing or when asked to check the build. Use for "verify", "run the tests", "is this green", or after finishing a code change.
---

# Verify

Run the cheapest tier that covers the change, then report exact results. Never claim green without running the command. Tiers are cumulative: standard includes fast, full includes standard.

All commands run from the repository root.

## Fast tier (docs or a narrow client edit)

```bash
npm --prefix src/Web.Client run typecheck
npm --prefix src/Web.Client run lint
npm --prefix src/Web.Client test
dotnet build tydee.slnx
```

## Standard tier (any backend or shared change, required before commit)

Fast tier plus:

```bash
dotnet test tydee.slnx
```

Typecheck and lint stay in the standard run: a backend-only change can still break a shared client type, and the Stop hook runs typecheck anyway.

## Full tier (before a release or when touching auth, onboarding, routing, or Playwright)

Standard tier plus:

```bash
npm --prefix tests/e2e test
```

The E2E suite starts a disposable PostgreSQL container, builds the client, and runs its own API on 5100 and client on 3100 with the `Testing` environment and fake email. It must never reuse the developer servers on 5000/3000 or the development database. Docker and `npx playwright install chromium` are required.

## Reporting

- On failure, quote the failing command and the shortest decisive error line or failing test name.
- Do not weaken assertions, skip tests, or delete tests to go green.
- If a full `dotnet test` fails because a running `Web.Api` process locks the output DLLs, stop the process and rerun; do not use `--no-build` to hide it.
- Summarize as: tier run, command list, pass/fail counts, and the first failure with its file path.
