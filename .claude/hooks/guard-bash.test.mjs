// Run with: node --test .claude/hooks/guard-bash.test.mjs
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
