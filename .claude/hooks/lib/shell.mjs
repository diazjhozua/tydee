import path from 'node:path'

// Quote-aware shell reader shared by the PreToolUse guards. It is not a full POSIX parser.
// It models single and double quotes, backslash escapes, the separators that start a new
// simple command, redirections, and $(...) / backtick substitutions. Guards that depend on
// this reader must still fail closed when a shape is unclear.

const SHELL_WRAPPERS = new Set(['bash', 'sh', 'zsh', 'dash', 'ksh', 'fish'])

const PREFIX_WRAPPERS = new Set([
  'builtin',
  'command',
  'coproc',
  'env',
  'exec',
  'ionice',
  'nice',
  'nohup',
  'setsid',
  'stdbuf',
  'sudo',
  'time',
  'timeout',
  'watch',
  'xargs',
])

// Commands that can run other commands from their text. When the reader cannot follow such a
// payload (powershell -Command, cmd /c, here-strings), the guards fall back to a text check.
export const INTERPRETERS = new Set([
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
])

// Reserved words that can start a simple command (if rm ...; then git ...; do rm ...).
const KEYWORDS = new Set(['!', 'do', 'elif', 'else', 'if', 'then', 'until', 'while'])

const ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/
const NUMERIC_ARG = /^\d+(\.\d+)?[smhd]?$/
const MAX_DEPTH = 6

// Brace expansion in an unquoted word (`{rm,-rf,x}`, `{a,b}`, `{1..3}`). The shell builds such words at run time.
const BRACE_EXPANSION = /\{[^{}\s]*(?:,|\.\.)[^{}\s]*\}/

// Commands that only read a here-document body as data and write no file from it. A quoted body given to one of these
// is literal text. `git commit` is listed in full because plain `git` also runs `apply`, which writes files.
const HEREDOC_DATA_CONSUMERS = new Set(['cat', 'git commit'])

// Name given to a command the reader will not follow because nesting is too deep. Guards block it.
export const OVERFLOW = '<overflow>'

export function commandName(token) {
  return path.basename(token.replace(/\\/g, '/')).replace(/\.exe$/i, '').toLowerCase()
}

// Read a $( ... ) body. `start` is the index just after "$(". Returns the body and the index after ")".
function readSubstitution(input, start) {
  let depth = 1
  let j = start
  while (j < input.length) {
    const c = input[j]
    if (c === '\\') {
      j += 2
      continue
    }
    if (c === "'") {
      const end = input.indexOf("'", j + 1)
      j = end === -1 ? input.length : end + 1
      continue
    }
    if (c === '"') {
      j++
      while (j < input.length && input[j] !== '"') {
        j += input[j] === '\\' ? 2 : 1
      }
      j++
      continue
    }
    if (c === '(') {
      depth++
    } else if (c === ')') {
      depth--
      if (depth === 0) {
        return { body: input.slice(start, j), next: j + 1 }
      }
    }
    j++
  }
  return { body: input.slice(start), next: input.length }
}

// The command a here-document body is fed to, as HEREDOC_DATA_CONSUMERS names it: `cat`, or `git commit`.
function heredocOwner(words) {
  if (words.length === 0) {
    return null
  }
  const name = commandName(words[0].value)
  return name === 'git' && words.length > 1 ? `git ${words[1].value}` : name
}

// Reads the delimiter after `<<` or `<<-` at `pos` and records the here-document as pending. Returns the index after it.
// The owner is the command the body is fed to (see heredocOwner).
function readHeredocDelimiter(input, pos, words, pending) {
  let i = pos
  const strip = input[i] === '-'
  if (strip) {
    i++
  }
  while (input[i] === ' ' || input[i] === '\t') {
    i++
  }
  const owner = heredocOwner(words)
  let delim = ''
  let quoted = false
  if (input[i] === '"' || input[i] === "'") {
    const end = input.indexOf(input[i], i + 1)
    const stop = end === -1 ? input.length : end
    delim = input.slice(i + 1, stop)
    quoted = true
    i = stop + 1
  } else {
    if (input[i] === '\\') {
      quoted = true
      i++
    }
    while (i < input.length && !/[\s;&|()<>]/.test(input[i])) {
      delim += input[i]
      i++
    }
  }
  if (delim) {
    pending.push({ delim, strip, quoted, owner })
  }
  return i
}

