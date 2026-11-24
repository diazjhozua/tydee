// Run with: node --test .claude/hooks/*.test.mjs
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const guard = path.join(path.dirname(fileURLToPath(import.meta.url)), 'guard-bash.mjs')

// `cwd` is the hook input's session directory; omitted, the guard falls back to CLAUDE_PROJECT_DIR.
function exitCodeFor(command, projectDir, cwd) {
  const hookInput = cwd ? { cwd, tool_input: { command } } : { tool_input: { command } }
  const result = spawnSync(process.execPath, [guard], {
    input: JSON.stringify(hookInput),
    encoding: 'utf8',
    env: projectDir ? { ...process.env, CLAUDE_PROJECT_DIR: projectDir } : process.env,
  })
  return result.status
}

// Runs the guard against a temporary worktree. `linked` makes its src/Web.Client/node_modules a junction.
// `command` may be a function of the worktree root, for commands that name the root path.
function exitCodeInWorktree(command, linked) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'guard-worktree-'))
  const client = path.join(root, 'src', 'Web.Client')
  fs.mkdirSync(client, { recursive: true })
  const modules = path.join(client, 'node_modules')
  if (linked) {
    const shared = path.join(root, 'shared-node_modules')
    fs.mkdirSync(shared)
    fs.symlinkSync(shared, modules, 'junction')
  } else {
    fs.mkdirSync(modules)
  }
  try {
    return exitCodeFor(typeof command === 'function' ? command(root) : command, root)
  } finally {
    if (linked) {
      fs.rmdirSync(modules)
    }
    fs.rmSync(root, { recursive: true, force: true })
  }
}

test('allows a quoted glob-looking string that is a whole word', () => {
  assert.equal(exitCodeFor('f(g("[role]"))'), 0)
})

test('blocks a live glob in a command word', () => {
  assert.equal(exitCodeFor('*.sh --help'), 2)
})

test('blocks an expansion inside a quoted word', () => {
  assert.equal(exitCodeFor('f(g("$HOME"))'), 2)
})

test('blocks a glob hidden between paired quotes in a shell wrapper', () => {
  // The inner shell sees `r[m] -rf ~` after the outer shell strips quotes.
  assert.equal(exitCodeFor('sh -c "r[m]"" -rf ~"'), 2)
})

test('blocks a glob glued to other text in a shell wrapper argument', () => {
  assert.equal(exitCodeFor('sh -c "r[m] -rf x"'), 2)
})

test('allows the test builtin as a command word', () => {
  assert.equal(exitCodeFor('[ -f x ] && cat x'), 0)
})

test('blocks a parameter expansion used as a command word', () => {
  assert.equal(exitCodeFor('${CMD} -rf x'), 2)
})

// False positives: an unresolved expansion in a wrapper argument is only a risk with a recursive delete.
test('allows an expansion in a wrapper argument when nothing can delete recursively', () => {
  assert.equal(exitCodeFor('powershell -ExecutionPolicy Bypass -File scripts\\link.ps1 -Worktree "$(pwd)"'), 0)
  assert.equal(exitCodeFor('timeout 60 npm --prefix "$(pwd)" run lint'), 0)
})

test('still blocks an expansion in a wrapper argument next to a recursive rm switch', () => {
  assert.equal(exitCodeFor('powershell -Command "$CMD -rf ~"'), 2)
  assert.equal(exitCodeFor('timeout 5 "$CMD" --recursive ~'), 2)
})

test('allows an escaped pipe inside a double-quoted grep pattern', () => {
  assert.equal(exitCodeFor('grep -n "a\\|\\$" guard-bash.test.mjs'), 0)
})

test('allows a wrapper expansion when the wrapped command only reads', () => {
  assert.equal(exitCodeFor('powershell -Command "Get-ChildItem $dir"'), 0)
})

test('blocks a wrapper expansion with a clustered recursive switch', () => {
  assert.equal(exitCodeFor('timeout 5 "$CMD" -rfiv ~'), 2)
})

