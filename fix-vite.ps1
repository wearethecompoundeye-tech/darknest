$root = "D:\PROJECTS\darknest"
$vitePath = Join-Path $root "vite.config.ts"

Copy-Item $vitePath "$vitePath.bak" -Force
$content = Get-Content $vitePath -Raw

$escapedStart = [Regex]::Escape("server.middlewares.use('/api/save-cards', (req, res, next) => {")
$pattern = $escapedStart + '[\s\S]*?\}\)\s*\)\s*;'
$newContent = $content -replace $pattern, ''

Set-Content $vitePath $newContent -NoNewline
Write-Host "Removed /api/save-cards middleware from vite.config.ts"
