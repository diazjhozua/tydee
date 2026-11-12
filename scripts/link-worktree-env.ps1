<#
.SYNOPSIS
Creates the local-only config files once in the main checkout and hard-links them into git worktrees.

.DESCRIPTION
These files are gitignored, so a new worktree starts without them:
  - src/Web.Api/appsettings.Development.json   (API: database connection, JWT secret)
  - src/Web.Client/.env.local                  (client: API and app URLs)

Steps:
  1. If a file is missing in the main checkout, create it with local dev defaults.
     The database values match docker-compose.yml. The JWT secret is random.
     Existing files are never overwritten.
  2. Hard-link each file into every worktree that does not already have it.
     A hard link needs no admin rights on the same drive, and an edit made in
     one place shows up everywhere.

The API also reads user secrets, which every worktree shares because
src/Web.Api/Web.Api.csproj sets one UserSecretsId.

.PARAMETER Worktree
Path to one worktree. Omit it to link every worktree in `git worktree list`.

.EXAMPLE
powershell -ExecutionPolicy Bypass -File scripts\link-worktree-env.ps1

.EXAMPLE
powershell -ExecutionPolicy Bypass -File scripts\link-worktree-env.ps1 -Worktree .claude\worktrees\feat+12-something
#>
param(
    [string]$Worktree
)

$ErrorActionPreference = "Stop"

# Local defaults. The database values come from docker-compose.yml.
$apiSettings = @'
{
  "ConnectionStrings": {
    "Database": "Host=localhost;Port=5432;Database=tydee;Username=tydee;Password=Tydee_Dev123!"
  },
  "Jwt": {
    "Secret": "__JWT_SECRET__"
  }
}
'@

$clientEnv = @'
NEXT_PUBLIC_API_URL=http://localhost:5000
API_URL=http://localhost:5000
NEXT_PUBLIC_APP_URL=http://localhost:3000
'@

# GUIDs are random and work under PowerShell's constrained language mode,
# which blocks direct .NET crypto calls.
$jwtSecret = [guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N")

$localFiles = @(
    @{ Relative = "src\Web.Api\appsettings.Development.json"; Content = $apiSettings.Replace("__JWT_SECRET__", $jwtSecret) },
    @{ Relative = "src\Web.Client\.env.local"; Content = $clientEnv }
)

# `git worktree list` always prints the main checkout first.
$all = git worktree list --porcelain |
    Where-Object { $_ -like "worktree *" } |
    ForEach-Object { $_.Substring("worktree ".Length) }

$main = (Resolve-Path $all[0]).Path

if ($Worktree) {
    $targets = @((Resolve-Path $Worktree).Path)
} else {
    $targets = $all | Select-Object -Skip 1 | ForEach-Object { (Resolve-Path $_).Path }
}

foreach ($file in $localFiles) {
    $source = Join-Path $main $file.Relative

    if (-not (Test-Path $source)) {
        Set-Content -Path $source -Value $file.Content -Encoding utf8 -NoNewline
        Write-Host "created: $source"
    } else {
        Write-Host "exists, not overwritten: $source"
    }

    foreach ($target in $targets) {
        if ($target -eq $main) {
            continue
        }

        $dest = Join-Path $target $file.Relative

        if (Test-Path $dest) {
            Write-Host "already present, skipped: $dest"
            continue
        }

        New-Item -ItemType HardLink -Path $dest -Target $source | Out-Null
        Write-Host "linked: $dest"
    }
}
