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

// dotnet and docker arguments that run code or delete data. Prefix allow rules cannot exclude arguments
// that follow an allowed prefix, so each simple command's arguments are checked here.
const MSBUILD_SWITCH = /^(?:--?|\/)(?:p|property|logger|l|dl)(?:[:=]|$)/i
const TEST_CODE_FLAG = /^(?:--?|\/)(?:test-?adapter-?path|logger|settings|l|s)(?:[:=]|$)/i
// Expansion the shell reader does not resolve: $, backticks, and brace expansion such as {-p:X,}.
const UNRESOLVED_ARG = /[$`]|\{[^{}]*,[^{}]*\}/
// Command names that are not literal words, such as $DN or $(which dotnet).
const UNRESOLVED_NAME = /[$`(){}]/
const UNRESOLVED_REASON = 'dotnet and docker arguments that use shell expansion cannot be checked.'
const DOCKER_GLOBAL_VALUE_FLAGS = new Set([
  '-c', '--context', '-H', '--host', '--config', '-l', '--log-level', '--tlscacert', '--tlscert', '--tlskey',
])
const COMPOSE_GLOBAL_VALUE_FLAGS = new Set([
  '-f', '--file', '-p', '--project-name', '--profile', '--env-file', '--project-directory', '--ansi', '--progress', '--parallel',
])
const VOLUME_FLAG = (token) => token === '--volumes' || token.startsWith('--volumes=') || (/^-[a-z]+$/i.test(token) && /v/i.test(token))
const WRAPPER_SHELLS = new Set(['powershell', 'pwsh', 'cmd'])
// Raw text checks for wrapper shells and unresolved command names, which the shell reader does not resolve.
const RAW_COLON_SWITCH = /(?<![\w-])(?:--?|\/)(?:p|property|logger|l|dl)[:=]/i
const RAW_BARE_SWITCH = /(?<![\w-])(?:--?|\/)(?:p|property|logger|l|dl)(?=\s|$)/i
const RAW_TEST_FLAG = /(?<![\w-])(?:(?:--?|\/)(?:test-?adapter-?path|logger|settings)(?:[:=]|(?=\s|$))|(?:--?|\/)[ls](?=\s|$))/i
const DOTNET_VERB_RAW = /\b(?:build|test|vstest|run|restore|publish|pack|msbuild)\b/i
const DOCKER_DATA_RAW = /\bvolume\s+(?:rm|remove|prune)\b|\bsystem\s+prune\b[^\n;&|]*\s--volumes\b|\b(?:down|rm)\b[^\n;&|]*?(?:\s--volumes\b|\s-[a-z]*v[a-z]*(?=\s|$))/i

function dotnetSwitchReason(args) {
  // `dotnet ef -p` names a project, not an MSBuild property, so a bare -p is allowed there.
  const isEf = args[0] === 'ef'
  if (args.some((token) => MSBUILD_SWITCH.test(token) && !(isEf && /^(?:--?|\/)p$/i.test(token)))) {
    return 'dotnet MSBuild switches can run arbitrary commands during the build.'
  }
  if (args.some((token) => token === 'test' || token === 'vstest') && args.some((token) => TEST_CODE_FLAG.test(token))) {
    return 'dotnet test adapter, logger, and settings switches can load code from outside the repo.'
  }
  return null
}

