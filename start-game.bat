@echo off
title Kalgoth's Gaze - Dev Server
cd /d "D:\DARKNEST"

echo Installing dependencies (if needed)...
call npm install --silent

echo.
echo Starting Vite dev server...
start "" "http://localhost:3000"
call npm run dev