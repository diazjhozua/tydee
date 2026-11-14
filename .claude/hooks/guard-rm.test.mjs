// Run with: node --test .claude/hooks/*.test.mjs
// Recursive rm and find -delete are judged on real invocations, not on text that mentions them.
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

test('allows grep for an rm pattern in quoted text', () => {
  assert.equal(exitCodeFor('grep -rn "rm -rf" docs'), 0)
})

test('allows echo that mentions rm with a variable', () => {
  assert.equal(exitCodeFor('echo "rm: $HOME"'), 0)
})

test('allows grep for a find -delete pattern', () => {
  assert.equal(exitCodeFor('grep -rn "find . -delete" docs'), 0)
})

test('allows a plain find and a recursive rm inside the project', () => {
  assert.equal(exitCodeFor('find . -name "*.tmp"'), 0)
  assert.equal(exitCodeFor('rm -rf dist'), 0)
})

test('blocks a recursive rm of home through a pipe, group, or substitution', () => {
  assert.equal(exitCodeFor('echo x | rm -rf ~'), 2)
  assert.equal(exitCodeFor('(rm -rf ~)'), 2)
  assert.equal(exitCodeFor('echo "$(rm -rf ~)"'), 2)
})

test('blocks a recursive rm of root through a prefix wrapper', () => {
  assert.equal(exitCodeFor('sudo rm -rf /'), 2)
  assert.equal(exitCodeFor('xargs rm -rf'), 2)
})

test('blocks a recursive rm whose command word is quoted or escaped', () => {
  assert.equal(exitCodeFor('"rm" -rf ~'), 2)
  assert.equal(exitCodeFor('\\rm -rf ~'), 2)
})

test('blocks a recursive rm run by sh -c', () => {
  assert.equal(exitCodeFor('sh -c "rm -rf ~"'), 2)
})

test('blocks find that deletes or executes', () => {
  assert.equal(exitCodeFor('find . -name x -delete'), 2)
  assert.equal(exitCodeFor('find . -exec rm -rf {} +'), 2)
})

test('blocks find whose own argument is expanded by the shell', () => {
  assert.equal(exitCodeFor('find "$dir" -name x'), 2)
})

test('blocks a recursive rm behind a prefix wrapper with option values', () => {
  assert.equal(exitCodeFor('sudo -u root rm -rf ~'), 2)
  assert.equal(exitCodeFor('timeout -s KILL 5 rm -rf ~'), 2)
  assert.equal(exitCodeFor('echo ~ | xargs -I {} rm -rf {}'), 2)
})

test('blocks a recursive rm inside env -S', () => {
  assert.equal(exitCodeFor('env -S "rm -rf ~"'), 2)
  assert.equal(exitCodeFor('env -S "git push --force origin main"'), 2)
})

test('blocks a recursive rm behind reserved words', () => {
  assert.equal(exitCodeFor('if rm -rf ~; then :; fi'), 2)
  assert.equal(exitCodeFor('! rm -rf ~'), 2)
  assert.equal(exitCodeFor('for f in *; do rm -rf "$f"; done'), 2)
})

test('blocks a recursive rm written as text fed to an interpreter', () => {
  assert.equal(exitCodeFor("echo 'rm -rf ~' | sh"), 2)
  assert.equal(exitCodeFor("printf '%s' 'rm -rf ~' | bash"), 2)
  assert.equal(exitCodeFor('bash <<< "rm -rf ~"'), 2)
})

test('blocks a recursive rm run through another shell or wrapper', () => {
  assert.equal(exitCodeFor('powershell -Command "rm -r -fo C:\\Users\\jhozuad"'), 2)
  assert.equal(exitCodeFor('cmd /c "rm -rf ~"'), 2)
  assert.equal(exitCodeFor('parallel rm -rf ~ ::: x'), 2)
})

test('blocks a recursive rm after a comment that contains an apostrophe', () => {
  assert.equal(exitCodeFor("# don't\nrm -rf ~"), 2)
})
