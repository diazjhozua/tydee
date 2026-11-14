#!/usr/bin/env node
// PreToolUse guard for Bash commands. Exit 2 blocks the call and reports to Claude.

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import {
  addsSecretPath,
  commitOptions,
  gitInvocations,
  pushesProtectedBranch,
  wrapsGitCommit,
  writesProtectedConfig,
} from './lib/git.mjs'
import { commandName, findCommands, INTERPRETERS, OVERFLOW, usesInterpreter } from './lib/shell.mjs'

const BLOCK_MESSAGE = (reason) =>
  `Blocked by .claude/hooks/guard-bash.mjs: ${reason}\n` +
  'Ask the user before retrying; do not work around this guard.'

// Match a git subcommand after any global options, e.g. `git --no-pager commit`.
const gitRuns = (names) => new RegExp(`\\bgit\\b[^\\n;&|]*\\b(?:${names})\\b`)

const GIT_RESET = gitRuns('reset')
const GIT_DIFF = gitRuns('diff|log|difftool')

const isNoVerifyFlag = (flag) => flag === '--no-verify' || /^--no-v[a-z-]*$/.test(flag) || /^-[a-zA-Z]*n[a-zA-Z]*$/.test(flag)

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

function samePath(a, b) {
  return process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b
}

function isSameOrAncestor(candidate, target) {
  const from = process.platform === 'win32' ? candidate.toLowerCase() : candidate
  const to = process.platform === 'win32' ? target.toLowerCase() : target
  const relative = path.relative(from, to)
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))
}

function expandHome(target, home) {
  return target === '~' || target.startsWith('~/') ? path.join(home, target.slice(1)) : target
}

