// Run with: node --test .claude/hooks/*.test.mjs
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const guard = path.join(path.dirname(fileURLToPath(import.meta.url)), 'guard-bash.mjs')

function exitCodeFor(command, projectDir) {
  const result = spawnSync(process.execPath, [guard], {
    input: JSON.stringify({ tool_input: { command } }),
    encoding: 'utf8',
    env: projectDir ? { ...process.env, CLAUDE_PROJECT_DIR: projectDir } : process.env,
  })
  return result.status
}

// Runs the guard against a temporary worktree. `linked` makes its src/Web.Client/node_modules a junction.
function exitCodeInWorktree(command, linked) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'guard-worktree-'))
  const client = path.join(root, 'src', 'Web.Client')
  fs.mkdirSync(client, { recursive: true })
  const modules = path.join(client, 'node_modules')
  if (linked) {
    const shared = path.join(root, 'shared-node_modules')
    fs.mkdirSync(shared)
    fs.symlinkSync(shared, modules, 'junction')
  } else {
    fs.mkdirSync(modules)
  }
  try {
    return exitCodeFor(command, root)
  } finally {
    if (linked) {
      fs.rmdirSync(modules)
    }
    fs.rmSync(root, { recursive: true, force: true })
  }
}

test('allows a quoted glob-looking string that is a whole word', () => {
  assert.equal(exitCodeFor('f(g("[role]"))'), 0)
})

test('blocks a live glob in a command word', () => {
  assert.equal(exitCodeFor('*.sh --help'), 2)
})

test('blocks an expansion inside a quoted word', () => {
  assert.equal(exitCodeFor('f(g("$HOME"))'), 2)
})

test('blocks a glob hidden between paired quotes in a shell wrapper', () => {
  // The inner shell sees `r[m] -rf ~` after the outer shell strips quotes.
  assert.equal(exitCodeFor('sh -c "r[m]"" -rf ~"'), 2)
})

test('blocks a glob glued to other text in a shell wrapper argument', () => {
  assert.equal(exitCodeFor('sh -c "r[m] -rf x"'), 2)
})

test('allows the test builtin as a command word', () => {
  assert.equal(exitCodeFor('[ -f x ] && cat x'), 0)
})

test('blocks a parameter expansion used as a command word', () => {
  assert.equal(exitCodeFor('${CMD} -rf x'), 2)
})

// Commit hooks: flags are read from decoded words, so message text is never a flag.
test('allows -n and --no-verify inside a commit message', () => {
  assert.equal(exitCodeFor('git commit -m "fix: drop -n alias"'), 0)
  assert.equal(exitCodeFor('git commit -m "docs: explain --no-verify is blocked"'), 0)
})

test('blocks --no-verify and -n flags on a commit', () => {
  assert.equal(exitCodeFor('git commit --no-verify -m "feat: x"'), 2)
  assert.equal(exitCodeFor('git commit -nm "feat: x"'), 2)
})

test('blocks --no-verify when the command word is quoted', () => {
  assert.equal(exitCodeFor('git "commit" --no-verify -m "feat: x"'), 2)
})

// Push: only a force push or + refspec whose destination is main or master is blocked.
test('allows a force-with-lease push to a branch whose name contains main', () => {
  assert.equal(exitCodeFor('git push --force-with-lease origin fix/main-menu-overflow'), 0)
})

test('allows deleting a branch whose name contains main', () => {
  assert.equal(exitCodeFor('git push origin --delete fix/main-menu'), 0)
})

test('blocks force pushes to main in each refspec form', () => {
  assert.equal(exitCodeFor('git push --force origin main'), 2)
  assert.equal(exitCodeFor('git push -f origin HEAD:refs/heads/main'), 2)
  assert.equal(exitCodeFor('git push -f origin +main'), 2)
})

test('allows a plain push to main', () => {
  assert.equal(exitCodeFor('git push origin main'), 0)
})

// Staging: only the paths given to git add are checked, not text elsewhere in the command.
test('allows staging a file whose name contains a key extension in the middle', () => {
  assert.equal(exitCodeFor('git add docs/adr/0003-api.key-rotation.md'), 0)
})

test('allows a commit whose message mentions .env', () => {
  assert.equal(exitCodeFor('git add docs/setup.md && git commit -m "docs: explain .env setup"'), 0)
})

test('allows staging an example env file', () => {
  assert.equal(exitCodeFor('git add .env.example'), 0)
})

