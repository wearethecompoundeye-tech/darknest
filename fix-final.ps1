# fix-final.ps1 – Fix scrolling, CSS bad selector, circle-trace button
$ErrorActionPreference = "Stop"
$root = Get-Location

# Backup current state
$backupDir = Join-Path $root "backup-final-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory $backupDir -Force | Out-Null
Copy-Item css/styles.css $backupDir
Copy-Item js/core/game.ts $backupDir
Write-Host "Backup saved to $backupDir" -ForegroundColor Cyan

# ── 1. Fix CSS ──────────────────────────────────
$css = Get-Content css/styles.css -Encoding UTF8

# Remove any line that is exactly ".left-panel," (with optional spaces)
$css = $css | Where-Object { $_ -notmatch '^\s*\.left-panel,\s*$' }

# Remove the broken minified rule if present
$css = $css | ForEach-Object {
    if ($_ -match '^\s*\.left-panel,\s*\.left-panel::-webkit-scrollbar,\s*\.right-panel::-webkit-scrollbar\{.*') { } else { $_ }
}

# Add correct scroll behaviour at the end
$scrollRules = @"
/* Scroll fixes */
.left-panel,
.right-panel {
  overflow-y: auto;
  overflow-x: hidden;
}
.left-panel::-webkit-scrollbar,
.right-panel::-webkit-scrollbar {
  display: none;
}
"@
$css += $scrollRules -split "`n"
Set-Content css/styles.css $css -Encoding UTF8 -NoNewline
Write-Host "✓ CSS fixed – bad selector removed, scroll enabled" -ForegroundColor Green

# ── 2. Fix game.ts – circle‑trace button ──────────
$game = Get-Content js/core/game.ts -Encoding UTF8
$newGame = foreach ($line in $game) {
    if ($line -match 'm\.startCircleTracing\(\)') {
        $line -replace 'm\.startCircleTracing\(\)', 'm.initCircleTracing()'
    } else { $line }
}
Set-Content js/core/game.ts $newGame -Encoding UTF8 -NoNewline
Write-Host "✓ game.ts patched – traceCircleBtn calls initCircleTracing()" -ForegroundColor Green

# ── 3. Commit & push ────────────────────────────
git add -A
git commit -m "fix: scrolling, bad CSS selector, correct circle-trace export"
git push
Write-Host "✓ Changes pushed to GitHub. Refresh your browser now." -ForegroundColor Green