test('blocks a wrapper expansion that runs PowerShell Remove-Item or cmd rd', () => {
  assert.equal(exitCodeFor('powershell -Command "Remove-Item -Recurse -Force $dir"'), 2)
  assert.equal(exitCodeFor('cmd /c "rd /s /q $dir"'), 2)
})

// Commit hooks: flags are read from decoded words, so message text is never a flag.
test('allows -n and --no-verify inside a commit message', () => {
  assert.equal(exitCodeFor('git commit -m "fix: drop -n alias"'), 0)
  assert.equal(exitCodeFor('git commit -m "docs: explain --no-verify is blocked"'), 0)
})

test('blocks --no-verify and -n flags on a commit', () => {
  assert.equal(exitCodeFor('git commit --no-verify -m "feat: x"'), 2)
  assert.equal(exitCodeFor('git commit -nm "feat: x"'), 2)
})

test('blocks --no-verify when the command word is quoted', () => {
  assert.equal(exitCodeFor('git "commit" --no-verify -m "feat: x"'), 2)
})

// Push: only a force push or + refspec whose destination is main or master is blocked.
test('allows a force-with-lease push to a branch whose name contains main', () => {
  assert.equal(exitCodeFor('git push --force-with-lease origin fix/main-menu-overflow'), 0)
})

test('allows deleting a branch whose name contains main', () => {
  assert.equal(exitCodeFor('git push origin --delete fix/main-menu'), 0)
})

test('blocks force pushes to main in each refspec form', () => {
  assert.equal(exitCodeFor('git push --force origin main'), 2)
  assert.equal(exitCodeFor('git push -f origin HEAD:refs/heads/main'), 2)
  assert.equal(exitCodeFor('git push -f origin +main'), 2)
})

test('allows a plain push to main', () => {
  assert.equal(exitCodeFor('git push origin main'), 0)
})

// Staging: only the paths given to git add are checked, not text elsewhere in the command.
test('allows staging a file whose name contains a key extension in the middle', () => {
  assert.equal(exitCodeFor('git add docs/adr/0003-api.key-rotation.md'), 0)
})

test('allows a commit whose message mentions .env', () => {
  assert.equal(exitCodeFor('git add docs/setup.md && git commit -m "docs: explain .env setup"'), 0)
})

test('allows staging an example env file', () => {
  assert.equal(exitCodeFor('git add .env.example'), 0)
})

test('blocks staging secrets, including forms that used to pass', () => {
  assert.equal(exitCodeFor('git add .env'), 2)
  assert.equal(exitCodeFor('git add ./.env'), 2)
  assert.equal(exitCodeFor('git add src/Web.Client/.env.local'), 2)
  assert.equal(exitCodeFor('git add .claude/settings.local.json'), 2)
  assert.equal(exitCodeFor('git add .claude/plans/notes.md'), 2)
})

// Config: reads pass; writes to aliases or core.hookspath are blocked.
test('allows reading an alias', () => {
  assert.equal(exitCodeFor('git config --get alias.co'), 0)
})

test('blocks writing an alias or core.hookspath', () => {
  assert.equal(exitCodeFor('git config alias.co checkout'), 2)
  assert.equal(exitCodeFor('git config --unset core.hookspath'), 2)
})

// Wrapped commits: a shell wrapper around git commit is blocked, but unrelated pipelines are not.
test('blocks a commit run through sh -c', () => {
  assert.equal(exitCodeFor('sh -c "git commit --no-verify -m \'feat: x\'"'), 2)
})

test('allows a grep for xargs piped before a plain commit', () => {
  assert.equal(exitCodeFor('rg xargs src && git commit -m "fix: x"'), 0)
})

test('blocks secrets staged through a command substitution or backticks', () => {
  assert.equal(exitCodeFor('git add $(echo .env)'), 2)
  assert.equal(exitCodeFor('git add "$(echo .env)"'), 2)
  assert.equal(exitCodeFor('git add `echo .env`'), 2)
})

