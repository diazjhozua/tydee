---
name: feature-dev
description: Guided Tydee feature development - explore, clarify, design, build, review, verify, then ship on a branch with a commit and pull request. Use for "/feature-dev", "build feature X", "work on issue #12", "implement issue #12", "fix issue #12", "open a PR for this", or any change spanning several layers or screens. When a GitHub issue is given, work happens in a worktree on a fix/feat/chore branch.
argument-hint: Optional feature description, or a GitHub issue number or URL
---

# Feature Development

Adapted from the `feature-dev` plugin (Apache-2.0, see `LICENSE`) and wired to Tydee's own agents and skills. Work in phases, wait for the user at each gate, and keep a visible plan: use `TodoWrite` or the Task tools (`TaskCreate`/`TaskUpdate`) when the harness provides them, otherwise keep a short numbered plan in the reply and update it as phases complete.

Initial request: $ARGUMENTS

## Principles

- Read the root `CLAUDE.md` first; read `src/Web.Client/CLAUDE.md` when the client is involved and `tests/e2e/CLAUDE.md` when Playwright is involved.
- Reuse before inventing. The vertical-slice patterns live in the `add-api-endpoint` and `add-client-feature` skills; designs and code follow them unless the user approves a deviation.
- Ask before assuming. Wait for answers at every gate marked **Gate**.
- After agents return, read the key files they list before deciding anything.
- Nothing is committed, pushed, or opened as a pull request without its gate in Phase 8.

## Agents and skills used

| Phase | Use |
|---|---|
| Intake | `gh` for the issue; `EnterWorktree` when an issue is given |
| Explore | `code-explorer` (2-3 in parallel) |
| Design | `code-architect` (2-3 in parallel); `frontend-design` skill for new or reshaped UI |
| Build | main thread with `add-api-endpoint` / `add-client-feature`; `feature-builder` for a large, approved, self-contained slice |
| Review | `code-reviewer`, `architecture-reviewer` (backend touched), `ui-reviewer` (client touched) in parallel |
| Verify | `verify` skill; `test-runner` on failures |
| Ship | `/commit` (Phase 8a); `gh pr create` (Phase 8b); `gh issue comment` (Phase 8c); the `close-released-issues` job closes `Refs` issues at release; `/close-issue` for manual cases |

## Phase 0: Intake

Run this phase first. It decides whether the work is isolated in a worktree.

1. Run `gh auth status`. If `github.com` is not logged in, stop and tell the user to run `gh auth login`.
2. If `$ARGUMENTS` holds an issue number or URL, read it:
   `gh issue view <number> --repo <owner/repo> --json number,title,state,labels,url`
   - `state` is `CLOSED`: stop and report it. Do not build on a closed issue.
   - Type: `gh api repos/<owner>/<repo>/issues/<number> --jq '.type.name // empty'` returns `Bug`, `Feature`, or `Task` when the repository uses issue types. If that is empty, use labels (`bug` → Bug, `enhancement` → Feature, neither → Task). If it is still ambiguous, ask.
3. Derive the branch name `<prefix>/<number>-<slug>`:
   - Bug → `fix/`, Feature → `feat/`, Task → `chore/`
   - `<slug>` is the issue title in lowercase kebab-case, 40 characters or fewer, with no trailing hyphen.
   - Example: issue #12 "Dashboard grid view resets after reload" → `fix/12-dashboard-grid-view-resets-after-reload`
4. Before creating anything, check for an existing branch or worktree with that name (`git branch --list <branch>` and `git worktree list`). If one exists, ask whether to resume it or stop. Never create a second one for the same issue.
5. Enter the worktree: `EnterWorktree` with `name` set to the branch name. Every later phase runs inside it. The worktree keeps this feature's changes separate from the main checkout while the work is in progress.
6. In the worktree, install dependencies only if they are missing (`npm --prefix src/Web.Client install`, `dotnet restore tydee.slnx`).
7. If no issue is given, skip this phase: no worktree, no branch rule, no `Refs` line. Phase 8 still runs, but only when the user asks for a commit or pull request.

