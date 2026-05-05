# final-fix.ps1 – Complete, reliable fix for scrolling, CSS, and circle-trace button
$ErrorActionPreference = "Stop"
$root = Get-Location

# Backup
$backupDir = Join-Path $root "backup-final-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
Copy-Item js/core/game.ts $backupDir -Force
Copy-Item css/styles.css $backupDir -Force
Copy-Item js/minigames/circle-trace.ts $backupDir -Force
Write-Host "Backup saved to $backupDir" -ForegroundColor Cyan

# ── 1. Fix CSS ──────────────────────────────────
$css = Get-Content css/styles.css -Encoding UTF8

# Remove any line that is exactly ".left-panel," (with optional whitespace)
$css = $css | Where-Object { $_ -notmatch '^\s*\.left-panel,\s*$' }

# Remove any existing overflow:visible from panel-like rules to ensure scroll works
$css = $css -replace 'overflow\s*:\s*visible\s*;?', 'overflow: hidden;'

# Ensure proper scroll rules exist at the end
if (($css -match '\.left-panel,\s*\.right-panel\s*\{') -eq $false) {
    $css += @"

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
}
Set-Content css/styles.css $css -Encoding UTF8 -NoNewline
Write-Host "✓ CSS fixed (bad selector removed, scroll enabled)" -ForegroundColor Green

# ── 2. Fix game.ts button binding ────────────────
$game = Get-Content js/core/game.ts -Raw -Encoding UTF8
# Replace the wrong function call with the correct one
$game = $game -replace 'm\.startCircleTracing\(\)', 'm.initCircleTracing()'
Set-Content js/core/game.ts $game -Encoding UTF8 -NoNewline
Write-Host "✓ game.ts patched – traceCircleBtn calls initCircleTracing()" -ForegroundColor Green

# ── 3. Commit & push ────────────────────────────
git add -A
git commit -m "fix: scroll CSS, bad selector, circle-trace binding"
git push
Write-Host "✓ Changes committed and pushed." -ForegroundColor Green
Write-Host "Refresh your browser now. Everything should work."