test('blocks a force push to main with a clustered -f flag', () => {
  assert.equal(exitCodeFor('git push -fu origin main'), 2)
  assert.equal(exitCodeFor('git push -uf origin HEAD:main'), 2)
})

test('blocks a command nested too deeply to check', () => {
  let command = 'rm -rf ~'
  for (let k = 0; k < 8; k++) {
    command = `echo $(${command})`
  }
  assert.equal(exitCodeFor(command), 2)
})

test('blocks a commit hidden behind a reserved word', () => {
  assert.equal(exitCodeFor('if true; then git commit --no-verify -m "feat: x"; fi'), 2)
})

test('allows an expansion used as a redirect target', () => {
  assert.equal(exitCodeFor('node run.mjs < "$f"'), 0)
  assert.equal(exitCodeFor('echo ok > "$LOG_FILE"'), 0)
  assert.equal(exitCodeFor('for f in a b; do node x.mjs < "$f"; done'), 0)
})

test('allows a file descriptor redirect before a pipe', () => {
  assert.equal(exitCodeFor('ls -la "$DIR" 2>&1 | grep -i x'), 0)
})

test('blocks an expansion used as a command word after a redirect', () => {
  assert.equal(exitCodeFor('> "$LOG_FILE" $CMD'), 2)
})

test('blocks a recursive delete hidden in a command substitution after a redirect', () => {
  assert.equal(exitCodeFor('echo x > $(rm -rf ~)'), 2)
})

// Issue #63: a command name built by substitution or backticks hides rm and git from the checks.
test('blocks a command name built by a substitution or backticks', () => {
  assert.equal(exitCodeFor('$(echo rm) -rf ~/Documents'), 2)
  assert.equal(exitCodeFor('$(which git) commit --no-verify -m msg'), 2)
  assert.equal(exitCodeFor('`echo rm` -rf ~/Documents'), 2)
  assert.equal(exitCodeFor('`which git` push --force origin main'), 2)
})

test('names the expansion reason when the command name is built by a substitution', () => {
  const result = spawnSync(process.execPath, [guard], {
    input: JSON.stringify({ tool_input: { command: '$(echo rm) -rf ~/Documents' } }),
    encoding: 'utf8',
  })
  assert.equal(result.status, 2)
  assert.match(result.stderr, /command name built by expansion cannot be checked/)
})

test('blocks a substituted command name after a prefix wrapper, assignment, or keyword', () => {
  assert.equal(exitCodeFor('env $(echo rm) -rf ~'), 2)
  assert.equal(exitCodeFor('FOO=1 $(echo git) commit --no-verify -m "feat: x"'), 2)
  assert.equal(exitCodeFor('if $(echo rm) -rf ~; then :; fi'), 2)
})

test('allows a substitution that sets a variable or fills an argument', () => {
  assert.equal(exitCodeFor('x=$(git rev-parse HEAD) && echo "$x"'), 0)
  assert.equal(exitCodeFor('echo $(date)'), 0)
})

// A delete name counts only as a whole word, so a path that contains rm does not trip the wrapper check.
test('allows a worktree path with rm in its name when nothing can delete recursively', () => {
  assert.equal(
    exitCodeFor(
      'powershell -ExecutionPolicy Bypass -File scripts\\link-worktree-env.ps1 -Worktree "$(pwd)/.claude/worktrees/fix+63-shell-guard-misses-rm-and-git-run"',
    ),
    0,
  )
})

test('still blocks a delete command beside an expansion in a wrapper argument', () => {
  assert.equal(exitCodeFor('powershell -Command "$x; Remove-Item $d"'), 2)
  assert.equal(exitCodeFor('powershell -Command "$x; rm.exe $d"'), 2)
})

test('blocks a cmd switch glued to a delete name', () => {
  assert.equal(exitCodeFor('cmd /c rmdir/s $d'), 2)
  assert.equal(exitCodeFor('cmd /c del/s/q $d'), 2)
  assert.equal(exitCodeFor('cmd /c "rd/s/q $d"'), 2)
  assert.equal(exitCodeFor('cmd /c "rmdir /s $d"'), 2)
})

