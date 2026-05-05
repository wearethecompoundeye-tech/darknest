<# 
  KALGOTH'S GAZE – ONE-CLICK FIX & PUSH SCRIPT
  ---------------------------------------------
  Applies critical fixes, commits, and pushes to GitHub.
  Run from D:\DARKNEST.
#>

$ErrorActionPreference = "Stop"

Write-Host "=== Backing up original files ===" -ForegroundColor Cyan
$backupDir = "backup-before-fix-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

# ── 1. Mock askOllama in ai-engine.ts ─────────────────────────
$file1 = "js/ai/ai-engine.ts"
if (Test-Path $file1) {
    Copy-Item $file1 "$backupDir/ai-engine.ts.bak"
    $content = Get-Content $file1 -Raw
    # Replace the whole function body with a mock
    $content = $content -replace '(?s)export async function askOllama\s*\([^)]*\)\s*:\s*Promise<string>\s*\{[^}]*\}',
                               "export async function askOllama(messages: { role: string; content: string }[]): Promise<string> {`n  // MOCK for testing – no Ollama required`n  return `"I hear you, Acolyte. The shadows listen.`";`n}"
    Set-Content $file1 $content -NoNewline
    Write-Host "✅ Mocked askOllama" -ForegroundColor Green
} else { Write-Warning "$file1 not found" }

# ── 2. Kalgoth taunts – remove AI call ─────────────────────────
$file2 = "js/core/game.ts"
if (Test-Path $file2) {
    Copy-Item $file2 "$backupDir/game.ts.bak"
    $content = Get-Content $file2 -Raw

    # Remove the try/catch block inside setTimeout and just use the fallback line.
    # We'll replace the pattern from "try {" to "schedule();" inclusive.
    $pattern = '(?s)(this\.kalgothTauntInterval = window\.setTimeout\(async \(\) =>) \{.*?schedule\(\);.*?\}, delay\)'
    $replacement = '`$1 {`n          addLog(`KALGOTH: *A distant, mocking laugh echoes.*`, false, "void");`n          schedule();`n        }, delay'

    $content = $content -replace $pattern, $replacement
    Set-Content $file2 $content -NoNewline
    Write-Host "✅ Patched Kalgoth taunts" -ForegroundColor Green
}

# ── 3. Add missing button bindings ─────────────────────────────
# We look for the last binding line inside bindUIButtons() and append after it.
if (Test-Path $file2) {
    $content = Get-Content $file2 -Raw

    # Trace Circle button
    if ($content -notmatch "traceCircleBtn") {
        $content = $content -replace '(?<=document\.getElementById\(''whispSpriteClick''\)\?\.addEventListener.*?\n)',
                                    "`n    document.getElementById('traceCircleBtn')?.addEventListener('click', () => `n      import('../minigames/circle-trace.js').then(m => m.startCircleTracing())`n    );`n"
        Set-Content $file2 $content -NoNewline
        Write-Host "✅ Added traceCircleBtn binding" -ForegroundColor Green
    }

    # Tutorial button
    if ($content -notmatch "tutorialBtn") {
        $content = $content -replace '(?<=document\.getElementById\(''whispSpriteClick''\)\?\.addEventListener.*?\n)',
                                    "`n    document.getElementById('tutorialBtn')?.addEventListener('click', () => `n      import('../ui/tutorial.js').then(m => m.showTutorial())`n    );`n"
        Set-Content $file2 $content -NoNewline
        Write-Host "✅ Added tutorialBtn binding" -ForegroundColor Green
    }
}

# ── 4. Fix CSS (scrollbar hide + fade‑in animation) ────────────
$file3 = "css/styles.css"
if (Test-Path $file3) {
    Copy-Item $file3 "$backupDir/styles.css.bak"
    $content = Get-Content $file3 -Raw

    # a) Fix the broken left-panel/right-panel scrollbar block
    $brokenCss = "\.left-panel, \r?\n\r?\n\.left-panel::-webkit-scrollbar,\r?\n\.right-panel::-webkit-scrollbar \{[\s\S]*?\}"
    $fixedCss = @'
.left-panel,
.right-panel {
  overflow-y: auto;
}
.left-panel::-webkit-scrollbar,
.right-panel::-webkit-scrollbar {
  display: none;
}
'@
    $content = $content -replace $brokenCss, $fixedCss

    # b) Add missing fade-in animation
    if ($content -notmatch "fadeInPanel") {
        $insertAfter = "\.left-panel,\s*\.center-stack,\s*\.right-panel\s*\{"
        $newRule = @'

.left-panel, .center-stack, .right-panel {
  animation: fadeInPanel 0.6s ease-out forwards;
}
'@
        $content = $content -replace $insertAfter, "$&`n$newRule"
    }

    Set-Content $file3 $content -NoNewline
    Write-Host "✅ Fixed CSS scrollbar and fade-in" -ForegroundColor Green
}

# ── 5. Commit and push ─────────────────────────────────────────
Write-Host "=== Committing changes ===" -ForegroundColor Cyan
git add -A
try {
    git commit -m "fix: mock LLM, wire buttons, fix CSS"
} catch {
    Write-Host "Nothing to commit or commit failed: $_" -ForegroundColor Yellow
}

Write-Host "=== Pushing to GitHub ===" -ForegroundColor Cyan
try {
    git push
    Write-Host "✅ All fixes applied and pushed!" -ForegroundColor Green
} catch {
    Write-Host "❌ Push failed. You may need to authenticate. Run: git push --set-upstream origin main" -ForegroundColor Red
}

Write-Host "Backup of original files saved in: $backupDir" -ForegroundColor Cyan