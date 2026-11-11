#!/usr/bin/env node
// Stop hook for local development: run the fast verification tier when the
// working tree has changes, so a broken build is reported before the turn ends.
// Each step runs only when a file it checks has changed, the steps run in
// parallel, and a step that already passed on identical inputs is skipped.
// This script only runs the repository's own npm and dotnet build commands.

import { spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const PROJECT_DIR = path.resolve(process.env.CLAUDE_PROJECT_DIR ?? process.cwd())
// Local-only cache (.claude/cache/ is gitignored); losing it only costs time.
const CACHE_FILE = path.join(PROJECT_DIR, '.claude', 'cache', 'verify-stop.json')

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

function tail(output) {
  return output.trim().split('\n').slice(-30).join('\n')
}

function runStep(step) {
  return new Promise((resolve) => {
    const label = [step.file, ...step.args].join(' ')
    const child = spawn(step.file, step.args, {
      cwd: PROJECT_DIR,
      shell: true,
      windowsHide: true,
    })
    let output = ''
    child.stdout.on('data', (chunk) => (output += chunk))
    child.stderr.on('data', (chunk) => (output += chunk))

    const timer = setTimeout(() => child.kill(), step.timeout)
    child.on('error', (error) => {
      clearTimeout(timer)
      resolve({ label, output: String(error) })
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      resolve(code === 0 ? null : { label, output: tail(output) })
    })
  })
}

function readCache() {
  try {
    return JSON.parse(readFileSync(CACHE_FILE, 'utf8'))
  } catch {
    return {}
  }
}

function writeCache(cache) {
  try {
    mkdirSync(path.dirname(CACHE_FILE), { recursive: true })
    writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2))
  } catch {
    // A failed cache write must never fail the turn.
  }
}

// The key covers HEAD (so a commit or pull invalidates it) plus the content of
// every changed file the step reads. Lockfiles and central package versions are
// inputs too: a dependency bump is a change even when no source file moved.
// node_modules and the NuGet cache are not hashed; delete the cache after
// installing packages by hand outside a lockfile change.
function fingerprint(head, step) {
  const hash = createHash('sha256').update(`${head}\n${step.label}`)
  for (const file of step.files) {
    let content = 'deleted'
    try {
      content = createHash('sha256').update(readFileSync(path.join(PROJECT_DIR, file))).digest('hex')
    } catch {
      // Deleted or renamed away: the empty marker is the content.
    }
    hash.update(`\n${file}\0${content}`)
  }
  return hash.digest('hex')
}

const input = await readInput()

// Claude is already continuing because of this hook: do not loop.
if (input?.stop_hook_active === true) {
  process.exit(0)
}

if (process.env.CLAUDE_SKIP_VERIFY === '1') {
  process.exit(0)
}

const status = spawnSync('git', ['status', '--porcelain', '-uall'], {
  cwd: PROJECT_DIR,
  encoding: 'utf8',
  timeout: 15_000,
})

if (status.status !== 0 || (status.stdout ?? '').trim() === '') {
  process.exit(0)
}

// Porcelain lines are "XY path" or "XY old -> new". Both sides of a rename
// count as changed, and -uall lists untracked files one by one so a new folder
// cannot hide a changed source file.
const changed = status.stdout
  .split('\n')
  .filter(Boolean)
  .flatMap((line) => line.slice(3).split(' -> '))
  .map((p) => p.replace(/^"|"$/g, '').replace(/\\/g, '/'))

const head = spawnSync('git', ['rev-parse', 'HEAD'], {
  cwd: PROJECT_DIR,
  encoding: 'utf8',
  timeout: 15_000,
}).stdout?.trim() ?? ''

const clientFiles = changed.filter((p) =>
  /^src\/Web\.Client\/.*\.(ts|tsx|js|jsx|mjs|mts)$/.test(p) ||
  /^src\/Web\.Client\/(package\.json|package-lock\.json|tsconfig\.json|eslint\.config\.\w+|next\.config\.\w+)$/.test(p),
)
const dotnetFiles = changed.filter((p) =>
  /\.(cs|csproj|props|targets|slnx)$/.test(p),
)

// Windows cold runs are slow: tsc takes over 120s and lint measured 59.5s
// against the old 60s budget, so give each step real headroom.
const candidates = [
  {
    label: 'npm --prefix src/Web.Client run typecheck',
    file: 'npm',
    args: ['--prefix', 'src/Web.Client', 'run', 'typecheck'],
    timeout: 180_000,
    files: clientFiles,
  },
  {
    label: 'npm --prefix src/Web.Client run lint',
    file: 'npm',
    args: ['--prefix', 'src/Web.Client', 'run', 'lint'],
    timeout: 120_000,
    files: clientFiles,
  },
  {
    label: 'dotnet build tydee.slnx',
    file: 'dotnet',
    args: ['build', 'tydee.slnx'],
    timeout: 240_000,
    files: dotnetFiles,
  },
].filter((step) => step.files.length > 0)

if (candidates.length === 0) {
  process.exit(0)
}

const cache = readCache()
const pending = candidates
  .map((step) => ({ ...step, key: fingerprint(head, step) }))
  .filter((step) => cache[step.label] !== step.key)

const results = await Promise.all(pending.map(runStep))

const failures = []
pending.forEach((step, index) => {
  if (results[index]) {
    delete cache[step.label]
    failures.push(results[index])
  } else {
    cache[step.label] = step.key
  }
})
writeCache(cache)

if (failures.length > 0) {
  for (const failure of failures) {
    process.stderr.write(`Stop verification failed: ${failure.label}\n${failure.output}\n`)
  }
  process.stderr.write(
    'Fix the failure, or set CLAUDE_SKIP_VERIFY=1 if it is unrelated to this change.\n',
  )
  process.exit(2)
}

process.exit(0)
