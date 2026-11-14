#!/usr/bin/env node
// PreToolUse guard for Write/Edit. Exit 2 blocks the call and reports to Claude.

import os from 'node:os'
import path from 'node:path'

import { isSecretBasename } from './lib/secrets.mjs'

const PROJECT_DIR = path.resolve(process.env.CLAUDE_PROJECT_DIR ?? process.cwd())
const CLAUDE_HOME = path.resolve(os.homedir(), '.claude')
const PLANS_DIR = path.resolve(CLAUDE_HOME, 'plans')
// A worktree session (.claude/worktrees/<name>) shares the main checkout's memory directory.
const MAIN_PROJECT_DIR = PROJECT_DIR.replace(/[\\/]\.claude[\\/]worktrees[\\/][^\\/]+$/, '')
const memoryDirFor = (dir) => path.resolve(CLAUDE_HOME, 'projects', dir.replace(/[^a-zA-Z0-9]/g, '-'), 'memory')
const MEMORY_DIRS = [memoryDirFor(PROJECT_DIR), memoryDirFor(MAIN_PROJECT_DIR)]

function isInside(base, target) {
  const relative = path.relative(base, target)
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))
}

// Generated output and dependencies. Checked against directory names inside the project only,
// so a project that happens to live under a folder named bin still works.
const BLOCKED_DIRS = new Set(['bin', 'obj', 'node_modules', '.next', 'out', 'test-results', 'playwright-report'])

function readInput() {
  return new Promise((resolve) => {
    let raw = ''
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', (chunk) => (raw += chunk))
    process.stdin.on('end', () => {
      try {
        resolve(JSON.parse(raw || '{}'))
      } catch {
        resolve({})
      }
    })
  })
}

const input = await readInput()
const rawPath = String(input?.tool_input?.file_path ?? '')

if (!rawPath) {
  process.exit(0)
}

const absolute = path.resolve(PROJECT_DIR, rawPath)
const relative = path.relative(PROJECT_DIR, absolute).replace(/\\/g, '/')

const plansRelative = path.relative(PLANS_DIR, absolute)
const inPlans =
  plansRelative !== '' &&
  !plansRelative.startsWith('..') &&
  !path.isAbsolute(plansRelative) &&
  !plansRelative.includes(path.sep) &&
  path.extname(plansRelative) === '.md'
const harnessPath = inPlans || MEMORY_DIRS.some((dir) => isInside(dir, absolute))

const directories = relative.split('/').slice(0, -1)

const blocked =
  isSecretBasename(path.basename(absolute)) ||
  directories.some((dir) => BLOCKED_DIRS.has(dir)) ||
  (!harnessPath && !isInside(PROJECT_DIR, absolute))

if (blocked) {
  process.stderr.write(
    `Blocked by .claude/hooks/guard-write.mjs: refusing to write ${relative}.\n` +
      'Generated output, build artifacts, dependencies, and secrets are not edited directly.\n',
  )
  process.exit(2)
}

process.exit(0)