test('blocks a delete name with a leading dot', () => {
  assert.equal(exitCodeFor('powershell -Command ".\\rm.exe $d"'), 2)
})

test('blocks a brace expansion that builds a command name or a delete target', () => {
  assert.equal(exitCodeFor('{r,}m -rf ~/Documents'), 2)
  assert.equal(exitCodeFor('{rm,-rf,~/Documents}'), 2)
  assert.equal(exitCodeFor('rm -rf {~,x}'), 2)
})

test('allows braces that are literal words', () => {
  assert.equal(exitCodeFor('echo {a,b}'), 0)
  assert.equal(exitCodeFor('echo "{a,b}"'), 0)
})

test('blocks a substitution hidden in text fed to a shell', () => {
  assert.equal(exitCodeFor("echo '$(echo rm) -rf ~/Documents' | sh"), 2)
  assert.equal(exitCodeFor("sh <<< '$(echo rm) -rf ~/Documents'"), 2)
  assert.equal(exitCodeFor('source <(echo $(echo rm) -rf ~/Documents)'), 2)
})

test('blocks a delete run through watch or coproc, with or without a substitution', () => {
  assert.equal(exitCodeFor('watch $(echo rm) -rf ~/Documents'), 2)
  assert.equal(exitCodeFor('watch rm -rf ~/Documents'), 2)
  assert.equal(exitCodeFor('coproc rm -rf ~/Documents'), 2)
})

// Here-documents: a quoted delimiter makes the body literal data for a data consumer, so a commit message can carry
// backtick-led lines. A body given to a shell, a pipe, or an unquoted delimiter (bash expands it) is still scanned.
test('allows a commit message with a backtick-led line in a quoted heredoc', () => {
  assert.equal(exitCodeFor("echo \"$(cat <<'EOF'\nfeat: x\n\n`npm test` passes\nEOF\n)\""), 0)
  assert.equal(exitCodeFor("git commit -F - <<'EOF'\nfeat: x\n\n`npm test` passes\nEOF"), 0)
})

test('blocks a backtick line in an unquoted heredoc, which bash expands', () => {
  assert.equal(exitCodeFor('cat <<EOF\n`npm test` passes\nEOF'), 2)
})

test('blocks a quoted heredoc whose body a shell or a pipe runs', () => {
  assert.equal(exitCodeFor("sh <<'EOF'\n$(echo rm) -rf ~/Documents\nEOF"), 2)
  assert.equal(exitCodeFor("cat <<'EOF' | sh\n$(echo rm) -rf ~/Documents\nEOF"), 2)
})

// Accepted gap: a quoted heredoc body redirected to a file is not scanned, so a later command can run it unchecked.
test('allows a heredoc body redirected to a file (accepted gap)', () => {
  assert.equal(exitCodeFor("cat <<'EOF' > out.sh\n$(echo rm) -rf ~/Documents\nEOF"), 0)
})

test('allows a literal heredoc body with $ and a pipe on a later line, and still checks what follows', () => {
  assert.equal(exitCodeFor("cat <<'EOF' > Program.cs\nConsole.WriteLine($\"x\")\nEOF\ndotnet run 2>&1 | tail -30"), 0)
  assert.equal(exitCodeFor("cat <<'EOF'\nConsole.WriteLine($\"x\")\nEOF\necho done"), 0)
  assert.equal(exitCodeFor("cat <<'EOF' > Program.cs\nConsole.WriteLine($\"x\")\nEOF\nrm -rf ~/Documents"), 2)
})

test('still blocks a pipe on the heredoc line, including a continued line', () => {
  assert.equal(exitCodeFor("cat <<'EOF' | sh\n$(echo rm) -rf ~/Documents\nEOF"), 2)
  assert.equal(exitCodeFor("cat <<'EOF' \\\n| sh\n$(echo rm) -rf ~/Documents\nEOF"), 2)
})