// Called at the newline that ends the line with the `<<` operators. A body is skipped only when every
// here-document on the line has a quoted delimiter and a data consumer, and the operator line has no pipe. Otherwise
// the body stays in the scan, so `sh <<'EOF'` (the body is a script) and `cat <<'EOF' | sh` are checked.
// A pipe elsewhere in the command does not count, and neither does a redirect on the operator line.
// A line ending in a backslash continues onto the next line, so its body stays in the scan.
function skipHeredocBodies(input, start, pending, ctx) {
  // `start` follows the newline that ends the operator line.
  const newline = start - 1
  const lineStart = input.lastIndexOf('\n', newline - 1) + 1
  const operatorLine = input.slice(lineStart, newline)
  const literal =
    !operatorLine.includes('|') &&
    !operatorLine.trimEnd().endsWith('\\') &&
    pending.every((h) => h.quoted && HEREDOC_DATA_CONSUMERS.has(h.owner))
  if (!literal) {
    return start
  }
  let i = start
  for (const h of pending) {
    i = skipHeredocBody(input, i, h)
  }
  // Only a single top-level heredoc is recorded. The terminator line stays out of the range, so the masked text
  // still ends the body where the reader does. A nested body (inside $(...)) would carry offsets into a substring.
  if (input === ctx.source && pending.length === 1) {
    ctx.ranges.push([start, Math.max(start, input.lastIndexOf('\n', i - 1) + 1)])
  }
  return i
}

// Returns the index of the newline that ends the terminator line, or the end of input when it never appears.
function skipHeredocBody(input, start, { delim, strip }) {
  let i = start
  while (i < input.length) {
    const eol = input.indexOf('\n', i)
    const end = eol === -1 ? input.length : eol
    const line = strip ? input.slice(i, end).replace(/^\t+/, '') : input.slice(i, end)
    if (line === delim) {
      return end
    }
    i = end + 1
  }
  return input.length
}

// [from, to) ranges of the top-level here-document bodies that the reader treats as literal data, as offsets into `input`.
export function literalHeredocRanges(input) {
  const ctx = { source: input, ranges: [] }
  parseShell(input, ctx)
  return ctx.ranges
}

// Parse a command string into simple commands (arrays of words) plus nested substitution bodies.
// A word is { value, expandable }: value has quotes removed; expandable is true when the word
// contains an unquoted or double-quoted $ or backtick, so the shell may expand it.
function parseShell(input, ctx) {
  const commands = []
  const nested = []
  const pendingHeredocs = []
  let words = []
  let word = null
  let redirect = false
  let i = 0

  const ensureWord = () => {
    if (!word) {
      word = { value: '', expandable: false }
    }
    return word
  }

  const endWord = () => {
    if (word) {
      // Brace expansion builds the word at run time, so it is treated like an expansion.
      if (word.braces && BRACE_EXPANSION.test(word.value)) {
        word.expandable = true
      }
      if (!redirect) {
        words.push(word)
      }
      redirect = false
      word = null
    }
  }

  const endCommand = () => {
    endWord()
    if (words.length > 0) {
      commands.push(words)
    }
    words = []
    redirect = false
  }

  while (i < input.length) {
    const c = input[i]

    // An unquoted # at the start of a word is a comment to the end of the line.
    if (c === '#' && !word) {
      while (i < input.length && input[i] !== '\n') {
        i++
      }
      continue
    }

    if (c === "'") {
      const end = input.indexOf("'", i + 1)
      const stop = end === -1 ? input.length : end
      ensureWord().value += input.slice(i + 1, stop)
      i = stop + 1
      continue
    }

    if (c === '"') {
      const w = ensureWord()
      i++
      while (i < input.length && input[i] !== '"') {
        const d = input[i]
        if (d === '\\' && i + 1 < input.length && '"\\$`\n'.includes(input[i + 1])) {
          if (input[i + 1] !== '\n') {
            w.value += input[i + 1]
          }
          i += 2
          continue
        }
        if (d === '$' && input[i + 1] === '(') {
          const sub = readSubstitution(input, i + 2)
          nested.push(sub.body)
          w.value += input.slice(i, sub.next)
          w.expandable = true
          i = sub.next
          continue
        }
        if (d === '`') {
          const end = input.indexOf('`', i + 1)
          const stop = end === -1 ? input.length : end
          nested.push(input.slice(i + 1, stop))
          w.value += input.slice(i, stop + 1)
          w.expandable = true
          i = stop + 1
          continue
        }
        if (d === '$') {
          w.expandable = true
        }
        w.value += d
        i++
      }
      i++
      continue
    }

    if (c === '\\') {
      if (input[i + 1] === '\n') {
        i += 2
        continue
      }
      if (i + 1 < input.length) {
        ensureWord().value += input[i + 1]
      }
      i += 2
      continue
    }

    if (c === '$') {
      const w = ensureWord()
      w.expandable = true
      if (input[i + 1] === '(') {
        const sub = readSubstitution(input, i + 2)
        nested.push(sub.body)
        w.value += input.slice(i, sub.next)
        i = sub.next
        continue
      }
      if (input[i + 1] === '{') {
        const end = input.indexOf('}', i + 2)
        const stop = end === -1 ? input.length : end + 1
        w.value += input.slice(i, stop)
        i = stop
        continue
      }
      w.value += '$'
      i++
      continue
    }

    if (c === '`') {
      const end = input.indexOf('`', i + 1)
      const stop = end === -1 ? input.length : end
      nested.push(input.slice(i + 1, stop))
      const w = ensureWord()
      w.expandable = true
      w.value += input.slice(i, stop + 1)
      i = stop + 1
      continue
    }

    if (c === '<' || c === '>') {
      // A bare file-descriptor number (for example the 2 in 2>&1) is not an argument.
      if (word && !word.expandable && /^\d+$/.test(word.value)) {
        word = null
      } else {
        endWord()
      }
      const operatorStart = i
      i++
      while (i < input.length && '<>&|'.includes(input[i])) {
        i++
      }
      if (input.slice(operatorStart, i) === '<<') {
        // A here-document has no target word. Its body starts on the next line.
        i = readHeredocDelimiter(input, i, words, pendingHeredocs)
        continue
      }
      redirect = true
      continue
    }

    if (c === '&' || c === '|' || c === ';' || c === '\n' || c === '(' || c === ')') {
      endCommand()
      i++
      if (c === '\n' && pendingHeredocs.length > 0) {
        i = skipHeredocBodies(input, i, pendingHeredocs, ctx)
        pendingHeredocs.length = 0
      }
      continue
    }

    if (c === '{' || c === '}') {
      const next = input[i + 1]
      if (!word && (next === undefined || /[\s;&|()]/.test(next))) {
        endCommand()
        i++
        continue
      }
    }

    if (/\s/.test(c)) {
      endWord()
      i++
      continue
    }

    const w = ensureWord()
    if (c === '{' || c === '}') {
      w.braces = true
    }
    w.value += c
    i++
  }

  endCommand()
  return { commands, nested }
}

