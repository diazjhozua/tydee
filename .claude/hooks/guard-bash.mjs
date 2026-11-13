#!/usr/bin/env node
// PreToolUse guard for Bash commands. Exit 2 blocks the call and reports to Claude.

import os from 'node:os'
import path from 'node:path'

const BLOCK_MESSAGE = (reason) =>
  `Blocked by .claude/hooks/guard-bash.mjs: ${reason}\n` +
  'Ask the user before retrying; do not work around this guard.'

const SECRET_PATH =
  /(^|[\s'"])(\.env(?!\.(example|template|sample))|appsettings\.Development\.json|.*\.(pfx|pem|key)\b|appsettings\.[\w.-]*\.local\.json)/i

// Match a git subcommand after any global options, e.g. `git --no-pager commit`.
const gitRuns = (names) => new RegExp(`\\bgit\\b[^\\n;&|]*\\b(?:${names})\\b`)

const GIT_COMMIT = gitRuns('commit')
const GIT_PUSH = gitRuns('push')
const GIT_RESET = gitRuns('reset')
const GIT_DIFF = gitRuns('diff|log|difftool')
const GIT_ADD = gitRuns('add')

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

function commandName(token) {
  return path.basename(token.replace(/\\/g, '/')).replace(/\.exe$/i, '').toLowerCase()
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
const UNSAFE_WRAPPED_ARG = /[$`*?[]/
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

// A command word built from expansion, globbing, or escaping cannot be resolved statically.
function hasUnsafeCommandWord(command) {
  for (const segment of splitCommandSegments(maskQuotedSeparators(maskNonCommandWords(command)))) {
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
      if (tokens.slice(index + 1).some((token) => UNSAFE_WRAPPED_ARG.test(token))) {
        return true
      }
      continue
    }

    if (PREFIX_WRAPPERS.has(first)) {
      if (tokens.slice(index + 1).some((token) => UNSAFE_WRAPPED_ARG.test(token))) {
        return true
      }
      continue
    }

    // Backslashes are not checked here: printf escapes such as `\n` next to a
    // redirect produce a "command word" that is only text. Escaped `rm` is still
    // caught by the rm checks above and by the unescaped re-check in recursiveDeleteTargets.
    // `[` and `[[` are the test builtins, not globs, so `[ -f x ] && cat x` is not an unsafe command word.
    const isTestBuiltin = tokens[index] === '[' || tokens[index] === '[['
    if (!isTestBuiltin && /[$`*?[]/.test(tokens[index])) {
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

function hasRecursiveRm(command) {
  return splitSegments(command).some((segment) => {
    const tokens = segment.split(/\s+/).filter(Boolean)
    const rmIndex = tokens.findIndex((token) => commandName(token).replace(/^[({$`]+/, '') === 'rm')
    if (rmIndex === -1) {
      return false
    }

    return tokens.slice(rmIndex + 1).some(recursiveFlag)
  })
}

// find -delete and find -exec can remove files or run arbitrary commands.
function runsFindDelete(command) {
  const normalized = command.replace(/["'\\]/g, '')
  const tokens = splitCommandSegments(normalized).flatMap((segment) => segment.split(/\s+/).filter(Boolean))
  const hasFind = tokens.some((token) => commandName(token).replace(/^[({$`]+/, '') === 'find')

  if (!hasFind) {
    return false
  }

  if (/[$`]/.test(normalized)) {
    return true
  }

  return tokens.some((token) => /^-(delete|exec|execdir|ok|okdir|fprint|fprint0|fprintf|fls)$/.test(token))
}

// Resolve every recursive-delete target. Any directory change or shell wrapper fails closed.
function recursiveDeleteTargets(command, projectDir, home) {
  // A command word built from expansion, globbing, or escaping cannot be resolved statically.
  if (hasUnsafeCommandWord(command)) {
    return [{ resolved: null, cwd: projectDir }]
  }

  const unescaped = command.replace(/\\/g, '')
  if (unescaped !== command && hasRecursiveRm(unescaped)) {
    return [{ resolved: null, cwd: projectDir }]
  }
  // Any rm with an expansion ($ or backtick) fails closed. Backslash alone does not: a plain
  // `rm -f file` next to an unrelated grep pattern like `\|` must not block.
  // `rm` (or `rm.exe`) as its own word. `-`, `.`, and word characters on either side mean a filename such as `block-rm-x.json`.
  if (/(?<![\w.-])rm(?:\.exe)?(?![\w.-])/i.test(command) && /[$`]/.test(command)) {
    return [{ resolved: null, cwd: projectDir }]
  }

  if (!hasRecursiveRm(command)) {
    return []
  }

  const tokens = splitSegments(command).flatMap((segment) => segment.split(/\s+/).filter(Boolean))
  const directoryChange = tokens.some((token) => ['cd', 'pushd', 'popd'].includes(commandName(token)))
  const envChdir = tokens.some((token) => token === '-C' || token === '--chdir' || token.startsWith('--chdir='))
  const shellWrapper = tokens.some((token) =>
    [
      '.',
      'ash',
      'bash',
      'busybox',
      'cmd',
      'csh',
      'dash',
      'eval',
      'find',
      'fish',
      'ksh',
      'mksh',
      'parallel',
      'powershell',
      'pwsh',
      'sh',
      'source',
      'tcsh',
      'xargs',
      'zsh',
    ].includes(commandName(token)),
  )
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
  for (const segment of splitSegments(command)) {
    const segmentTokens = segment.split(/\s+/).filter(Boolean)
    const rmIndex = segmentTokens.findIndex((token) => commandName(token).replace(/^[({$`]+/, '') === 'rm')
    if (rmIndex === -1) {
      continue
    }

    const flags = segmentTokens.slice(rmIndex + 1).filter((token) => token.startsWith('-'))
    if (!flags.some(recursiveFlag)) {
      continue
    }

    let positional = 0
    for (const token of segmentTokens.slice(rmIndex + 1)) {
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
const normalized = command.replace(/["'\\]/g, '')
const git = normalized

// Git flags are matched per shell clause (split on separators), so a flag that belongs to another
// tool in the same command is not read as a git flag. Example: `powershell -ExecutionPolicy ...`
// contains "-n" and used to block any command that also mentioned "git commit".
// Split the raw command with quoted separators masked first, so `git commit -m "R&D" --no-verify`
// keeps one clause. Quotes and backslashes are stripped after masking, as in `git` above.
const gitClauses = maskQuotedSeparators(command).replace(/["'\\]/g, '').split(/[\n;&|]+/)

if (
  gitClauses.some(
    (clause) =>
      GIT_COMMIT.test(clause) && /(\s--no-verify\b|\s--no-v[a-z-]*\b|\s-[a-zA-Z]*n[a-zA-Z]*\b)/.test(clause),
  )
) {
  block('skipping commit hooks is not allowed.')
}

if (
  gitClauses.some(
    (clause) =>
      GIT_PUSH.test(clause) &&
      /(\s--force\b|\s--force-with-lease\b|\s--mirror\b|\s--delete\b|\s-f\b|\s\+\S+)/.test(clause) &&
      /\b(main|master)\b/.test(clause),
  )
) {
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
  /\bgit\b[^\n;&|]*\bconfig\b[^\n;&|]*\b(?:alias\.|core\.hookspath)\b/i.test(git) ||
  /\bGIT_CONFIG_(?:COUNT|PARAMETERS|GLOBAL|SYSTEM|KEY_\d+|VALUE_\d+)\b/i.test(normalized)
) {
  block('git config overrides can hide commits or skip hooks.')
}

if (/(\b(bash|sh|zsh|dash)\b[^\n]*\s-c\s|\beval\b|\bxargs\b)[^\n]*\bgit\b[^\n]*\bcommit\b/.test(normalized)) {
  block('wrapped commit commands bypass message validation.')
}

if (/\bnpm\b[^\n]*\s--(script-shell|node-options|userconfig|globalconfig)\b/.test(normalized)) {
  block('npm config flags can execute arbitrary code.')
}

if (GIT_ADD.test(git) && SECRET_PATH.test(normalized)) {
  block('staging secrets or local resume data.')
}

const projectDir = path.resolve(process.env.CLAUDE_PROJECT_DIR ?? process.cwd())
const home = os.homedir()

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