// Handles `docker [globals] compose [globals] down|rm`, `docker [globals] volume rm`, and the legacy docker-compose binary.
function dockerDataReason(name, args) {
  let i = 0
  const skipFlags = (valueFlags) => {
    while (i < args.length && args[i].startsWith('-')) {
      i += valueFlags.has(args[i]) ? 2 : 1
    }
  }
  let group = name === 'docker-compose' ? 'compose' : undefined
  if (name === 'docker') {
    skipFlags(DOCKER_GLOBAL_VALUE_FLAGS)
    group = args[i++]
  }
  if (group === 'volume' && ['rm', 'remove', 'prune'].includes(args[i])) {
    return 'docker volume rm, remove, and prune delete volume data.'
  }
  if (group === 'system' && args[i] === 'prune' && args.slice(i + 1).some(VOLUME_FLAG)) {
    return 'docker system prune --volumes deletes volume data.'
  }
  if (group === 'compose') {
    skipFlags(COMPOSE_GLOBAL_VALUE_FLAGS)
    const sub = args[i]
    if ((sub === 'down' || sub === 'rm') && args.slice(i + 1).some(VOLUME_FLAG)) {
      return 'docker compose down or rm with --volumes deletes the Postgres volume.'
    }
  }
  return null
}

function rawDotnetReason(text) {
  if (RAW_COLON_SWITCH.test(text)) {
    return 'dotnet MSBuild switches can run arbitrary commands during the build.'
  }
  if (!/\bdotnet\s+ef\b/i.test(text) && RAW_BARE_SWITCH.test(text)) {
    return 'dotnet MSBuild switches can run arbitrary commands during the build.'
  }
  if (/\b(?:test|vstest)\b/i.test(text) && RAW_TEST_FLAG.test(text)) {
    return 'dotnet test adapter, logger, and settings switches can load code from outside the repo.'
  }
  return null
}