// Drop prefix wrappers (env, sudo, xargs, ...), assignments, and their options, so the first
// returned word is the command that actually runs. Returns null when nothing is left.
function effectiveWords(words) {
  let k = 0
  for (;;) {
    if (k < words.length && (KEYWORDS.has(words[k].value) || ASSIGNMENT.test(words[k].value))) {
      k++
    } else if (k < words.length && PREFIX_WRAPPERS.has(commandName(words[k].value))) {
      k++
      while (
        k < words.length &&
        (words[k].value.startsWith('-') || ASSIGNMENT.test(words[k].value) || NUMERIC_ARG.test(words[k].value))
      ) {
        k++
      }
    } else {
      break
    }
  }
  return k < words.length ? words.slice(k) : null
}

// Commands a guard must see even when a prefix wrapper takes option values the reader does not model.
const CANDIDATE_NAMES = new Set([...INTERPRETERS, 'git', 'rm', 'dotnet', 'docker', 'docker-compose'])

function addCommand(words, raw, depth, found, ctx) {
  const name = commandName(words[0].value)
  found.push({ name, words, raw, unresolved: words[0].expandable })

  if (SHELL_WRAPPERS.has(name)) {
    const rest = words.slice(1)
    const flagIndex = rest.findIndex((w) => /^-[a-zA-Z]*c[a-zA-Z]*$/.test(w.value))
    const payload = flagIndex === -1 ? undefined : rest[flagIndex + 1]
    if (payload) {
      found.push(...findCommands(payload.value, depth + 1, ctx))
    }
  } else if (name === 'eval') {
    found.push(...findCommands(words.slice(1).map((w) => w.value).join(' '), depth + 1, ctx))
  }
}

// Every simple command in `input`, including commands run by shell wrappers (sh -c, bash -c,
// eval), by prefix wrappers (sudo, env -S, xargs, timeout), and by $(...) / backticks.
// Each entry: { name, words, raw, unresolved }. `unresolved` is true when the command word is built by expansion,
// so the name the shell runs is unknown. Nesting deeper than MAX_DEPTH yields one OVERFLOW entry.
export function findCommands(input, depth = 0, context = null) {
  if (depth > MAX_DEPTH) {
    return [{ name: OVERFLOW, words: [], raw: [], unresolved: false }]
  }
  const ctx = context ?? {}
  const { commands, nested } = parseShell(input, ctx)
  const found = []

  for (const raw of commands) {
    const starts = []
    const effective = effectiveWords(raw)
    if (effective) {
      starts.push(effective)
    }

    if (raw.some((w) => PREFIX_WRAPPERS.has(commandName(w.value)))) {
      raw.forEach((w, k) => {
        if (k > 0 && CANDIDATE_NAMES.has(commandName(w.value))) {
          starts.push(raw.slice(k))
        }
      })
      // env -S and similar options take a whole command line as one word.
      for (const w of raw) {
        if (/\s/.test(w.value)) {
          found.push(...findCommands(w.value, depth + 1, ctx))
        }
      }
    }

    for (const words of starts) {
      addCommand(words, raw, depth, found, ctx)
    }
  }

  for (const body of nested) {
    found.push(...findCommands(body, depth + 1, ctx))
  }
  return found
}

// True when any simple command names an interpreter or prefix wrapper.
export function usesInterpreter(input) {
  return findCommands(input).some((c) =>
    c.raw.some((w) => INTERPRETERS.has(commandName(w.value)) || PREFIX_WRAPPERS.has(commandName(w.value))),
  )
}