test('still checks commands after a skipped heredoc body', () => {
  assert.equal(exitCodeFor("cat <<'EOF'\nnothing here\nEOF\nrm -rf ~/Documents"), 2)
  assert.equal(exitCodeFor("cat <<'EOF'; rm -rf ~/Documents\nbody\nEOF"), 2)
  assert.equal(exitCodeFor('echo "$(cat <<\'EOF\'\nfeat: x\nEOF\n)" && rm -rf ~/Documents'), 2)
  assert.equal(exitCodeFor("cat <<-'EOF'\n\tbody\n\tEOF\nrm -rf ~/Documents"), 2)
})

test('blocks a dependency change while node_modules is a junction', () => {
  assert.equal(exitCodeInWorktree('npm --prefix src/Web.Client install lodash', true), 2)
  assert.equal(exitCodeInWorktree('npm --prefix src/Web.Client install', true), 2)
  assert.equal(exitCodeInWorktree('npm --prefix src/Web.Client uninstall lodash', true), 2)
  assert.equal(exitCodeInWorktree('npm --prefix src/Web.Client ci', true), 2)
})

test('allows npm scripts while node_modules is a junction', () => {
  assert.equal(exitCodeInWorktree('npm --prefix src/Web.Client run typecheck', true), 0)
  assert.equal(exitCodeInWorktree('npm --prefix src/Web.Client test', true), 0)
})

test('allows a dependency change when node_modules is a real folder', () => {
  assert.equal(exitCodeInWorktree('npm --prefix src/Web.Client install lodash', false), 0)
})

test('does not read a dependency change from a word inside a script name or argument', () => {
  assert.equal(exitCodeInWorktree('npm run remove-unused', true), 0)
  assert.equal(exitCodeInWorktree('npm run check -- update', true), 0)
})

test('blocks a dependency change that targets another folder', () => {
  assert.equal(exitCodeInWorktree('npm --prefix ../other-worktree/src/Web.Client install lodash', false), 2)
  assert.equal(exitCodeInWorktree('npm --prefix=/tmp/elsewhere install lodash', false), 2)
})

test('blocks a dependency change after a cd', () => {
  assert.equal(exitCodeInWorktree('cd src/Web.Client && npm install lodash', false), 2)
})

// Mirrors a live worktree session: CLAUDE_PROJECT_DIR is the main checkout, and the hook input's cwd is the linked
// worktree. `command` is a function of (worktree root, main checkout). `linked` makes the worktree's client
// node_modules a junction into the main checkout.
function exitCodeInSessionWorktree(command, linked) {
  const main = fs.mkdtempSync(path.join(os.tmpdir(), 'guard-main-'))
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'guard-session-'))
  fs.writeFileSync(path.join(root, '.git'), 'gitdir: ../main/.git/worktrees/session\n')
  const client = path.join(root, 'src', 'Web.Client')
  fs.mkdirSync(client, { recursive: true })
  const modules = path.join(client, 'node_modules')
  if (linked) {
    const shared = path.join(main, 'node_modules')
    fs.mkdirSync(shared)
    fs.symlinkSync(shared, modules, 'junction')
  } else {
    fs.mkdirSync(modules)
  }
  try {
    return exitCodeFor(command(root, main), main, root)
  } finally {
    if (linked) {
      fs.rmdirSync(modules)
    }
    fs.rmSync(main, { recursive: true, force: true })
    fs.rmSync(root, { recursive: true, force: true })
  }
}

test('allows a dependency change in the session worktree with or without a cd to its root', () => {
  assert.equal(exitCodeInSessionWorktree((root) => `cd "${root}" && npm --prefix src/Web.Client install lodash`, false), 0)
  assert.equal(exitCodeInSessionWorktree((root) => `cd "${root}" && npm install lodash`, false), 0)
  assert.equal(exitCodeInSessionWorktree(() => 'npm --prefix src/Web.Client install lodash', false), 0)
})

