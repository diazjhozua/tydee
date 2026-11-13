---
name: create-issue
description: Create a GitHub issue in this repository as a bug, feature, or task. Use when the user says "file a bug", "open an issue", "create a task", or describes work worth tracking.
---

# Create Issue

Turn a request into one well-formed GitHub issue. Verify the claim against the codebase, check for duplicates, show the draft, and create only after the user confirms.

This skill only creates issues. It never sets milestones, closes, edits, links pull requests, or comments on an existing issue. To comment on and close a resolved issue, use the `close-issue` skill.

## Step 1: Preconditions

1. Resolve the repository from `git remote get-url origin` (normally `diazjhozua/tydee`). Use its owner/repo for every command below.
2. Run `gh auth status`. If `gh` is missing or `github.com` is not logged in, stop and tell the user to run `gh auth login`. Create nothing.

## Step 2: Parse the request

Extract from the user's message and the session context:

- What happened, or what is wanted.
- The affected route, screen, file, or area.
- Reproduction detail already present (error text, request, screenshot path).

Do not invent facts. If a template field cannot be inferred, ask for it in Step 4.

## Step 3: Classify

Choose one type and state it with a one-line reason:

- **bug** — something that should work does not.
- **feature** — a capability that does not exist yet.
- **task** — internal work that is neither a defect nor user-facing behavior.

Example: `Type: bug — the page renders correctly but the persisted choice is ignored on reload.`

The user may override with one word. If the request genuinely fits two types, ask once.

## Step 4: Fill gaps

Ask one round of numbered questions, at most four, covering only what the chosen template needs and the request does not supply. For a bug that is usually: route, expected behavior, actual behavior, browser/device.

If the user declines or says "whatever", keep the field with `_Not captured_`. Never guess versions, steps, or environment details.

## Step 5: Verify against the codebase

Run this step for every issue unless the user says "skip verification". When skipped, the preview must say `Verification: skipped by request`.

Launch one `code-explorer` agent (read-only) with a prompt in this shape:

> In this repository, determine whether `<feature>` already exists, or whether `<bug>` is real. Return a verdict of EXISTS, PARTIAL, ABSENT, or UNCLEAR, and cite `file:line` evidence for each claim. Do not modify anything.

Route by verdict:

| Verdict | Action |
|---|---|
| Feature EXISTS | Stop. Show the evidence and offer: abort, refile as a gap in the existing feature, or refile as a bug if it is broken. |
| Feature PARTIAL | Continue, narrow the issue to the missing part, cite the existing code. |
| Feature ABSENT | Continue. |
| Bug CONFIRMED | Continue, cite `file:line`. |
| Bug NOT CONFIRMED | Stop. Ask whether it is environment-specific, whether to file anyway with a "not reproduced in code" note, or whether to abort. |
| Task already done | Stop and show where. |
| UNCLEAR | Continue and note that verification was inconclusive. |

If the agent returns nothing usable, fall back to a direct `Grep`/`Glob` search before deciding.

## Step 6: Check for duplicates

Derive three to five keywords from the draft title, then run:

```bash
gh issue list --repo <owner/repo> --state all --search "<keywords>" --limit 10
gh search issues --repo <owner/repo> "<keywords>" --limit 10
```

Show any match as `#12 title (open)`. If something is close, ask whether to continue, abort, or open the existing issue instead. This skill does not comment on existing issues; give the URL for manual follow-up.

## Step 7: Preview and confirm

Show the exact draft and wait for an explicit yes. "Just create it" before this point still routes through the preview; the user confirms the preview instead.

```text
Title: Dashboard grid view resets after reload
Type: bug
Labels: bug

---
## Summary
...
## Verification
- `src/Web.Client/app/(app)/app/page.tsx:88` — view resolved from the store without a mounted guard
---
```

Create nothing without a yes.

## Step 8: Create

Choose the body file path once per run: `.claude/cache/create-issue-body-<YYYYMMDD-HHMMSS>-<4 random chars>.md`, for example `.claude/cache/create-issue-body-20261113-055510-a7f3.md`. Use that exact string for the write, the `gh issue create` call, and the delete. A new run gets a new name, so concurrent runs cannot overwrite each other's body. The folder is local only and gitignored. Write the body to that path, then:

```bash
gh issue create --repo <owner/repo> \
  --title "<title>" \
  --body-file <the path chosen above> \
  --label <label> \
  --assignee "@me"
```

Omit `--label` for tasks. Always assign the issue to the person who asked, through `--assignee "@me"`.

After `gh issue create` succeeds, delete that path (only that file). If the create fails, keep the file. A retry of the same issue reuses the kept path; only a new run picks a new name.

Then set the GitHub issue type. Labels do not populate this field; the repository defines `Task`, `Bug`, and `Feature` as issue types.

```bash
gh api graphql -f query='{ repository(owner: "<owner>", name: "<repo>") { issueTypes(first: 20) { nodes { id name } } } }'
gh api repos/<owner>/<repo>/issues/<number> --jq .node_id
gh api graphql -f query='mutation { updateIssueIssueType(input: { issueId: "<node-id>", issueTypeId: "<type-id>" }) { issue { number } } }'
```

Map the type to the repository's issue type by name: bug to `Bug`, feature to `Feature`, task to `Task`. Inline the IDs; do not use GraphQL variables, because a `$` inside the query trips the Bash guard. If the repository has no matching issue type, skip this step and say so.

Do not pass `--milestone` or `--project`.

If creation fails, quote the shortest decisive error line and keep the draft. Do not retry blindly. If the label does not exist on the repository, create the issue without it and say so.

## Step 9: Report

Reply with the issue number and URL only:

```text
Created #13: https://github.com/diazjhozua/tydee/issues/13
```

## Title rules

- Imperative, sentence case, specific.
- 72 characters or fewer, no trailing period.
- No type prefix; the label carries the type.
- Name the behavior, not the code: `Dashboard grid view resets after reload`, not `Bug in dashboardViewStore`.

## Body templates

Use these headings exactly. Keep prose short and concrete.

### Bug

```markdown
## Summary
One or two sentences on what is wrong.

## Steps to reproduce
1. ...
2. ...

## Expected
...

## Actual
...

## Environment
- Route: `/app`
- Browser/device: ...
- Version: ...

## Verification
- `path:line` — what the code shows.
```

### Feature

```markdown
## Problem
What is missing or painful today.

## Proposed behavior
What should happen instead.

## Out of scope
What this issue deliberately does not cover.

## Verification
- `path:line` — what exists today.
```

### Task

```markdown
## Goal
...

## Steps
- [ ] ...

## Done when
- [ ] ...

## Verification
- `path:line` — relevant existing code.
```

Omit `## Verification` when the verdict is UNCLEAR or verification was skipped. Use one to three bullets, `path:line` plus one clause. Never paste code blocks or long excerpts.

## Labels

| Type | Label |
|---|---|
| bug | `bug` |
| feature | `enhancement` |
| task | none |
| documentation-only change | `documentation` |

Do not create new labels.

## Hard rules

- No issue without the preview and an explicit yes.
- No invented facts, versions, reproduction steps, or environment details.
- No secrets, tokens, environment values, raw logs, or personal data. Redact paths or emails when they are not essential.
- No AI attribution or "Generated with" text.
- Issue prose is normal English, not compressed.
