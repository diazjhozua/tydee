#!/usr/bin/env node
// PreToolUse guard for git commit messages. Exit 2 blocks the call and reports to Claude.

import { commitOptions, gitInvocations } from './lib/git.mjs'

const TYPES = 'feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert'
const HEADER = new RegExp(`^(${TYPES})(\\([a-z0-9][a-z0-9._-]*\\))?!?: [a-z0-9][^\\n]*$`)
const MAX_HEADER = 72

const BLOCKED_FLAG =
  /^(--no-verify|--signoff|--trailer|--fixup|--squash|--reuse-message|--reedit-message|--template|--edit)$|^--(trailer|fixup|squash|template|reuse-message|reedit-message)=/
// Short clusters that carry -n (no-verify), -s (signoff), -e (edit), -t (template), -c, or -C.
const BLOCKED_SHORT = /^-[a-zA-Z]*[nsectC][a-zA-Z]*$/

const BLOCK_MESSAGE = (reason) =>
  `Blocked by .claude/hooks/guard-commit.mjs: ${reason}\n` +
  'Expected: <type>[(<scope>)][!]: <lowercase imperative description>\n' +
  `Types: ${TYPES.replaceAll('|', ', ')}\n` +
  'Use the /commit skill; do not work around this guard.'

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

function block(reason) {
  process.stderr.write(BLOCK_MESSAGE(reason) + '\n')
  process.exit(2)
}

function validate(args) {
  const { messages, flags, usesFile } = commitOptions(args)
  const has = (flag) => flags.includes(flag)

  if (has('--dry-run') || has('--help') || has('-h')) {
    return null
  }

  const blocked = flags.filter((f) => BLOCKED_FLAG.test(f) || BLOCKED_SHORT.test(f))
  if (blocked.length > 0) {
    return `flags that can add trailers or skip checks are not allowed: ${blocked.join(', ')}.`
  }

  if (usesFile) {
    return 'commit messages must be passed with -m, not read from a file.'
  }

  if (messages.length === 0) {
    return has('--amend') && has('--no-edit')
      ? null
      : 'no commit message found; pass -m "<type>: <description>" or use --amend --no-edit.'
  }

  // A single-quoted $( or backtick is literal text; only words the shell would expand are blocked.
  if (messages.some((m) => m.expandable && /\$\(|`|\$\{/.test(m.value))) {
    return 'command substitution is not allowed inside a commit message.'
  }

  const message = messages.map((m) => m.value).join('\n\n')
  const header = message.split('\n')[0].trim()

  if (!HEADER.test(header)) {
    return `"${header}" does not match Conventional Commits grammar.`
  }

  if ([...header].length > MAX_HEADER) {
    return `header is ${[...header].length} characters; the limit is ${MAX_HEADER}.`
  }

  if (header.endsWith('.')) {
    return 'the description must not end with a period.'
  }

  if (
    /co-authored-by\s*:/i.test(message) ||
    /generated with/i.test(message) ||
    /noreply@anthropic\.com/i.test(message) ||
    message.includes('🤖')
  ) {
    return 'attribution trailers are not allowed in this repository.'
  }

  if (/^breaking[- ]change\s*:/m.test(message)) {
    return 'BREAKING CHANGE must be uppercase.'
  }

  return null
}

const input = await readInput()
const command = String(input?.tool_input?.command ?? '')

if (!command) {
  process.exit(0)
}

for (const { subcommand, args } of gitInvocations(command)) {
  if (subcommand !== 'commit') {
    continue
  }
  const reason = validate(args)
  if (reason) {
    block(reason)
  }
}

process.exit(0)