test('blocks a dependency change in the session worktree while its node_modules is a junction', () => {
  assert.equal(exitCodeInSessionWorktree((root) => `cd "${root}" && npm --prefix src/Web.Client install lodash`, true), 2)
  assert.equal(exitCodeInSessionWorktree(() => 'npm --prefix src/Web.Client install lodash', true), 2)
})

test('blocks a cd to the main checkout, or a dependency change that targets it, from a session worktree', () => {
  assert.equal(exitCodeInSessionWorktree((root, main) => `cd "${main}" && npm --prefix src/Web.Client install lodash`, false), 2)
  assert.equal(exitCodeInSessionWorktree((root, main) => `npm --prefix "${main}" install lodash`, false), 2)
  assert.equal(exitCodeInSessionWorktree((root) => `cd "${root}/src" && npm --prefix src/Web.Client install lodash`, false), 2)
})

test('blocks a backslash-escaped cd, or an escaped or dot-escaped --prefix, that bash resolves outside the worktree', () => {
  assert.equal(exitCodeInSessionWorktree((root, main) => `\\cd "${main}" && npm --prefix src/Web.Client install lodash`, false), 2)
  assert.equal(exitCodeInSessionWorktree((root, main) => `npm \\--prefix=${main}/src/Web.Client install lodash`, false), 2)
  assert.equal(exitCodeInSessionWorktree(() => 'npm \\--prefix=/tmp install lodash', false), 2)
  assert.equal(exitCodeInSessionWorktree(() => 'npm --prefix .\\.//.\\.//.\\. install lodash', false), 2)
})

test('blocks a --prefix that follows the subcommand and points outside the worktree', () => {
  assert.equal(exitCodeInSessionWorktree((root, main) => `npm install lodash --prefix "${main}"`, false), 2)
})

// Git Bash spelling of a Windows path: C:\a\b becomes /c/a/b.
const gitBash = (winPath) => `/${winPath[0].toLowerCase()}${winPath.slice(2).replace(/\\/g, '/')}`

test('allows Git Bash /c/ paths that point at the session worktree, and blocks ones outside it', () => {
  assert.equal(exitCodeInSessionWorktree((root) => `cd "${gitBash(root)}" && npm --prefix src/Web.Client install lodash`, false), 0)
  assert.equal(exitCodeInSessionWorktree((root) => `npm --prefix ${gitBash(root)}/src/Web.Client install lodash`, false), 0)
  assert.equal(exitCodeInSessionWorktree((_root, main) => `npm --prefix ${gitBash(main)}/src/Web.Client install lodash`, false), 2)
})

test('a linked node_modules in the web client does not block a dependency change in another folder', () => {
  assert.equal(exitCodeInSessionWorktree(() => 'npm --prefix tests/e2e install lodash', true), 0)
})

test('a cd after the dependency change does not move it', () => {
  assert.equal(exitCodeInSessionWorktree(() => 'npm --prefix src/Web.Client install lodash && cd /tmp', false), 0)
})

test('allows a dependency change after a cd to the worktree root itself', () => {
  assert.equal(exitCodeInWorktree((root) => `cd "${root}" && npm --prefix src/Web.Client install lodash`, false), 0)
  assert.equal(exitCodeInWorktree((root) => `cd "${root}" && npm install lodash`, false), 0)
})

test('blocks a dependency change after a cd to the root while node_modules is a junction', () => {
  assert.equal(exitCodeInWorktree((root) => `cd "${root}" && npm --prefix src/Web.Client install lodash`, true), 2)
})

