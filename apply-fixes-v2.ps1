<#
.SYNOPSIS
    Kalgoth's Gaze – Robust Fix & Push Script (v2)
    Fixes:
      1. Mock askOllama (no LLM needed)
      2. Fix Kalgoth taunts (remove AI call, keep hardcoded line)
      3. Add missing button bindings (traceCircleBtn, tutorialBtn)
      4. Fix broken CSS (scrollbar hide + fade‑in)
    Then commits and pushes to GitHub.
#>

$ErrorActionPreference = "Stop"
$projectRoot = Get-Location

Write-Host "=== Creating backup ===" -ForegroundColor Cyan
$backupDir = Join-Path $projectRoot "backup-v2-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

# ────────────────────────────────────────────
# Helper: safe file editing – replace a block of lines
# ────────────────────────────────────────────
function Replace-Lines {
    param(
        [string]$FilePath,
        [string]$StartPattern,   # line exactly equals this (trimmed)
        [string]$EndPattern,     # line exactly equals this (trimmed) after the block
        [string[]]$NewLines      # replacement lines
    )
    $lines = Get-Content $FilePath -Encoding UTF8
    $newContent = @()
    $skip = $false
    $replaced = $false
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $trimmed = $lines[$i].Trim()
        if (-not $skip -and $trimmed -eq $StartPattern) {
            # Start of block to replace
            $newContent += $NewLines
            $skip = $true
            $replaced = $true
            continue
        }
        if ($skip) {
            if ($trimmed -eq $EndPattern) {
                # End of block – we stop skipping and do NOT add this line
                $skip = $false
            }
            # otherwise skip all lines
            continue
        }
        $newContent += $lines[$i]
    }
    # If we didn't find the block (maybe already fixed), do nothing
    if (-not $replaced) { return $false }
    Set-Content -Path $FilePath -Value $newContent -Encoding UTF8 -NoNewline
    return $true
}

# ────────────────────────────────────────────
# 1. Fix ai-engine.ts – mock askOllama
# ────────────────────────────────────────────
$aiEngineFile = "js/ai/ai-engine.ts"
if (Test-Path $aiEngineFile) {
    Copy-Item $aiEngineFile (Join-Path $backupDir "ai-engine.ts.bak")
    $mockFunction = @(
        "export async function askOllama(messages: { role: string; content: string }[]): Promise<string> {",
        "  // MOCK for testing – no Ollama needed",
        '  return "I hear you, Acolyte. The shadows listen.";',
        "}"
    )
    # We'll replace the whole function. We need to find the start line: "export async function askOllama("
    # and end line: "}" (after the function body). But because the function may have multiple lines, we need a robust method.
    # Simpler: find the line that matches "export async function askOllama" and then remove all lines until a line that is exactly "}" at the same indentation? 
    # We'll use a state-based approach: read all lines, locate the start, then skip until we find a closing brace that is alone on a line.
    $lines = Get-Content $aiEngineFile -Encoding UTF8
    $newLines = @()
    $inMock = $false
    $braceCount = 0
    $startFound = $false
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]
        if (-not $startFound -and $line -match '^export async function askOllama') {
            $startFound = $true
            $newLines += $mockFunction
            # skip the whole function
            # we need to skip until the matching closing brace
            $inMock = $true
            $braceCount = 1  # function opening brace
            continue
        }
        if ($inMock) {
            # count braces to find the end of the function
            $openBraces = ($line.ToCharArray() | Where-Object { $_ -eq '{' }).Count
            $closeBraces = ($line.ToCharArray() | Where-Object { $_ -eq '}' }).Count
            $braceCount += $openBraces - $closeBraces
            if ($braceCount -le 0) {
                $inMock = $false
                # The line likely contains the closing brace; we skip it
            }
            continue
        }
        $newLines += $line
    }
    if ($startFound) {
        Set-Content -Path $aiEngineFile -Value $newLines -Encoding UTF8 -NoNewline
        Write-Host "✓ Mocked askOllama" -ForegroundColor Green
    } else {
        Write-Warning "Could not find askOllama function in $aiEngineFile"
    }
} else {
    Write-Warning "$aiEngineFile not found"
}

