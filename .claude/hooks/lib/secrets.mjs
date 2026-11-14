// Secret and local-only file rules shared by guard-write and guard-bash.

// Real secrets: .env files (but not .env.example, .env.template, .env.sample), key and
// certificate files, and the development API settings.
export function isSecretBasename(base) {
  if (/^\.env(\..+)?$/i.test(base) && !/\.(example|template|sample)$/i.test(base)) {
    return true
  }
  if (/\.(pfx|pem|key)$/i.test(base)) {
    return true
  }
  return /^appsettings\.Development\.json$/i.test(base) || /^appsettings\..+\.local\.json$/i.test(base)
}

// Local-only Claude files that are never committed (see CLAUDE.md).
export function isLocalOnlyPath(normalizedPath) {
  return /(^|\/)\.claude\/(settings\.local\.json$|plans\/|cache\/)/.test(normalizedPath)
}