test('blocks a dependency change after a cd that is not exactly the worktree root', () => {
  assert.equal(exitCodeInWorktree((root) => `cd "${root}/src" && npm --prefix src/Web.Client install lodash`, false), 2)
  assert.equal(exitCodeInWorktree((root) => `cd ${root}/.. && npm install lodash`, false), 2)
  assert.equal(exitCodeInWorktree((root) => `cd "${root}" && pushd /tmp && npm install lodash`, false), 2)
  assert.equal(exitCodeInWorktree((root) => `cd "${root}" && cd /tmp && npm install lodash`, false), 2)
  assert.equal(exitCodeInWorktree((root) => `cd "${root}" && popd && npm install lodash`, false), 2)
  assert.equal(exitCodeInWorktree(() => 'cd && npm install lodash', false), 2)
  assert.equal(exitCodeInWorktree(() => 'cd ~ && npm install lodash', false), 2)
})

test('allows a backtick inside single quotes next to an rm', () => {
  assert.equal(exitCodeFor("rm -f build.log && echo '`date`'"), 0)
})

test('blocks an expansion inside an rm argument', () => {
  assert.equal(exitCodeFor('rm -f "$TARGET"'), 2)
})

test('blocks MSBuild property switches on every dotnet verb', () => {
  for (const command of [
    'dotnet build tydee.slnx -p:PreBuildEvent=calc',
    'dotnet build tydee.slnx /p:X=1',
    'dotnet test tydee.slnx -property:X=1',
    'dotnet run --project src/Web.Api /property:X=1',
    'dotnet restore tydee.slnx -p:X=1',
  ]) {
    assert.equal(exitCodeFor(command), 2, command)
  }
})

test('blocks MSBuild logger switches on dotnet build', () => {
  for (const command of [
    'dotnet build tydee.slnx -logger:FileLogger,Foo',
    'dotnet build tydee.slnx -l:FileLogger',
    'dotnet build tydee.slnx -dl:FileLogger',
  ]) {
    assert.equal(exitCodeFor(command), 2, command)
  }
})

test('blocks test adapter, logger, and settings switches on dotnet test', () => {
  for (const command of [
    'dotnet test tydee.slnx --test-adapter-path x',
    'dotnet test tydee.slnx --logger=trx',
    'dotnet test tydee.slnx --logger trx',
    'dotnet test tydee.slnx -l trx',
    'dotnet test tydee.slnx -s x.runsettings',
    'dotnet test tydee.slnx --settings x.runsettings',
  ]) {
    assert.equal(exitCodeFor(command), 2, command)
  }
})

test('blocks compose down or rm with volumes, through global options and the legacy binary', () => {
  for (const command of [
    'docker compose down -v',
    'docker compose down --volumes',
    'docker compose down -t 5 -v',
    'docker compose -p x down -v',
    'docker --context default compose down -v',
    'docker-compose down -v',
    'docker compose rm -v',
  ]) {
    assert.equal(exitCodeFor(command), 2, command)
  }
})

test('blocks docker volume rm', () => {
  assert.equal(exitCodeFor('docker volume rm tydee_postgres-data'), 2)
})

test('blocks the same forms when joined to other commands', () => {
  for (const command of [
    'dotnet build tydee.slnx && dotnet build -p:X=y',
    'echo x; docker compose down -v',
  ]) {
    assert.equal(exitCodeFor(command), 2, command)
  }
})

test('blocks the same forms inside powershell, pwsh, and cmd wrappers', () => {
  for (const command of [
    'powershell -Command "dotnet build tydee.slnx -p:X=y"',
    'pwsh -c "docker compose down -v"',
    'cmd /c "dotnet test tydee.slnx --logger trx"',
    'cmd /c "docker volume rm data"',
    `powershell -Command "Start-Process dotnet -ArgumentList 'build','-p:A=B'"`,
  ]) {
    assert.equal(exitCodeFor(command), 2, command)
  }
})

test('blocks the same forms nested in sh -c, env, and timeout', () => {
  for (const command of [
    'sh -c "dotnet build -p:A=B"',
    'env FOO=1 dotnet build -p:A=B',
    'timeout 60 dotnet build -p:A=B',
  ]) {
    assert.equal(exitCodeFor(command), 2, command)
  }
})

