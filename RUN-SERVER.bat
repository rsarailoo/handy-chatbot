@echo off
chcp 65001 >nul
echo ========================================
echo   Starting Serailo Server
echo ========================================
echo.
cd /d "%~dp0"
set PORT=5001
echo Port: %PORT%
echo.
echo Installing dependencies (if needed)...
call npm install
echo.
echo Starting server...
echo.
call npx tsx server/index.ts
pause
