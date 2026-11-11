---
name: feature-dev
description: Guided Tydee feature development - explore, clarify, design, build, review, verify. Use for "/feature-dev", "build feature X", or any change spanning several layers or screens.
argument-hint: Optional feature description
---

# Feature Development

Adapted from the `feature-dev` plugin (Apache-2.0, see `LICENSE`) and wired to Tydee's own agents and skills. Work in phases, wait for the user at each gate, and keep a visible plan: use `TodoWrite` or the Task tools (`TaskCreate`/`TaskUpdate`) when the harness provides them, otherwise keep a short numbered plan in the reply and update it as phases complete.

Initial request: $ARGUMENTS

## Principles

- Read the root `CLAUDE.md` first; read `src/Web.Client/CLAUDE.md` when the client is involved and `tests/e2e/CLAUDE.md` when Playwright is involved.
- Reuse before inventing. The vertical-slice patterns live in the `add-api-endpoint` and `add-client-feature` skills; designs and code follow them unless the user approves a deviation.
- Ask before assuming. Wait for answers at every gate marked **Gate**.
- After agents return, read the key files they list before deciding anything.

## Agents and skills used

| Phase | Use |
|---|---|
| Explore | `code-explorer` (2-3 in parallel) |
| Design | `code-architect` (2-3 in parallel); `frontend-design` skill for new or reshaped UI |
| Build | main thread with `add-api-endpoint` / `add-client-feature`; `feature-builder` for a large, approved, self-contained slice |
| Review | `code-reviewer`, `architecture-reviewer` (backend touched), `ui-reviewer` (client touched) in parallel |
| Verify | `verify` skill; `test-runner` on failures |
| Ship | `/commit` (only when the user asks); `/close-issue` once the fix is merged and the work tracks an issue |

## Phase 1: Discovery

1. Create the plan with all phases (`TodoWrite` or `TaskCreate` when available).
2. If the request is unclear, ask what problem it solves, what it should do, and any constraints.
3. Classify the scope: backend only, client only, or full slice (domain -> application -> infrastructure -> endpoint -> `lib/api` -> TanStack hook -> screen). Note whether it touches auth, persistence and migrations, balances, offline behavior, or routing.
4. Summarize your understanding and confirm with the user.

## Phase 2: Codebase exploration

1. Launch 2-3 `code-explorer` agents in parallel, each on a different aspect, for example:
   - the closest existing slice (e.g. accounts: `Endpoints/Accounts/CreateAccount.cs` -> `CreateAccountCommandHandler` -> `AccountDialog` -> `useAccounts`)
   - the persistence and state path (`IApplicationDbContext`, `ApplicationDbContext`, `BalanceCalculator`, TanStack query keys, offline mutation replay)
   - UI patterns, components in `components/ui`, and test approach for the affected screen
2. Read every key file they return.
3. Present a summary of findings and the patterns the feature must follow.

## Phase 3: Clarifying questions — **Gate**

Do not skip. List concrete questions about edge cases, error handling and `Error.Code` values, persistence shape and migrations, balance or allocation invariants, empty/error states, offline behavior, and scope boundaries. Wait for answers. If the user says "whatever you think", give a recommendation and get explicit confirmation.

## Phase 4: Architecture design — **Gate**

1. Launch `code-architect` agents in parallel, one per focus: `minimal`, `balanced`, `maximal`. All three obey the same Clean Architecture layering; that is a fixed constraint, not an option. The focus changes only how much new abstraction the design introduces.

   Scale the fan-out to the decision: one `balanced` architect is enough for a narrow, well-understood change; use all three when the design is genuinely open or the feature spans several layers. Do not spend three blueprints on a one-file fix.

   | Focus | Optimizes | Pick when |
   |---|---|---|
   | `minimal` | fewest new concepts; reuse the existing slice as-is | an existing slice already does most of the work |
   | `balanced` | a new abstraction only when a real second consumer or a boundary rule earns it | the feature fits the vertical-slice pattern with a few new pieces (default) |
   | `maximal` | full seams, one abstraction per concept | the feature is known to grow several consumers, or the boundary is genuinely unclear |
2. If the feature adds or reshapes UI, apply the `frontend-design` skill to the UI part of the chosen design.
3. Present each approach briefly, the trade-offs, and your recommendation with reasoning. Ask which approach to take.

## Phase 5: Implementation — **Gate**

Do not start without explicit approval.

1. Re-read the files the chosen blueprint touches.
2. Build following `add-api-endpoint` (backend) and `add-client-feature` (client). Write tests at each layer you change as you go.
3. For a large, self-contained slice the user approved, you may delegate to `feature-builder` with the blueprint; otherwise implement in the main thread.
4. Keep root and client `CLAUDE.md` accurate if the change alters something they describe.

## Phase 6: Quality review — **Gate**

1. Launch in parallel:
   - `code-reviewer` — bugs, correctness, simplicity/DRY.
   - `architecture-reviewer` — if anything under `src/` or `tests/` changed.
   - `ui-reviewer` — if anything under `src/Web.Client/` changed.
2. Consolidate, drop duplicates, rank by severity.
3. Present findings and ask: fix now, fix later, or proceed. Apply what the user chooses.

## Phase 7: Verify

Run the `verify` skill: standard tier for code changes, full tier when auth, routing, onboarding, or Playwright is touched. On failure, use `test-runner`. Report exact results; never claim green without running the commands.

## Phase 8: Summary

Mark the plan complete and summarize what was built, key decisions, files changed, verification results, and next steps. Offer `/commit`; do not commit unless asked. If the work resolves a tracked GitHub issue, say that `/close-issue` is available after the commits are pushed or the pull request is merged; do not close it yourself unless asked.
