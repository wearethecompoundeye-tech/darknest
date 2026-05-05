<#
.SYNOPSIS
  Cleans up dead / deprecated files from the Kalgoth's Gaze project.
.DESCRIPTION
  Removes deprecated stubs, failed braided‑rite files, and unused HTML placeholders.
  Uses simple, safe PowerShell; no regex or syntax errors.
#>

$ErrorActionPreference = "Stop"

# ── Base directory (run from project root) ──────────────────────
$root = Get-Location
Write-Host "🧹 Cleaning project at $root" -ForegroundColor Cyan

# ── Files to delete (no trailing commas, no inline comments) ────
$deadFiles = @(
    "js/ui/battle-actions.ts"
    "js/systems/gaze-battle-logic.ts"
    "js/ui/whisp-commentary.ts"
    "js/minigames/braided-rite.ts"
    "js/minigames/braided-trace.ts"
    "braided-trace.html"
    "public/editor/card-editor.html"
)

foreach ($file in $deadFiles) {
    $full = Join-Path $root $file
    if (Test-Path $full) {
        Remove-Item $full -Force
        Write-Host "  ✕ Removed $file" -ForegroundColor DarkGray
    } else {
        Write-Host "  • Skipped $file (not found)" -ForegroundColor Gray
    }
}

# ── Clean index.html of unused modal divs ───────────────────────
$htmlPath = Join-Path $root "index.html"
if (Test-Path $htmlPath) {
    $html = Get-Content $htmlPath -Raw
    $htmlBefore = $html

    # Remove the runeTraceModal div (no associated minigame)
    $patternRuneTrace = '<div id="runeTraceModal".*?</div>'
    $html = $html -replace $patternRuneTrace, ''

    # Remove the whispStatsModal div (stats now in chat)
    $patternWhispStats = '<div id="whispStatsModal".*?</div>'
    $html = $html -replace $patternWhispStats, ''

    if ($html -ne $htmlBefore) {
        Set-Content $htmlPath $html -NoNewline
        Write-Host "  ✓ Cleaned unused modals in index.html" -ForegroundColor Green
    } else {
        Write-Host "  - No changes to index.html" -ForegroundColor Gray
    }
}

Write-Host "`n📋 Verify no source still imports these deleted modules." -ForegroundColor Yellow
Write-Host "   - battle-actions.ts → use card-battle.ts"
Write-Host "   - gaze-battle-logic.ts → confrontHollow in gaze-event.ts"
Write-Host "   - whisp-commentary.ts → whisp-chat.ts"
Write-Host "   - braided-rite.ts → no longer needed"
Write-Host "`n✅ Cleanup complete."