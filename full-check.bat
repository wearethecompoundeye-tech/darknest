@echo off
cd /d D:\DARKNEST

echo ============================================
echo  Kalgoth's Gaze - Full Check and Serve
echo ============================================
echo.

echo [1/5] Installing dependencies...
call npm install --silent
if %errorlevel% neq 0 (
    echo ERROR: npm install failed.
    pause
    exit /b 1
)
echo OK.

echo.
echo [2/5] Linting...
call npm run lint
if %errorlevel% neq 0 (
    echo Lint returned errors/warnings (see above).
)
echo OK.

echo.
echo [3/5] Running unit tests...
call npm test
if %errorlevel% neq 0 (
    echo ERROR: Tests failed.
    pause
    exit /b 1
)
echo OK.

echo.
echo [4/5] Building...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Build failed.
    pause
    exit /b 1
)
echo OK.

echo.
echo [5/5] Starting preview server...
start "" "http://127.0.0.1:4173/darknest/"
npx vite preview --host 127.0.0.1 --port 4173
pause