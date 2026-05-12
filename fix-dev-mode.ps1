$root = "D:\DARKNEST"
$devPath = Join-Path $root "ts\core\dev-mode.ts"

# Backup
Copy-Item $devPath "$devPath.bak" -Force

$content = Get-Content $devPath -Raw

# Pattern: the whole document.addEventListener('keydown', …); block
$escapedStart = [Regex]::Escape("document.addEventListener('keydown', (e) => {")
$pattern = $escapedStart + '[\s\S]*?\}\)\s*\)\s*;'

# Replacement: wrap the matched block in the dev‑only condition
# $0 refers to the entire match in PowerShell -replace
$replacement = "if (import.meta.env.DEV) {`r`n  $0`r`n}"

$newContent = $content -replace $pattern, $replacement

Set-Content $devPath $newContent -NoNewline

Write-Host "Gated dev mode behind import.meta.env.DEV in dev-mode.ts"