## Phase 1: Discovery

1. Create the plan with all phases (`TodoWrite` or `TaskCreate` when available).
2. If the request is unclear, ask what problem it solves, what it should do, and any constraints.
3. Classify the scope: backend only, client only, or full slice (domain -> application -> infrastructure -> endpoint -> `lib/api` -> TanStack hook -> screen). Note whether it touches auth, persistence and migrations, balances, offline behavior, or routing.
4. Summarize your understanding, state the branch name when an issue is in use, and confirm both with the user.

## Phase 2: Codebase exploration

1. Launch 2-3 `code-explorer` agents in parallel, each on a different aspect, for example:
   - the closest existing slice (e.g. accounts: `Endpoints/Accounts/CreateAccount.cs` -> `CreateAccountCommandHandler` -> `AccountDialog` -> `useAccounts`)
   - the persistence and state path (`IApplicationDbContext`, `ApplicationDbContext`, `BalanceCalculator`, TanStack query keys, offline mutation replay)
   - UI patterns, components in `components/ui`, and test approach for the affected screen
2. Read every key file they return.
3. Present a summary of findings and the patterns the feature must follow.

## Phase 3: Clarifying questions - **Gate**

Do not skip. List concrete questions about edge cases, error handling and `Error.Code` values, persistence shape and migrations, balance or allocation invariants, empty/error states, offline behavior, and scope boundaries. Wait for answers. If the user says "whatever you think", give a recommendation and get explicit confirmation.

## Phase 4: Architecture design - **Gate**

1. Launch `code-architect` agents in parallel, one per focus: `minimal`, `balanced`, `maximal`. All three obey the same Clean Architecture layering; that is a fixed constraint, not an option. The focus changes only how much new abstraction the design introduces.

   Scale the fan-out to the decision: one `balanced` architect is enough for a narrow, well-understood change; use all three when the design is genuinely open or the feature spans several layers. Do not spend three blueprints on a one-file fix.

   | Focus | Optimizes | Pick when |
   |---|---|---|
   | `minimal` | fewest new concepts; reuse the existing slice as-is | an existing slice already does most of the work |
   | `balanced` | a new abstraction only when a real second consumer or a boundary rule earns it | the feature fits the vertical-slice pattern with a few new pieces (default) |
   | `maximal` | full seams, one abstraction per concept | the feature is known to grow several consumers, or the boundary is genuinely unclear |
2. If the feature adds or reshapes UI, apply the `frontend-design` skill to the UI part of the chosen design.
3. Present each approach briefly, the trade-offs, and your recommendation with reasoning. Ask which approach to take.

## Phase 5: Implementation - **Gate**

Do not start without explicit approval.

1. Re-read the files the chosen blueprint touches.
2. Build following `add-api-endpoint` (backend) and `add-client-feature` (client). Write tests at each layer you change as you go.
3. For a large, self-contained slice the user approved, you may delegate to `feature-builder` with the blueprint; otherwise implement in the main thread.
4. Keep root and client `CLAUDE.md` accurate if the change alters something they describe.

## Phase 6: Quality review - **Gate**

1. Launch in parallel:
   - `code-reviewer` - bugs, correctness, simplicity/DRY.
   - `architecture-reviewer` - if anything under `src/` or `tests/` changed.
   - `ui-reviewer` - if anything under `src/Web.Client/` changed.
2. Consolidate, drop duplicates, rank by severity.
3. Present findings and ask: fix now, fix later, or proceed. Apply what the user chooses.

## Phase 7: Verify

Run the `verify` skill: standard tier for code changes, full tier when auth, routing, onboarding, or Playwright is touched. On failure, use `test-runner`. Report exact results; never claim green without running the commands. Phase 8 starts only after verification passes or the user accepts the remaining risk.

## Phase 8: Ship

Shipping has three gates: 8a, 8b, and 8c. The user approves each one separately. 8c runs only when an issue is in use.

### 8a: Commit gate

