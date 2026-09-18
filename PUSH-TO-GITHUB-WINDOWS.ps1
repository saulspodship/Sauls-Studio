# Saul's Podship Studio - one-click GitHub publisher for Windows
# This script copies the source folder it is stored in to the repository cloned in Documents\GitHub.
# It does not read, display, or upload passwords, tokens, API keys, or deploy keys.

$ErrorActionPreference = 'Stop'
$repoUrl = 'https://github.com/Solatjamil/Sauls-Podship-Studio.git'
$source = $PSScriptRoot
$target = Join-Path $env:USERPROFILE 'Documents\GitHub\Sauls-Podship-Studio'
$excluded = @('.git', 'node_modules', '.env')

function Stop-WithMessage([string]$message) {
  Write-Host ''
  Write-Host $message -ForegroundColor Red
  Write-Host ''
  exit 1
}

Write-Host ''
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host "     Saul's Podship Studio - GitHub Publisher" -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host "Source: $source"
Write-Host "Target: $target"
Write-Host ''

try {
  if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Stop-WithMessage 'Git was not found. Install GitHub Desktop from https://desktop.github.com/, sign in, then run this file again.'
  }

  if (-not (Test-Path (Join-Path $source 'package.json'))) {
    Stop-WithMessage 'This publisher must be run from inside the extracted podship-video-studio folder. package.json was not found beside this script.'
  }

  if (-not (Test-Path (Join-Path $target '.git'))) {
    $targetParent = Split-Path $target -Parent
    New-Item -ItemType Directory -Force -Path $targetParent | Out-Null
    if ((Test-Path $target) -and ((Get-ChildItem -Force $target | Measure-Object).Count -gt 0)) {
      Stop-WithMessage "The target folder exists but is not a Git repository: $target. Rename or remove that folder, then run this file again."
    }
    Write-Host 'Cloning your GitHub repository. GitHub may open a secure sign-in window...' -ForegroundColor Yellow
    & git clone $repoUrl $target
    if ($LASTEXITCODE -ne 0) { Stop-WithMessage 'GitHub clone failed. Confirm you are signed in to GitHub Desktop and that the repository name is correct.' }
  }

  Write-Host 'Copying Saul''s Podship Studio files into the GitHub repository...' -ForegroundColor Yellow
  Get-ChildItem -LiteralPath $source -Force |
    Where-Object { $excluded -notcontains $_.Name } |
    ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $target -Recurse -Force -ErrorAction Stop }

  Push-Location $target
  try {
    Write-Host 'Adding changes to Git...' -ForegroundColor Yellow
    & git add -A
    if ($LASTEXITCODE -ne 0) { Stop-WithMessage 'Git could not add the files.' }

    & git diff --cached --quiet
    $hasChanges = $LASTEXITCODE -ne 0
    if (-not $hasChanges) {
      Write-Host 'The repository already contains these files. Nothing new needs to be pushed.' -ForegroundColor Green
      Start-Process 'https://github.com/Solatjamil/Sauls-Podship-Studio'
      exit 0
    }

    Write-Host 'Creating commit...' -ForegroundColor Yellow
    & git commit -m "Deploy Saul's Podship Studio"
    if ($LASTEXITCODE -ne 0) { Stop-WithMessage 'Git could not create the commit. In GitHub Desktop, set your Git name/email once, then run this file again.' }

    Write-Host 'Pushing to GitHub...' -ForegroundColor Yellow
    & git push
    if ($LASTEXITCODE -ne 0) { Stop-WithMessage 'Git could not push. Complete the official GitHub sign-in if prompted, then run this file again.' }
  }
  finally { Pop-Location }

  Write-Host ''
  Write-Host 'SUCCESS — Saul''s Podship Studio was pushed to GitHub.' -ForegroundColor Green
  Write-Host 'Vercel should start a new deployment automatically.' -ForegroundColor Green
  Start-Process 'https://github.com/Solatjamil/Sauls-Podship-Studio'
}
catch {
  Write-Host ''
  Write-Host 'PUBLISHING STOPPED:' -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Red
  Write-Host ''
  exit 1
}
