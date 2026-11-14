// Run with: node --test .claude/hooks/*.test.mjs
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const guard = path.join(path.dirname(fileURLToPath(import.meta.url)), 'guard-write.mjs')
const base = path.join(os.tmpdir(), 'tydee-guard-write')
const project = path.join(base, 'proj')

function exitCodeFor(filePath, projectDir = project) {
  const result = spawnSync(process.execPath, [guard], {
    input: JSON.stringify({ tool_input: { file_path: filePath } }),
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir },
  })
  return result.status
}

const memoryDirFor = (dir) =>
  path.join(os.homedir(), '.claude', 'projects', dir.replace(/[^a-zA-Z0-9]/g, '-'), 'memory')

test('allows an ordinary source file', () => {
  assert.equal(exitCodeFor('src/app.ts'), 0)
})

test('blocks secrets, including .env.local', () => {
  assert.equal(exitCodeFor('.env'), 2)
  assert.equal(exitCodeFor('src/Web.Client/.env.local'), 2)
  assert.equal(exitCodeFor('src/Web.Api/appsettings.Development.json'), 2)
})

test('allows the example env file', () => {
  assert.equal(exitCodeFor('.env.example'), 0)
})

test('blocks key, certificate, and local appsettings files', () => {
  assert.equal(exitCodeFor('certs/server.pem'), 2)
  assert.equal(exitCodeFor('certs/server.key'), 2)
  assert.equal(exitCodeFor('src/Web.Api/appsettings.Staging.local.json'), 2)
})

test('blocks generated output directories inside the project', () => {
  assert.equal(exitCodeFor('src/Web.Api/bin/x.dll'), 2)
  assert.equal(exitCodeFor('src/Web.Client/.next/cache.json'), 2)
})

test('allows a file named bin, which is not a directory', () => {
  assert.equal(exitCodeFor('src/bin.ts'), 0)
})

test('allows writes when the project itself lives under a folder named bin', () => {
  assert.equal(exitCodeFor('src/a.ts', path.join(base, 'bin', 'proj')), 0)
})

test('blocks writes outside the project', () => {
  assert.equal(exitCodeFor('../outside.txt'), 2)
})

test('blocks writes to an absolute path on another drive', { skip: process.platform !== 'win32' }, () => {
  assert.equal(exitCodeFor('D:\\elsewhere\\x.txt'), 2)
})

test('allows a plan file in the Claude plans directory', () => {
  assert.equal(exitCodeFor(path.join(os.homedir(), '.claude', 'plans', 'x.md')), 0)
})

test('allows the main checkout memory from a worktree session', () => {
  const worktree = path.join(base, '.claude', 'worktrees', 'chore+48-example')
  const mainMemory = path.join(memoryDirFor(base), 'MEMORY.md')
  assert.equal(exitCodeFor(mainMemory, worktree), 0)
})
