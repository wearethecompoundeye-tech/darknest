@echo off
setlocal enabledelayedexpansion
title Kalgoth's Gaze - Launcher
color 0A
echo.
echo   ========================================================
echo              KALGOTH'S GAZE - UNDERCRYPT
echo   ========================================================
echo.

:: ---------- Configuration ----------
set PORT=3000
set GAME_ROOT=%~dp0
cd /d "%GAME_ROOT%"

:: ---------- Check Node.js ----------
echo [1/6] Checking for Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found.
    pause
    exit /b 1
)

:: ---------- Optional: Start Ollama ----------
set OLLAMA_EXE=ollama\ollama.exe
if exist "%OLLAMA_EXE%" (
    echo [2/6] Starting Ollama service...
    start /B "" "%OLLAMA_EXE%" serve > ollama.log 2>&1
    echo Waiting for Ollama to respond...
    set /a count=0
    :wait_ollama
    timeout /t 2 /nobreak >nul
    set /a count+=1
    "%OLLAMA_EXE%" list >nul 2>&1
    if errorlevel 1 (
        if !count! lss 10 goto wait_ollama
        echo [WARNING] Ollama not responding, game will use offline fallbacks.
    ) else (
        echo Ollama is running.
        echo Pulling model gurubot/TopicalStorm-uncensored...
        "%OLLAMA_EXE%" pull gurubot/TopicalStorm-uncensored || echo [WARNING] Model pull failed.
    )
) else (
    echo [2/6] Ollama not found at %OLLAMA_EXE% - AI will be offline.
)

:: ---------- Install deps if missing ----------
echo [3/6] Checking dependencies...
if not exist "node_modules\vite" (
    echo Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] npm install failed.
        pause
        exit /b 1
    )
)
echo Dependencies OK.

:: ---------- Clear Vite cache ----------
echo [4/6] Clearing Vite cache...
if exist "node_modules\.vite" rmdir /s /q "node_modules\.vite" 2>nul
if exist ".vite" rmdir /s /q ".vite" 2>nul

:: ---------- Kill any process using port 3000 ----------
echo [5/6] Freeing port %PORT%...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :%PORT% ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>nul
echo Port is free.

:: ---------- Start Vite and wait for HTTP 200 ----------
echo [6/6] Starting Vite development server...
start "Vite" /B npx vite --force --host --port %PORT%
echo Waiting for server to be ready...

set RETRIES=0
:wait_server
timeout /t 1 >nul
curl -s -o nul http://localhost:%PORT% >nul 2>&1
if %errorlevel% equ 0 goto :open_browser
set /a RETRIES+=1
if %RETRIES% leq 30 goto :wait_server
echo [ERROR] Server did not respond after 30 seconds.
pause
exit /b 1

:open_browser
echo Server is ready.
start "" http://localhost:%PORT%
echo.
echo ================================================
echo   Game running. Press Ctrl+C here to stop.
echo ================================================
pause >nul
endlocal