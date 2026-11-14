// Run with: node --test .claude/hooks/*.test.mjs
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const guard = path.join(path.dirname(fileURLToPath(import.meta.url)), 'guard-bash.mjs')

function exitCodeFor(command) {
  const result = spawnSync(process.execPath, [guard], {
    input: JSON.stringify({ tool_input: { command } }),
    encoding: 'utf8',
  })
  return result.status
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
