// Run with: node --test .claude/hooks/*.test.mjs
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const guard = path.join(path.dirname(fileURLToPath(import.meta.url)), 'guard-commit.mjs')

function exitCodeFor(command) {
  const result = spawnSync(process.execPath, [guard], {
    input: JSON.stringify({ tool_input: { command } }),
    encoding: 'utf8',
  })
  return result.status
}

test('allows a conforming commit chained with a piped command that has -n flags', () => {
  assert.equal(exitCodeFor('git commit -m "feat(x): add y" && git push origin b 2>&1 | tail -n 2'), 0)
})

test('blocks a commit that skips hooks', () => {
  assert.equal(exitCodeFor('git commit --no-verify -m "feat: x"'), 2)
})

test('blocks a non-conforming commit message', () => {
  assert.equal(exitCodeFor('git commit -m "Update stuff"'), 2)
})

test('blocks a skip-hooks flag on a second commit in the same command', () => {
  assert.equal(exitCodeFor('git commit -m "feat: x" && git commit --no-verify -m "feat: y"'), 2)
})

test('keeps a separator inside a quoted message in the same clause', () => {
  assert.equal(exitCodeFor('git commit -m "feat: x && y"'), 0)
})

test('allows -n inside a message without treating it as a flag', () => {
  assert.equal(exitCodeFor('git commit -m "feat: drop -n alias"'), 0)
})

test('allows a backtick inside a single-quoted message', () => {
  assert.equal(exitCodeFor("git commit -m 'fix: use `x` helper'"), 0)
})

test('blocks command substitution inside a double-quoted message', () => {
  assert.equal(exitCodeFor('git commit -m "fix: run $(whoami)"'), 2)
})

test('blocks -n as a flag cluster on a commit', () => {
  assert.equal(exitCodeFor('git commit -nm "feat: x"'), 2)
})

test('blocks a commit whose command word is quoted and skips hooks', () => {
  assert.equal(exitCodeFor('git "commit" --no-verify -m "feat: x"'), 2)
})

test('blocks a commit run through sh -c with a non-conforming message', () => {
  assert.equal(exitCodeFor('sh -c "git commit -m \'Update stuff\'"'), 2)
})

test('reads the commit after git global options', () => {
  assert.equal(exitCodeFor('git -C sub commit -m "feat: x"'), 0)
  assert.equal(exitCodeFor('git -C sub commit -m "Update stuff"'), 2)
})

test('ignores git log', () => {
  assert.equal(exitCodeFor('git log -n 5'), 0)
})

test('validates a commit hidden behind a reserved word', () => {
  assert.equal(exitCodeFor('if true; then git commit -m "Update stuff"; fi'), 2)
})

test('validates a commit after a prefix wrapper with an option value', () => {
  assert.equal(exitCodeFor('sudo -u root git commit -m "Update stuff"'), 2)
})
