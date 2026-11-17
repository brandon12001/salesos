@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Install the current Node.js LTS release from https://nodejs.org/
  pause
  exit /b 1
)
if not exist node_modules (
  echo Installing SalesOS dependencies...
  call npm install
  if errorlevel 1 (
    echo npm install failed. Check your internet access and permissions.
    pause
    exit /b 1
  )
)
echo Starting SalesOS on http://localhost:5173
start "" "http://localhost:5173"
call npm run dev
pause
