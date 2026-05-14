# full-check.ps1 – Kalgoth's Gaze integrity check & serve
$ErrorActionPreference = "Stop"

Write-Host "============================================"
Write-Host " Kalgoth's Gaze - Full Check & Serve"
Write-Host "============================================"
Write-Host ""

# 1. Install dependencies
Write-Host "[1/5] Installing dependencies..."
npm install --silent
Write-Host "OK.`n"

# 2. Lint
Write-Host "[2/5] Linting..."
npm run lint
Write-Host "OK.`n"

# 3. Unit tests
Write-Host "[3/5] Running unit tests..."
npm test
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Tests failed." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "OK.`n"

# 4. Build
Write-Host "[4/5] Building..."
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Build failed." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "OK.`n"

# 5. Serve
Write-Host "[5/5] Starting preview server..."
Start-Process "http://127.0.0.1:4173/darknest/"
npx vite preview --host 127.0.0.1 --port 4173