test('allows the bare dotnet forms this repo uses', () => {
  for (const command of [
    'dotnet build tydee.slnx',
    'dotnet test tydee.slnx',
    'dotnet test tydee.slnx --filter FullyQualifiedName~CreateIncomeCommandHandlerTests',
    'dotnet run --project src/Web.Api',
    'dotnet restore tydee.slnx',
    'dotnet ef migrations add AddX -p src/Infrastructure -s src/Web.Api',
  ]) {
    assert.equal(exitCodeFor(command), 0, command)
  }
})

test('allows compose up and down without volumes, and docker volume ls', () => {
  for (const command of [
    'docker compose up -d postgres',
    'docker compose down',
    'docker compose down --remove-orphans',
    'docker compose down -t 5',
    'docker compose logs -f',
    'docker volume ls',
  ]) {
    assert.equal(exitCodeFor(command), 0, command)
  }
})

test('allows the same text when no dotnet or docker command runs it', () => {
  for (const command of [
    'echo "dotnet build -p:A=B"',
    'echo docker compose down -v',
    'git commit -m "docs: explain dotnet build -p:A=B"',
    'powershell -ExecutionPolicy Bypass -File scripts/link-worktree-env.ps1 -Worktree ../x',
  ]) {
    assert.equal(exitCodeFor(command), 0, command)
  }
})

test('blocks bare MSBuild switches whose value is the next word', () => {
  for (const command of [
    'dotnet build tydee.slnx -p PreBuildEvent=calc',
    'dotnet test tydee.slnx --filter FullyQualifiedName~X -p PreBuildEvent=calc',
    'dotnet build tydee.slnx --property X=1',
    'dotnet build tydee.slnx -l FileLogger',
  ]) {
    assert.equal(exitCodeFor(command), 2, command)
  }
})

test('blocks slash-style test adapter and settings switches', () => {
  for (const command of [
    'dotnet vstest x.dll /TestAdapterPath:C:/x',
    'dotnet test tydee.slnx /settings:x.runsettings',
  ]) {
    assert.equal(exitCodeFor(command), 2, command)
  }
})

test('blocks docker volume remove, volume prune, and system prune with volumes', () => {
  for (const command of [
    'docker volume remove tydee_postgres-data',
    'docker volume prune -f',
    'docker system prune --volumes',
    'docker system prune -af --volumes',
  ]) {
    assert.equal(exitCodeFor(command), 2, command)
  }
})

test('blocks dotnet and docker arguments that use shell expansion', () => {
  for (const command of [
    "dotnet build tydee.slnx $'-p:X=1'",
    'dotnet build tydee.slnx {-p:X=1,}',
    'dotnet build tydee.slnx $(printf -- -p:X=1)',
    'docker compose down $(echo -v)',
  ]) {
    assert.equal(exitCodeFor(command), 2, command)
  }
})

test('blocks the same forms behind a command name the guard cannot resolve', () => {
  for (const command of ['$DN build -p:X=1', '$(which dotnet) build -p X=1']) {
    assert.equal(exitCodeFor(command), 2, command)
  }
})

test('blocks the same forms behind prefix wrappers that take option values', () => {
  for (const command of ['env -u FOO dotnet build -p:X=1', 'timeout -s KILL 60 dotnet build -p:X=1']) {
    assert.equal(exitCodeFor(command), 2, command)
  }
})

test('allows dotnet ef with -p and -s, including inside powershell', () => {
  for (const command of [
    'dotnet ef database update -p src/Infrastructure -s src/Web.Api',
    'powershell -Command "dotnet ef database update -p src/Infrastructure -s src/Web.Api"',
  ]) {
    assert.equal(exitCodeFor(command), 0, command)
  }
})

test('allows docker commands that keep volumes, and brace-formatted output', () => {
  for (const command of ['docker system prune -af', "docker ps --format '{{.Names}}'"]) {
    assert.equal(exitCodeFor(command), 0, command)
  }
})

test('allows a commit message that mentions -p', () => {
  assert.equal(exitCodeFor('git commit -m "fix: drop -p flag"'), 0)
})