function splitSegments(command) {
  return command.replace(/["']/g, '').split(/\s*(?:&&|\|\||;|\n)\s*/)
}

const SHELL_WRAPPERS = new Set([
  '.',
  'ash',
  'bash',
  'busybox',
  'cmd',
  'csh',
  'dash',
  'eval',
  'fish',
  'ksh',
  'mksh',
  'powershell',
  'pwsh',
  'sh',
  'source',
  'tcsh',
  'zsh',
])

const PREFIX_WRAPPERS = new Set([
  'builtin',
  'command',
  'env',
  'exec',
  'ionice',
  'nice',
  'nohup',
  'parallel',
  'setsid',
  'stdbuf',
  'sudo',
  'time',
  'timeout',
  'xargs',
])

const ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/
// Arguments to shell/prefix wrappers: backslash is excluded so Windows paths such as
// `powershell -File scripts\x.ps1` pass. Escaped rm is still caught by the unescaped re-check in recursiveDeleteTargets.
// A word that is entirely one quoted string (e.g. `"[role]"` in a node -e snippet) is literal text,
// so its glob characters are not live. Any other word, including a quoted span glued to more shell
// text such as `"r[m]""`, keeps the full check. `$` and backticks always count: they expand inside
// double quotes.
function hasUnsafeWordChars(token) {
  if (/[$`]/.test(token)) {
    return true
  }
  const live = /^(?:"[^"]*"|'[^']*')$/.test(token) ? '' : token
  return /[*?[]/.test(live)
}
const SEGMENT_SEPARATOR = /\s*(?:&&|\|\||;|\n|\||&|\(|\)|\{|\}|<|>|\$\(|`)\s*/

function splitCommandSegments(command) {
  return command.split(SEGMENT_SEPARATOR)
}

// Inside quotes, shell separators are literal text (e.g. the regex in grep -E "^(a|b)$").
// Mask them before splitting so they do not create fragments that look like command words.
// Masking is only for splitting. Expansions such as `$(rm ...)` inside double quotes are still
// caught by the rm checks, which run on the raw command, not on the masked text.
// Backslash escapes are kept as-is outside single quotes.
const QUOTED_SEPARATOR = /[(){}|&;<>\n]/

function maskQuotedSeparators(command) {
  // ANSI-C quoting ($'...') honors backslash escapes inside single quotes, which this
  // scanner does not model, so a masked separator could hide a real one. Fail closed.
  if (command.includes("$'")) {
    return command
  }
  let out = ""
  let quote = null
  for (let i = 0; i < command.length; i++) {
    const ch = command[i]
    if (quote !== "'" && ch === "\\" && i + 1 < command.length) {
      out += ch + command[i + 1]
      i++
      continue
    }
    if (quote === null && (ch === "'" || ch === '"')) {
      quote = ch
      out += ch
      continue
    }
    if (quote === ch) {
      quote = null
      out += ch
      continue
    }
    out += quote !== null && QUOTED_SEPARATOR.test(ch) ? "_" : ch
  }
  return out
}

// Parameter expansions (`${p##*/}`) and `case` labels (`*)`, `repos/*/x)`) are not command words, but the
// splitter would turn their pieces into fake ones. Mask them for the command-word scan only. The `$` is
// kept, so `${CMD} -rf` still reads as an unsafe command word. The rm checks run on the raw command.
const PARAM_EXPANSION = /\$\{[^{}]*\}/g
// `$` and backtick are excluded so a line such as `$A$B)` still counts as a command word.
const CASE_LABEL = /(^|\n)([ \t]*)[^\s()'"`;&|<>$]+\)(?=[ \t\n]|$)/g

function maskNonCommandWords(command) {
  return command
    .replace(PARAM_EXPANSION, (match) => `$${'_'.repeat(match.length - 1)}`)
    .replace(CASE_LABEL, '$1$2')
}

// A redirect target (`< "$f"`, `> "$LOG"`, `2>&1`) is a file name, never a command word. Strip it
// before the command-word scan so the target is not read as the start of a segment. The target is
// a whole word (quoted spans included), so a command word after it (`> "$LOG" $CMD`) is still scanned.
// `(` is not part of a target, so a process or command substitution after a redirect is still split and scanned.
const REDIRECT_TARGET = /\d*[<>]{1,2}&?\s*(?=[^\s(])(?:"[^"\n]*"|'[^'\n]*'|[^\s"'`;&|()<>{}\n])+/g

function stripRedirectTargets(command) {
  return command.replace(REDIRECT_TARGET, ' ')
}

// A command word built from expansion, globbing, or escaping cannot be resolved statically.
function hasUnsafeCommandWord(command) {
  const masked = stripRedirectTargets(maskQuotedSeparators(maskNonCommandWords(command)))
  for (const segment of splitCommandSegments(masked)) {
    const tokens = segment.split(/\s+/).filter(Boolean)
    let index = 0
    while (index < tokens.length && ASSIGNMENT.test(tokens[index])) {
      index++
    }
    if (index >= tokens.length) {
      continue
    }

    const first = commandName(tokens[index])

    if ((first === 'rm' || first === 'find') && tokens.slice(index).some((token) => /[$`\\]/.test(token))) {
      return true
    }

    if (SHELL_WRAPPERS.has(first)) {
      if (tokens.slice(index + 1).some(hasUnsafeWordChars)) {
        return true
      }
      continue
    }

    if (PREFIX_WRAPPERS.has(first)) {
      if (tokens.slice(index + 1).some(hasUnsafeWordChars)) {
        return true
      }
      continue
    }

    // Backslashes are not checked here: printf escapes such as `\n` next to a
    // redirect produce a "command word" that is only text. Escaped `rm` is still
    // caught by the rm checks above and by the unescaped re-check in recursiveDeleteTargets.
    // `[` and `[[` are the test builtins, not globs, so `[ -f x ] && cat x` is not an unsafe command word.
    const isTestBuiltin = tokens[index] === '[' || tokens[index] === '[['
    if (!isTestBuiltin && hasUnsafeWordChars(tokens[index])) {
      return true
    }
  }

  return false
}

const RM_RECURSIVE_LONG = /^--r(e(c(u(r(s(i(v(e)?)?)?)?)?)?)?)?$/
const RM_SAFE_LONG = new Set([
  '--',
  '--dir',
  '--force',
  '--help',
  '--interactive',
  '--no-preserve-root',
  '--one-file-system',
  '--preserve-root',
  '--verbose',
  '--version',
])

function recursiveFlag(token) {
  if (!token.startsWith('-')) {
    return false
  }
  if (/^-[a-zA-Z]*r/i.test(token) || RM_RECURSIVE_LONG.test(token)) {
    return true
  }
  return token.startsWith('--') && !RM_SAFE_LONG.has(token)
}

// Text-level recursive rm check, used only as a fallback next to an interpreter or wrapper.
function textRecursiveRm(command) {
  return splitSegments(command).some((segment) => {
    const tokens = segment.split(/\s+/).filter(Boolean)
    const rmIndex = tokens.findIndex((token) => commandName(token).replace(/^[({$`]+/, '') === 'rm')
    if (rmIndex === -1) {
      return false
    }

    return tokens.slice(rmIndex + 1).some(recursiveFlag)
  })
}

// rm invocations found by the shell reader, including ones run by wrappers, eval, and substitutions.
// Text such as a grep pattern that contains "rm -rf" is not an invocation.
function rmInvocations(command) {
  return findCommands(command).filter((c) => c.name === 'rm')
}

// Argument values of each recursive rm invocation.
function recursiveRmArgs(command) {
  return rmInvocations(command)
    .map((c) => c.words.slice(1).map((w) => w.value))
    .filter((args) => args.some(recursiveFlag))
}

// find -delete and find -exec can remove files or run arbitrary commands. A find whose own arguments
// are expanded by the shell also fails closed.
function runsFindDelete(command) {
  return findCommands(command)
    .filter((c) => c.name === 'find')
    .some((c) => {
      const args = c.words.slice(1)
      return (
        args.some((w) => w.expandable) ||
        args.some((w) => /^-(delete|exec|execdir|ok|okdir|fprint|fprint0|fprintf|fls)$/.test(w.value))
      )
    })
}

// Resolve every recursive-delete target. Any directory change or shell wrapper fails closed.
function recursiveDeleteTargets(command, projectDir, home) {
  // A command word built from expansion, globbing, or escaping cannot be resolved statically.
  if (hasUnsafeCommandWord(command)) {
    return [{ resolved: null, cwd: projectDir }]
  }

  // Any rm invocation with an expansion ($ or backtick) fails closed. Text that only mentions rm
  // (a grep pattern, an echo) is not an invocation and does not.
  if (rmInvocations(command).length > 0 && /[$`]/.test(command)) {
    return [{ resolved: null, cwd: projectDir }]
  }

  const recursiveRms = recursiveRmArgs(command)
  if (recursiveRms.length === 0) {
    // The reader cannot follow every payload (powershell -Command, cmd /c, here-strings, pipes into
    // sh). When an interpreter or wrapper is present and the text names a recursive rm, fail closed.
    return usesInterpreter(command) && textRecursiveRm(command) ? [{ resolved: null, cwd: projectDir }] : []
  }

  const tokens = splitSegments(command).flatMap((segment) => segment.split(/\s+/).filter(Boolean))
  const directoryChange = tokens.some((token) => ['cd', 'pushd', 'popd'].includes(commandName(token)))
  const envChdir = tokens.some((token) => token === '-C' || token === '--chdir' || token.startsWith('--chdir='))
  const shellWrapper = tokens.some((token) => INTERPRETERS.has(commandName(token)))
  const grouped = /[(){}]/.test(command.replace(/["']/g, '')) || /\$\(/.test(command)
  const quotedSpace = /["'][^"']*\s[^"']*["']/.test(command)
  const escapedSpace = /\\\s/.test(command)
  const piped = /\|/.test(command)

  if (
    directoryChange ||
    envChdir ||
    /\bCDPATH\b/.test(command) ||
    shellWrapper ||
    grouped ||
    quotedSpace ||
    escapedSpace ||
    piped
  ) {
    return [{ resolved: null, cwd: projectDir }]
  }

  const targets = []
  for (const args of recursiveRms) {
    let positional = 0
    for (const token of args) {
      if (token.startsWith('-')) {
        continue
      }

      positional++
      const expanded = path.resolve(projectDir, expandHome(token, home))
      const wildcard = token.search(/[*?\[]/)
      const tildeDanger = token.startsWith('~') && token !== '~' && !token.startsWith('~/')
      const parentSegment = token.split(/[\\/]/).includes('..')
      let globDanger = false
      if (wildcard !== -1) {
        const prefix = path.resolve(projectDir, expandHome(token.slice(0, wildcard), home))
        globDanger = samePath(prefix, projectDir) || !isSameOrAncestor(projectDir, prefix) || parentSegment
      }

      targets.push({
        resolved: /[$`]/.test(token) || tildeDanger || globDanger ? null : expanded,
        cwd: projectDir,
      })
    }

    if (positional === 0) {
      return [{ resolved: null, cwd: projectDir }]
    }
  }

  return targets
}

const input = await readInput()
const command = String(input?.tool_input?.command ?? '')

if (!command) {
  process.exit(0)
}

// Strip quotes and backslashes so `"--out"put` cannot hide a flag from the checks below.
if (findCommands(command).some((c) => c.name === OVERFLOW)) {
  block('command nesting is too deep to check.')
}

const normalized = command.replace(/["'\\]/g, '')
const git = normalized

// Git flags are matched per shell clause (split on separators), so a flag that belongs to another
// tool in the same command is not read as a git flag. Example: `powershell -ExecutionPolicy ...`
// contains "-n" and used to block any command that also mentioned "git commit".
// Split the raw command with quoted separators masked first, so `git commit -m "R&D" --no-verify`
// keeps one clause. Quotes and backslashes are stripped after masking, as in `git` above.
const gitClauses = maskQuotedSeparators(command).replace(/["'\\]/g, '').split(/[\n;&|]+/)

if (
  gitInvocations(command).some(
    ({ subcommand, args }) => subcommand === 'commit' && commitOptions(args).flags.some(isNoVerifyFlag),
  )
) {
  block('skipping commit hooks is not allowed.')
}

if (gitInvocations(command).some(({ subcommand, args }) => subcommand === 'push' && pushesProtectedBranch(args))) {
  block('force-pushing to main/master is destructive.')
}

if (GIT_RESET.test(git) && /\s--hard\b/.test(git)) {
  block('`git reset --hard` discards uncommitted work.')
}

if (
  gitClauses.some(
    (clause) =>
      GIT_DIFF.test(clause) &&
      /(\s--outp[a-z-]*(=|\s|$)|\s--ext-diff\b|\s--extc[a-z]*\b|\s--exec\b|\s--textc[a-z]*\b|\s-c\s+\S+=|\s-x\s)/.test(clause),
  )
) {
  block('git diff/log/difftool flags can write files or execute external programs.')
}

if (
  /\bgit\b[^\n;&|]*\s-c\s*\S*(?:alias\.|core\.hookspath)/i.test(git) ||
  /\bgit\b[^\n;&|]*--config-env(?:=|\s)/i.test(git) ||
  /\bGIT_CONFIG_(?:COUNT|PARAMETERS|GLOBAL|SYSTEM|KEY_\d+|VALUE_\d+)\b/i.test(normalized) ||
  gitInvocations(command).some(({ subcommand, args }) => subcommand === 'config' && writesProtectedConfig(args))
) {
  block('git config overrides can hide commits or skip hooks.')
}

if (wrapsGitCommit(command)) {
  block('wrapped commit commands bypass message validation.')
}

if (/\bnpm\b[^\n]*\s--(script-shell|node-options|userconfig|globalconfig)\b/.test(normalized)) {
  block('npm config flags can execute arbitrary code.')
}

if (gitInvocations(command).some(({ subcommand, args }) => subcommand === 'add' && addsSecretPath(args))) {
  block('staging secrets or local resume data.')
}

const projectDir = path.resolve(process.env.CLAUDE_PROJECT_DIR ?? process.cwd())
const home = os.homedir()

// A worktree whose client node_modules is a junction shares the main checkout's copy. A dependency
// change there would rewrite packages for every session, so the worktree must drop the link and
// install into its own folder first. Other npm commands (run, test, typecheck) are not affected.
const NPM_DEPENDENCY_SUBCOMMANDS = new Set([
  'install', 'i', 'add', 'update', 'up', 'uninstall', 'un', 'remove', 'rm', 'ci', 'dedupe', 'prune',
])

function isLink(target) {
  try {
    return fs.lstatSync(target).isSymbolicLink()
  } catch {
    return false
  }
}

// Reads one shell clause that starts with npm: its subcommand (the first non-flag word) and any --prefix target.
function npmClause(clause) {
  const tokens = clause.trim().split(/\s+/).filter(Boolean)
  let index = 0
  while (index < tokens.length && ASSIGNMENT.test(tokens[index])) {
    index++
  }
  if (index >= tokens.length || !/^npm(\.cmd)?$/i.test(path.basename(tokens[index]))) {
    return null
  }
  let prefix = null
  for (let j = index + 1; j < tokens.length; j++) {
    const token = tokens[j]
    if (token === '--prefix') {
      prefix = tokens[j + 1] ?? ''
      j++
    } else if (token.startsWith('--prefix=')) {
      prefix = token.slice('--prefix='.length)
    } else if (!token.startsWith('-')) {
      return { subcommand: token, prefix }
    }
  }
  return { subcommand: null, prefix }
}

const npmClauses = maskQuotedSeparators(command).replace(/["'\\]/g, '').split(/[\n;&|()`]+/)
const npmChanges = npmClauses
  .map(npmClause)
  .filter((invocation) => invocation && NPM_DEPENDENCY_SUBCOMMANDS.has(invocation.subcommand))
const changesDirectory = npmClauses.some((clause) => ['cd', 'pushd'].includes(clause.trim().split(/\s+/)[0]))

if (npmChanges.length > 0) {
  if (isLink(path.join(projectDir, 'src', 'Web.Client', 'node_modules'))) {
    block(
      'node_modules is a junction into the main checkout; a dependency change would write to the shared copy. ' +
        'Remove only the link with `cmd /c rmdir src\\Web.Client\\node_modules` (no /S), then install in this worktree.',
    )
  }
  if (changesDirectory) {
    block('a cd before a dependency change cannot be checked. Run npm with --prefix from the worktree root.')
  }
  const outsideOrLinked = npmChanges.some(({ prefix }) => {
    const target = prefix ? path.resolve(projectDir, expandHome(prefix, home)) : projectDir
    return !isSameOrAncestor(projectDir, target) || isLink(path.join(target, 'node_modules'))
  })
  if (outsideOrLinked) {
    block('a dependency change must target this worktree, not another folder or a linked node_modules.')
  }
}

if (runsFindDelete(command)) {
  block('find can delete files or execute commands.')
}

const dangerousDelete = recursiveDeleteTargets(command, projectDir, home).some(({ resolved, cwd }) => {
  if (resolved === null) {
    return true
  }

  return (
    samePath(resolved, path.parse(resolved).root) ||
    isSameOrAncestor(resolved, home) ||
    isSameOrAncestor(resolved, projectDir) ||
    isSameOrAncestor(resolved, cwd)
  )
})

if (dangerousDelete) {
  block('recursive delete targeting the repo, home, a drive root, or their ancestors.')
}

process.exit(0)
