// Run with: node --test .claude/hooks/guard-commit.test.mjs
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
