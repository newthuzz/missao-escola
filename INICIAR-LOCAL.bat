@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Instale o Node.js 20 ou superior e abra este arquivo novamente.
  pause
  exit /b 1
)
start "" "http://localhost:4173"
node scripts/serve-local.mjs
pause