// Wrapper shells (powershell, pwsh, cmd) are not unwrapped by the shell reader, and command names such as $DN or
// $(which dotnet) cannot be resolved. Their text is checked directly.
function rawReason(command, parsed) {
  const wrapped = parsed.some((c) => WRAPPER_SHELLS.has(c.name))
  const unresolvedName = parsed.some((c) => c.name !== OVERFLOW && UNRESOLVED_NAME.test(c.name))
  if (!wrapped && !unresolvedName) {
    return null
  }
  const text = command.replace(/["'`^]/g, '')
  const mentionsDotnet = /\bdotnet(?:\.exe)?\b/i.test(text)
  const mentionsDocker = /\bdocker(?:-compose)?\b/i.test(text)
  if (mentionsDotnet || (unresolvedName && DOTNET_VERB_RAW.test(text))) {
    const reason = rawDotnetReason(text)
    if (reason) {
      return reason
    }
  }
  if ((mentionsDocker || unresolvedName) && DOCKER_DATA_RAW.test(text)) {
    return 'docker commands that delete volume data are blocked here.'
  }
  return null
}

function dotnetDockerReason(command, parsed) {
  for (const { name, words } of parsed) {
    if (name === OVERFLOW) {
      continue
    }
    const args = words.slice(1).map((w) => w.value)
    const unresolvedArgs = args.some((arg) => UNRESOLVED_ARG.test(arg))
    let reason = null
    if (name === 'dotnet') {
      reason = unresolvedArgs ? UNRESOLVED_REASON : dotnetSwitchReason(args)
    } else if (name === 'docker' || name === 'docker-compose') {
      reason = unresolvedArgs ? UNRESOLVED_REASON : dockerDataReason(name, args)
    }
    if (reason) {
      return reason
    }
  }
  return rawReason(command, parsed)
}

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

// The worktree that holds `dir`: the nearest folder with a .git entry (a file in a linked worktree, a folder in the
// main checkout). Falls back to `dir` when no .git is found.
function worktreeRootOf(dir) {
  for (let current = dir; ; current = path.dirname(current)) {
    if (fs.existsSync(path.join(current, '.git'))) {
      return current
    }
    if (path.dirname(current) === current) {
      return dir
    }
  }
}

function expandHome(target, home) {
  return target === '~' || target.startsWith('~/') ? path.join(home, target.slice(1)) : target
}

// Git Bash writes a Windows drive as /c/..., which Node would read as a folder at the root of the current drive.
// Map it to C:\... before any path check.
function gitBashPath(target) {
  const drive = /^\/([a-zA-Z])(?:\/(.*))?$/.exec(target)
  return drive ? `${drive[1].toUpperCase()}:\\${(drive[2] ?? '').replace(/\//g, '\\')}` : target
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
      // An escaped separator (`\|` in grep "a\|b") is literal text, not a separator. Mask it like a quoted one.
      const next = command[i + 1]
      out += ch + (QUOTED_SEPARATOR.test(next) ? "_" : next)
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

// Recursive-delete switches: a short cluster of up to four letters containing r or R (`-rf`, `-rfiv`),
// a long `--r...` option (`--recursive`), PowerShell `-Recurse`, or cmd `/s`. Longer words such as
// PowerShell `-Worktree` or `-Force` are not short clusters, so they do not match.
const RECURSIVE_SHORT_CLUSTER = /^-[a-zA-Z]{1,4}$/
const RECURSIVE_NAMED_SWITCH = /^(-recurse|\/s)$/i
// Commands that delete: rm, PowerShell Remove-Item and its aliases, cmd rd/rmdir/del/erase.
const DELETE_COMMAND = /\b(rm|ri|rd|rmdir|del|erase|unlink|shred|remove-item)\b/i

// An unresolved wrapper argument only matters when the command could delete recursively: it names a delete
// command or carries a recursive switch. Without either, `powershell -File x.ps1 -Worktree "$(pwd)"` is not a delete.
function mayDeleteRecursively(command) {
  const text = command.replace(/["'\\]/g, '')
  return (
    DELETE_COMMAND.test(text) ||
    text
      .split(/\s+/)
      .some(
        (token) =>
          (RECURSIVE_SHORT_CLUSTER.test(token) && /r/i.test(token)) ||
          RECURSIVE_NAMED_SWITCH.test(token) ||
          RM_RECURSIVE_LONG.test(token),
      )
  )
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
      if (tokens.slice(index + 1).some(hasUnsafeWordChars) && mayDeleteRecursively(command)) {
        return true
      }
      continue
    }

    if (PREFIX_WRAPPERS.has(first)) {
      if (tokens.slice(index + 1).some(hasUnsafeWordChars) && mayDeleteRecursively(command)) {
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

  // Any rm invocation whose own words expand ($ or backtick) fails closed. Text that only mentions rm
  // (a grep pattern, an echo) is not an invocation, and a backtick in single quotes is literal text.
  if (rmInvocations(command).some((c) => c.words.slice(1).some((w) => w.expandable))) {
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
const parsed = findCommands(command)
if (parsed.some((c) => c.name === OVERFLOW)) {
  block('command nesting is too deep to check.')
}

const dataReason = dotnetDockerReason(command, parsed)
if (dataReason) {
  block(dataReason)
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
// CLAUDE_PROJECT_DIR stays at the folder the session started in, so in a worktree session it points at the main
// checkout. The hook input's cwd follows the session into its worktree, so dependency checks use that worktree.
const hasSessionCwd = typeof input?.cwd === 'string' && input.cwd !== ''
const sessionCwd = hasSessionCwd ? path.resolve(input.cwd) : projectDir
const sessionRoot = hasSessionCwd ? worktreeRootOf(sessionCwd) : projectDir
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

// Reads one shell clause that starts with npm. `subcommand` is the first non-flag word. `prefixes` holds every
// --prefix value, wherever the flag sits. Each value is read two ways, as bash passes it (backslashes removed) and
// as written (backslashes kept), and the caller fails if either lands outside this worktree. `clause` has
// backslashes removed, so an escaped command name (n\pm) is still read as npm. `rawClause` keeps them.
// `unresolved` is set when the two token lists do not line up, which an escaped space causes.
function npmClause(clause, rawClause) {
  const tokens = clause.trim().split(/\s+/).filter(Boolean)
  const rawTokens = rawClause.trim().split(/\s+/).filter(Boolean)
  let index = 0
  while (index < tokens.length && ASSIGNMENT.test(tokens[index])) {
    index++
  }
  if (index >= tokens.length || !/^npm(\.cmd)?$/i.test(path.basename(tokens[index]))) {
    return null
  }

  const prefixes = []
  let subcommand = null
  for (let j = index + 1; j < tokens.length; j++) {
    const token = tokens[j]
    if (token === '--prefix') {
      prefixes.push(rawTokens[j + 1] ?? '', tokens[j + 1] ?? '')
      j++
    } else if (token.startsWith('--prefix=')) {
      const raw = rawTokens[j] ?? ''
      prefixes.push(raw.slice(raw.indexOf('=') + 1), token.slice('--prefix='.length))
    } else if (!token.startsWith('-') && subcommand === null) {
      subcommand = token
    }
  }

  return {
    subcommand,
    prefixes: prefixes.length > 0 ? prefixes : [null],
    unresolved: tokens.length !== rawTokens.length,
  }
}

const DIRECTORY_CHANGES = new Set(['cd', 'pushd', 'popd'])

// Every directory change must be exactly `cd <worktree root>`. Then a --prefix relative to the root still
// resolves in this worktree. A relative path, another folder, pushd, popd, or a bare cd (which goes home)
// fails closed. Reads the raw clauses so Windows backslashes in the path survive.
function changesDirectoryOnlyToRoot(command, projectDir, beforeIndex) {
  return maskQuotedSeparators(command)
    .split(/[\n;&|()`]+/)
    .slice(0, beforeIndex)
    .filter((clause) => DIRECTORY_CHANGES.has(clause.replace(/["'\\]/g, '').trim().split(/\s+/)[0]))
    .every((clause) => {
      const match = /^cd\s+(?:"([^"]+)"|'([^']+)'|(\S+))$/.exec(clause.trim())
      if (!match) {
        return false
      }
      const target = gitBashPath(match[1] ?? match[2] ?? match[3])
      return path.isAbsolute(target) && samePath(path.resolve(target), projectDir)
    })
}

const npmRawClauses = maskQuotedSeparators(command).replace(/["']/g, '').split(/[\n;&|()`]+/)
const npmClauses = npmRawClauses.map((clause) => clause.replace(/\\/g, ''))
const npmChanges = npmClauses
  .map((clause, index) => ({ index, invocation: npmClause(clause, npmRawClauses[index]) }))
  .filter(({ invocation }) => invocation && NPM_DEPENDENCY_SUBCOMMANDS.has(invocation.subcommand))
  .map(({ index, invocation }) => ({ index, ...invocation }))
// The clauses before the first dependency change decide where npm runs. A cd after that change does not.
const firstNpmChange = npmChanges.length > 0 ? npmChanges[0].index : npmClauses.length
const changesDirectory = npmClauses.some(
  (clause, index) => index < firstNpmChange && DIRECTORY_CHANGES.has(clause.trim().split(/\s+/)[0]),
)

if (npmChanges.length > 0) {
  if (changesDirectory && !changesDirectoryOnlyToRoot(command, sessionRoot, firstNpmChange)) {
    block(
      'a dependency change after a cd must cd to the worktree root itself, or run npm with --prefix from the worktree root without a cd.',
    )
  }
  // npm resolves --prefix from the folder it runs in: the session root after a cd to it, otherwise the session cwd.
  const npmBase = changesDirectory ? sessionRoot : sessionCwd
  // A linked node_modules is checked in each folder npm installs into, not once for the session root.
  const outsideOrLinked = npmChanges.some(
    ({ prefixes, unresolved }) =>
      unresolved ||
      prefixes.some((prefix) => {
        const target = prefix ? path.resolve(npmBase, expandHome(gitBashPath(prefix), home)) : npmBase
        return !isSameOrAncestor(sessionRoot, target) || isLink(path.join(target, 'node_modules'))
      }),
  )
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