test('blocks staging secrets, including forms that used to pass', () => {
  assert.equal(exitCodeFor('git add .env'), 2)
  assert.equal(exitCodeFor('git add ./.env'), 2)
  assert.equal(exitCodeFor('git add src/Web.Client/.env.local'), 2)
  assert.equal(exitCodeFor('git add .claude/settings.local.json'), 2)
  assert.equal(exitCodeFor('git add .claude/plans/notes.md'), 2)
})

// Config: reads pass; writes to aliases or core.hookspath are blocked.
test('allows reading an alias', () => {
  assert.equal(exitCodeFor('git config --get alias.co'), 0)
})

test('blocks writing an alias or core.hookspath', () => {
  assert.equal(exitCodeFor('git config alias.co checkout'), 2)
  assert.equal(exitCodeFor('git config --unset core.hookspath'), 2)
})

// Wrapped commits: a shell wrapper around git commit is blocked, but unrelated pipelines are not.
test('blocks a commit run through sh -c', () => {
  assert.equal(exitCodeFor('sh -c "git commit --no-verify -m \'feat: x\'"'), 2)
})

test('allows a grep for xargs piped before a plain commit', () => {
  assert.equal(exitCodeFor('rg xargs src && git commit -m "fix: x"'), 0)
})

test('blocks secrets staged through a command substitution or backticks', () => {
  assert.equal(exitCodeFor('git add $(echo .env)'), 2)
  assert.equal(exitCodeFor('git add "$(echo .env)"'), 2)
  assert.equal(exitCodeFor('git add `echo .env`'), 2)
})

test('blocks a force push to main with a clustered -f flag', () => {
  assert.equal(exitCodeFor('git push -fu origin main'), 2)
  assert.equal(exitCodeFor('git push -uf origin HEAD:main'), 2)
})

test('blocks a command nested too deeply to check', () => {
  let command = 'rm -rf ~'
  for (let k = 0; k < 8; k++) {
    command = `echo $(${command})`
  }
  assert.equal(exitCodeFor(command), 2)
})

test('blocks a commit hidden behind a reserved word', () => {
  assert.equal(exitCodeFor('if true; then git commit --no-verify -m "feat: x"; fi'), 2)
})

test('allows an expansion used as a redirect target', () => {
  assert.equal(exitCodeFor('node run.mjs < "$f"'), 0)
  assert.equal(exitCodeFor('echo ok > "$LOG_FILE"'), 0)
  assert.equal(exitCodeFor('for f in a b; do node x.mjs < "$f"; done'), 0)
})

test('allows a file descriptor redirect before a pipe', () => {
  assert.equal(exitCodeFor('ls -la "$DIR" 2>&1 | grep -i x'), 0)
})

test('blocks an expansion used as a command word after a redirect', () => {
  assert.equal(exitCodeFor('> "$LOG_FILE" $CMD'), 2)
})

test('blocks a recursive delete hidden in a command substitution after a redirect', () => {
  assert.equal(exitCodeFor('echo x > $(rm -rf ~)'), 2)
})

test('blocks a dependency change while node_modules is a junction', () => {
  assert.equal(exitCodeInWorktree('npm --prefix src/Web.Client install lodash', true), 2)
  assert.equal(exitCodeInWorktree('npm --prefix src/Web.Client install', true), 2)
  assert.equal(exitCodeInWorktree('npm --prefix src/Web.Client uninstall lodash', true), 2)
  assert.equal(exitCodeInWorktree('npm --prefix src/Web.Client ci', true), 2)
})

test('allows npm scripts while node_modules is a junction', () => {
  assert.equal(exitCodeInWorktree('npm --prefix src/Web.Client run typecheck', true), 0)
  assert.equal(exitCodeInWorktree('npm --prefix src/Web.Client test', true), 0)
})

test('allows a dependency change when node_modules is a real folder', () => {
  assert.equal(exitCodeInWorktree('npm --prefix src/Web.Client install lodash', false), 0)
})

test('does not read a dependency change from a word inside a script name or argument', () => {
  assert.equal(exitCodeInWorktree('npm run remove-unused', true), 0)
  assert.equal(exitCodeInWorktree('npm run check -- update', true), 0)
})

test('blocks a dependency change that targets another folder', () => {
  assert.equal(exitCodeInWorktree('npm --prefix ../other-worktree/src/Web.Client install lodash', false), 2)
  assert.equal(exitCodeInWorktree('npm --prefix=/tmp/elsewhere install lodash', false), 2)
})

test('blocks a dependency change after a cd', () => {
  assert.equal(exitCodeInWorktree('cd src/Web.Client && npm install lodash', false), 2)
})
