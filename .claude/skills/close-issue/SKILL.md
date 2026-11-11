---
name: close-issue
description: Close a GitHub issue in this repository after the fix has landed, with a short summary comment and commit or pull-request references. Use when the user says "close issue #30", "close this issue", "mark it fixed", "comment and close", "close and resolve the issue", or after feature work when the tracked issue should be closed. This skill comments and closes; use create-issue for new issues.
---

# Close Issue

Close one GitHub issue only after its fix is merged and verified. Show the exact comment and close reason first, then post and close after the user confirms.

## Step 1: Preconditions

1. Resolve the repository from `git remote get-url origin` (normally `diazjhozua/tydee`). Use its owner/repo in every command.
2. Run `gh auth status`. If `gh` is missing or `github.com` is not logged in, stop and tell the user to run `gh auth login`. Change nothing.
3. Confirm the target is an issue, not a pull request. Issues and pull requests share numbering, and `gh pr view` can be unreliable here, so ask the API directly:

   ```bash
   gh api repos/<owner>/<repo>/issues/<number> --jq '.pull_request // empty'
   ```

   Non-empty output means it is a pull request; stop and say so.

## Step 2: Resolve the issue

- Accept a number, URL, or title from the user.
- If the message names no issue, use the issue discussed in this session. If that is ambiguous or missing, ask for the number and stop.
- Run `gh issue view <number> --repo <owner/repo> --json number,title,state,stateReason,url,labels`.
- If the issue is already closed, report its state and stop. Do not add a second closing comment.
- If the issue is closed as not planned but the user wants it reopened, that is out of scope; say so.

## Step 3: Confirm the fix landed

Closing is outward-facing. Do not close on the strength of local edits alone.

1. Identify the commits or pull request that fixed it from this session, the user's message, or recent history (`git log --oneline -20`). Do not invent hashes.
2. Confirm the fix is on the remote default branch:
   - `git fetch origin`
   - `git merge-base --is-ancestor <sha> origin/main` for each cited commit, or
   - a merged pull request: `gh pr view <pr-number> --repo <owner/repo> --json state,mergedAt,url`.
   - If the merge squashed the commits, the original SHAs will not be ancestors. In that case find the merged pull request (`gh pr list --repo <owner/repo> --state merged --search "<issue number>"`) and cite that instead.
3. If the fix is only local or sits on an unmerged branch, stop and tell the user what is missing. Do not push or merge from this skill.
4. Use verification that already ran in this session. If none ran, run the `verify` skill at the cheapest tier that covers the change (fast for docs or a narrow client edit, standard for code) or ask the user to accept the risk of closing unverified. Never claim a test result that was not observed.

## Step 4: Draft the comment

Write for the person who filed the issue: what changed, where it landed, and how it was checked. Keep it short and concrete. Do not include AI attribution, tool names, or a restatement of the issue body.

Use this shape:

```markdown
Fixed in <pull-request link or short-sha>.

## What changed
- ...
- ...

## Verification
- `<command>`: <observed result>
- `<command>`: <observed result>
```

Rules:

- Cite only commits or pull requests that are part of the fix.
- Prefer one merged pull-request link. Without a pull request, cite up to three key commits; for a longer series, cite the first and last with `..` or a short list instead of every hash.
- Summarize behavior, not file names, unless a file is the useful reference.
- Include the verification commands and their real results. Omit a line rather than guess.
- If the user supplied wording, use it as the base and only tighten grammar.
- If the change has a breaking or migration note, include it under `## Notes`.

## Step 5: Preview and confirm

Show the exact preview and wait for an explicit yes. A request to close before this point still goes through the preview; the user is confirming the preview instead.

```text
Issue: #30 Add dedicated expense logging page and default page preference
State: OPEN
Close reason: completed

Comment:
---
<exact comment>
---

Command:
gh issue comment 30 --repo diazjhozua/tydee --body-file .claude/cache/close-issue-comment.md
gh issue close 30 --repo diazjhozua/tydee --reason completed
```

Close reason is `completed` unless the user explicitly says the work will not be done, in which case use `not planned`. Create nothing and post nothing without a yes.

## Step 6: Post and close

Write the approved comment to `.claude/cache/close-issue-comment.md` (local only, gitignored, overwritten each run), then post and close separately:

```bash
gh issue comment <number> --repo <owner/repo> --body-file .claude/cache/close-issue-comment.md
gh issue close <number> --repo <owner/repo> --reason completed
```

Posting the comment first means a failed close leaves a useful record instead of a silent close. If the comment succeeds and the close fails, report the exact error and retry only the close after the user agrees.

## Step 7: Verify and report

Run `gh issue view <number> --repo <owner/repo> --json state,stateReason` and confirm `CLOSED` with the expected reason. Reply with:

```text
Closed #30 (completed): https://github.com/diazjhozua/tydee/issues/30
```

If the state did not change, report that instead of claiming success.

## Guardrails

- One issue per run. If the user names several, ask which one first.
- Never close a pull request, a discussion, or an issue in another repository.
- Never edit labels, type, assignees, milestones, or the issue body.
- Never reopen a closed issue from this skill.
- Never close when verification failed or when the fix is not on the remote default branch.
- The comment is public. Do not include secrets, tokens, local paths, customer data, or internal URLs.