1. Run `git status` and `git diff --stat`. Stage files by name, never `git add -A` or `git add .`.
2. Group the changes into logical commits and draft each message in Conventional Commits form: `type(scope): summary`, lowercase imperative, no trailing period.
   - Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `style`, `perf`.
   - Scope names the area touched: `accounts`, `income`, `api`, `client`, `auth`, and similar.
   - Breaking change: add `!` after the type or scope, for example `feat(api)!: ...`.
3. Show the planned commits: each message, its files, and its release effect (see Release effect below).
4. Wait for an explicit yes. Then commit through `/commit` on the current branch. No AI attribution or trailers.

### 8b: Pull request gate

1. Run `git fetch origin`, then `git log origin/main..HEAD --oneline`. This repo merges pull requests with a merge commit, so every commit on the branch lands on `main` exactly as written. Check each message against the Phase 8a format. If any is wrong, offer to reword it before pushing; do not push it as is.
2. Draft the pull request:
   - Title: conventional form, 70 characters or fewer. `lint-pr` checks it. It does not set the release version.
   - Body, in this order: `## Summary` (2-4 bullets), `## Verification` (each command run and its observed result), and `Refs #<number>` when an issue is in use. Use `Refs`, not `Closes`: the `close-released-issues` job reads this line to comment on and close the issue when the release ships (see After the pull request merges).
   - Write the body to `.claude/cache/feature-dev-pr-body.md` (local only, gitignored, overwritten each run). No AI attribution.
3. Show the title, body, and target (`main`). Wait for an explicit yes. The yes covers the push and the pull request.
4. Push and open the pull request:

   ```bash
   git push -u origin <branch>
   gh pr create --base main --head <branch> --title "<title>" --body-file .claude/cache/feature-dev-pr-body.md
   ```

5. Report the pull request URL. Leave the worktree in place (`ExitWorktree` with `action: "keep"`) so review fixes can go on the same branch.

### 8c: Issue comment gate

Runs only when an issue is in use, right after the pull request opens.

1. Draft a short comment for the issue in plain English:

   ```text
   Pull request opened: <pull-request URL>
   Branch: `<branch>`
   ```

2. Show the comment and wait for an explicit yes.
3. On yes, write the comment to `.claude/cache/feature-dev-issue-comment.md` (local only, gitignored, overwritten each run), then post it:

   ```bash
   gh issue comment <number> --repo <owner/repo> --body-file .claude/cache/feature-dev-issue-comment.md
   ```

4. Do not close the issue here. It closes when the release ships (`close-released-issues` job) or through `/close-issue`.

### Release effect

This repo releases through release-please. Merging a pull request into `main` updates a standing `chore(main): release X.Y.Z` pull request, and the user decides when to merge that one. This skill does not touch it. The version change comes from the commit types on the branch:

| Commit type | Release effect |
|---|---|
| `feat` | minor bump |
| `fix` | patch bump |
| `!` or `BREAKING CHANGE:` footer | major bump |
| `chore`, `docs`, `refactor`, `test`, `style`, and others | no bump on their own |

Report the highest effect among the branch commits, for example "Release effect: minor (contains feat commits)".

### After the pull request merges

Merging is done by the user on GitHub. Issues stay open between the feature merge and the release.

When the release PR is merged and the release is created, the `close-released-issues` job in `.github/workflows/release.yml` runs. For every PR in that release whose body has `Refs #n`, it comments on issue #n with the release version and link, then closes it if it is still open. Issues without `Refs` are untouched.

`/close-issue` is the manual path. Use it for an issue the job did not close, or when you want a written summary with verification before closing. This skill never closes issues itself.

## Hard rules

- No commit, push, pull request, or issue comment without its gate.
- No merging, force-pushing, or closing issues from this skill.
- No attribution lines or AI footers in commits or pull request bodies.
- Commit messages are final: this repo uses merge commits, so bad messages reach `main`. Fix them before pushing.
- When an issue is in use, the PR body must contain `Refs #<number>`. The `close-released-issues` job depends on it.
