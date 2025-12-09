@echo off
cd /d "c:\Users\KHOOBTEK\Desktop\serailo"
set PORT=5001
echo Starting server on port %PORT%...
echo.
npx tsx server/index.ts
pause