# ────────────────────────────────────────────
# 2. Fix game.ts – Kalgoth taunts & button bindings
# ────────────────────────────────────────────
$gameFile = "js/core/game.ts"
if (Test-Path $gameFile) {
    Copy-Item $gameFile (Join-Path $backupDir "game.ts.bak")
    $lines = Get-Content $gameFile -Encoding UTF8

    # --- 2a. Replace startKalgothTaunts method ---
    $newTauntMethod = @(
        "  private startKalgothTaunts(): void {",
        "    const minInterval = 120_000;",
        "    const maxInterval = 180_000;",
        "    const schedule = () => {",
        "      const delay = minInterval + Math.random() * (maxInterval - minInterval);",
        "      this.kalgothTauntInterval = window.setTimeout(() => {",
        '        addLog(`KALGOTH: *A distant, mocking laugh echoes.*`, false, "void");',
        "        schedule();",
        "      }, delay);",
        "    };",
        "    schedule();",
        "  }"
    )
    $foundTaunt = $false
    $outLines = @()
    $skipping = $false
    $braceStack = @()  # stack for braces
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]
        $trimmed = $line.Trim()
        if (-not $skipping -and $trimmed -match '^private startKalgothTaunts\(\)') {
            $skipping = $true
            $foundTaunt = $true
            $outLines += $newTauntMethod
            # We need to skip until the method's closing brace. We'll count braces.
            # Starting from this line, we haven't counted yet. The method's opening brace is on the same line or next.
            # We'll count braces from this line onward.
            $braceCount = 0
            $startIndex = $i
            while ($i -lt $lines.Count) {
                $openB = ($lines[$i].ToCharArray() | Where-Object { $_ -eq '{' }).Count
                $closeB = ($lines[$i].ToCharArray() | Where-Object { $_ -eq '}' }).Count
                $braceCount += $openB - $closeB
                if ($braceCount -le 0 -and $openB -eq 0 -and $closeB -gt 0) {
                    # We've passed the closing brace
                    $i++  # move past this line (the one with closing brace)
                    break
                }
                $i++
            }
            # Now we are at the line after the closing brace, we want to continue from the next line
            continue
        }
        if (-not $skipping) {
            $outLines += $line
        }
    }
    if (-not $foundTaunt) {
        Write-Warning "Could not find startKalgothTaunts method; skipping"
        $outLines = $lines  # revert
    }

    # --- 2b. Add button bindings ---
    # Check if traceCircleBtn binding already exists
    $hasTraceBtn = ($outLines -match 'traceCircleBtn')
    $hasTutorialBtn = ($outLines -match 'tutorialBtn')
    if (-not $hasTraceBtn -or -not $hasTutorialBtn) {
        # Find the line that contains 'whispSpriteClick' as the anchor
        $anchorIndex = -1
        for ($i = 0; $i -lt $outLines.Count; $i++) {
            if ($outLines[$i] -match 'whispSpriteClick') {
                $anchorIndex = $i
                break
            }
        }
        if ($anchorIndex -ge 0) {
            $newBindings = @()
            if (-not $hasTraceBtn) {
                $newBindings += "    document.getElementById('traceCircleBtn')?.addEventListener('click', () => import('../minigames/circle-trace.js').then(m => m.startCircleTracing()));"
            }
            if (-not $hasTutorialBtn) {
                $newBindings += "    document.getElementById('tutorialBtn')?.addEventListener('click', () => import('../systems/tutorial-listeners.js').then(m => m.showTutorial()));"
            }
            # Insert after the anchor line
            $outLines = @(
                $outLines[0..$anchorIndex]
                $newBindings
                $outLines[($anchorIndex+1)..($outLines.Count-1)]
            )
            Write-Host "✓ Added missing button bindings" -ForegroundColor Green
        } else {
            Write-Warning "Could not find anchor line for button bindings"
        }
    }

    Set-Content -Path $gameFile -Value $outLines -Encoding UTF8 -NoNewline
    Write-Host "✓ Fixed Kalgoth taunts" -ForegroundColor Green
} else {
    Write-Warning "$gameFile not found"
}

# ────────────────────────────────────────────
# 3. Fix styles.css – scrollbar & fade‑in
# ────────────────────────────────────────────
$cssFile = "css/styles.css"
if (Test-Path $cssFile) {
    Copy-Item $cssFile (Join-Path $backupDir "styles.css.bak")
    $lines = Get-Content $cssFile -Encoding UTF8

    # Remove the broken block: lines that exactly match ".left-panel," (only that), and the following broken rule.
    # We'll filter out lines that are part of that block. Known signature: the line ".left-panel," followed by empty line, then ".left-panel::-webkit-scrollbar," etc.
    $newCss = @()
    $skipBlock = $false
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $trimmed = $lines[$i].Trim()
        if ($trimmed -eq ".left-panel,") {
            # Start of broken block; skip until we find a line that starts with "}" (end of rule)
            $skipBlock = $true
            continue
        }
        if ($skipBlock) {
            if ($trimmed -eq "}") {
                $skipBlock = $false
            }
            continue
        }
        $newCss += $lines[$i]
    }

    # Now add correct scrollbar rules if not already present
    $hasScrollRules = ($newCss -match '\.left-panel,\s*\.right-panel\s*\{') -or ($newCss -match '\.left-panel::-webkit-scrollbar')
    if (-not $hasScrollRules) {
        $scrollRules = @(
            "",
            "/* Fixed scrollbar hide */",
            ".left-panel,",
            ".right-panel {",
            "  overflow-y: auto;",
            "}",
            ".left-panel::-webkit-scrollbar,",
            ".right-panel::-webkit-scrollbar {",
            "  display: none;",
            "}"
        )
        $newCss += $scrollRules
        Write-Host "✓ Added scrollbar fix" -ForegroundColor Green
    }

    # Add fadeInPanel if missing
    if ($newCss -notmatch 'fadeInPanel') {
        $fadeRules = @(
            "",
            "/* Fade-in animation for panels */",
            ".left-panel, .center-stack, .right-panel {",
            "  animation: fadeInPanel 0.6s ease-out forwards;",
            "}"
        )
        $newCss += $fadeRules
        Write-Host "✓ Added fadeInPanel" -ForegroundColor Green
    }

    Set-Content -Path $cssFile -Value $newCss -Encoding UTF8 -NoNewline
} else {
    Write-Warning "$cssFile not found"
}

# ────────────────────────────────────────────
# 4. Commit & Push
# ────────────────────────────────────────────
Write-Host "`n=== Committing and pushing ===" -ForegroundColor Cyan
git add -A
$commitResult = git commit -m "fix: mock LLM, fix taunts, wire buttons, fix CSS" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Commit may have failed or nothing to commit: $commitResult" -ForegroundColor Yellow
} else {
    Write-Host "✓ Committed" -ForegroundColor Green
}

$pushResult = git push 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Push failed: $pushResult" -ForegroundColor Red
    Write-Host "You may need to authenticate. Run: git push --set-upstream origin main" -ForegroundColor Yellow
} else {
    Write-Host "✓ Pushed to GitHub" -ForegroundColor Green
}

Write-Host "`nBackup saved in: $backupDir" -ForegroundColor Cyan
Write-Host "Done." -ForegroundColor Green