---
name: cleanup-worktree
description: Remove a feature's git worktree and its local branch after the pull request has merged into main. Use when the user says "clean up the worktree for #48", "remove the worktree after merge", "delete the feature branch", or after a feature-dev pull request has merged. Refuses unmerged, locked, or dirty worktrees and never force-deletes a branch. This skill removes local state only; use close-issue to close an issue.
---

# Cleanup Worktree

Remove one feature worktree and its local branch once its pull request is merged. Show the preview first, then remove after the user confirms.

## Step 1: Find the target

1. Run `git worktree list --porcelain` from the main checkout. The first entry is the main checkout and is never a target.
2. Resolve the target from the argument: an issue number, a branch name, or a worktree path. Match the branch with `git branch --list` and the worktree by its `branch` line. Do not match on directory name; directories such as `chore+48-...` differ from branch names.
3. No match: report that nothing is left to clean up, and stop.
4. The target is the current directory: stop and tell the user to run this from the main checkout, or to leave the worktree first (`ExitWorktree` with `keep`).

## Step 2: Check each safety condition

Check every condition, then report all results before anything is removed.

1. **Merged.** `gh pr view <branch> --json number,state,mergedAt,url`. Continue only when `state` is `MERGED`. `OPEN` or `CLOSED` means stop and report. No pull request means stop and report.
2. **Not locked.** A `locked` line in the porcelain output means a live session holds the worktree. Stop and report the lock reason. Do not run `git worktree unlock`.
3. **Clean.** `git -C <path> status --porcelain` must print nothing. If it prints anything, stop and list the files. Remove the worktree anyway only if the user explicitly asks for a forced removal, and then use `--force` for that one removal.
4. **Branch merges cleanly.** `git branch -d` is the only branch delete. If git refuses, stop and report the refusal. Never fall back to `-D`.

## Step 3: Preview and wait for a yes

Show the exact commands and what they remove:

- Worktree path and branch name.
- Pull request number, URL, and merge time.
- Commands to run:
  - `git worktree remove <path>`
  - `git branch -d <branch>`

A remote branch is deleted only when the user asks for it. If they do, add `git push origin --delete <branch>` to the preview. Wait for an explicit yes. Approval of one step does not cover another.

## Step 4: Remove

1. Run `git worktree remove <path>` (add `--force` only for a forced removal the user confirmed).
2. Run `git branch -d <branch>`.
3. Run `git worktree list` and `git branch --list <branch>` to confirm both are gone.
4. Report what was removed, and anything skipped with its reason.

Do not use `ExitWorktree` with `remove` for worktrees made in another session. It only applies to worktrees created by `EnterWorktree` in this session.

## Hard rules

- Never delete a branch with `-D`, and never run `rm -rf` on a worktree directory.
- Never touch the main checkout or a locked worktree.
- Never delete a remote branch unless the user asks.
- Never remove a worktree whose pull request is not `MERGED`.
- Never close issues or change pull requests from this skill.
