// git-specific readers for the PreToolUse guards, built on the shared shell reader.

import { commandName, findCommands } from './shell.mjs'
import { isLocalOnlyPath, isSecretBasename } from './secrets.mjs'

const GLOBAL_OPTIONS_WITH_VALUE = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--exec-path'])
const SHELL_LIKE = new Set(['bash', 'sh', 'zsh', 'dash', 'ksh', 'fish', 'eval', 'xargs'])
const EMPTY_WORD = { value: '', expandable: false }
const PUSH_FORCE_FLAGS = new Set(['--force', '-f', '--force-with-lease', '--mirror', '--delete'])
const CONFIG_READ_FLAGS = new Set(['--get', '--get-all', '--get-regexp', '--get-urlmatch', '--list', '-l'])

// Every git invocation in the command, with global options skipped. `args` are the words after
// the subcommand, as decoded words ({ value, expandable }).
export function gitInvocations(command) {
  return findCommands(command)
    .filter((c) => c.name === 'git')
    .map((c) => {
      const args = c.words.slice(1)
      let k = 0
      while (k < args.length && args[k].value.startsWith('-')) {
        k += GLOBAL_OPTIONS_WITH_VALUE.has(args[k].value) ? 2 : 1
      }
      return { subcommand: args[k]?.value ?? '', args: args.slice(k + 1) }
    })
}

// Split `git commit` arguments into message words and option strings. Message values (-m, --message,
// the cluster form -am/-ammsg) are not options, so a message such as "fix: drop -n alias" is not a flag.
export function commitOptions(args) {
  const messages = []
  const flags = []
  let usesFile = false

  for (let k = 0; k < args.length; k++) {
    const word = args[k]
    const v = word.value

    if (v === '--message') {
      messages.push(args[++k] ?? EMPTY_WORD)
      continue
    }
    if (v.startsWith('--message=')) {
      messages.push({ value: v.slice('--message='.length), expandable: word.expandable })
      continue
    }
    if (v === '-F' || v === '--file') {
      usesFile = true
      k++
      continue
    }
    if (v.startsWith('--file=') || /^-F./.test(v)) {
      usesFile = true
      continue
    }
    const short = /^-([a-zA-Z]*)m(.*)$/.exec(v)
    if (short && !v.startsWith('--')) {
      if (short[1]) {
        flags.push(`-${short[1]}`)
      }
      if (short[2]) {
        messages.push({ value: short[2], expandable: word.expandable })
      } else {
        messages.push(args[++k] ?? EMPTY_WORD)
      }
      continue
    }
    flags.push(v)
  }

  return { messages, flags, usesFile }
}

// `git push` to a protected branch with a force-style flag or a `+` refspec. Only refspecs whose
// destination is main or master count, so `fix/main-menu` is not treated as main.
export function pushesProtectedBranch(args) {
  const values = args.map((a) => a.value)
  // -f can sit in a short cluster such as -fu or -uf.
  const forced = values.some(
    (v) => PUSH_FORCE_FLAGS.has(v) || v.startsWith('--force-with-lease=') || /^-[a-zA-Z]*f[a-zA-Z]*$/.test(v),
  )
  const refspecs = values.filter((v) => !v.startsWith('-')).slice(1)

  return refspecs.some((refspec) => {
    const source = refspec.replace(/^\+/, '')
    const destination = (source.includes(':') ? source.slice(source.lastIndexOf(':') + 1) : source).replace(
      /^refs\/heads\//,
      '',
    )
    return (forced || refspec.startsWith('+')) && (destination === 'main' || destination === 'master')
  })
}

// `git config` writes (not reads) that change aliases or core.hookspath.
export function writesProtectedConfig(args) {
  if (args.some((a) => CONFIG_READ_FLAGS.has(a.value))) {
    return false
  }
  return args.some((a) => !a.value.startsWith('-') && /^(alias\.|core\.hookspath$)/i.test(a.value))
}

// `git add` of a secret or local-only path.
export function addsSecretPath(args) {
  return args.some((a) => {
    if (a.value.startsWith('-')) {
      return false
    }
    // A substitution decides the path at run time, so it cannot be checked here.
    if (a.expandable && /\$\(|`|\$\{/.test(a.value)) {
      return true
    }
    const normalized = a.value.replace(/\\/g, '/').replace(/^\.\//, '')
    const base = normalized.split('/').pop()
    return isSecretBasename(base) || isLocalOnlyPath(normalized)
  })
}

// A shell wrapper (sh -c, bash -c, eval, xargs) that runs git commit, which would bypass
// the commit-message check when the wrapped command is not validated as a commit.
export function wrapsGitCommit(command) {
  return findCommands(command).some(
    ({ raw }) =>
      raw.some((w) => SHELL_LIKE.has(commandName(w.value))) &&
      /\bgit\b[\s\S]*\bcommit\b/.test(raw.map((w) => w.value).join(' ')),
  )
}
