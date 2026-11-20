@echo off
rem New Lease: one-click start for Windows.
rem   start-demo.cmd        development server (reloads on code changes)
rem   start-demo.cmd prod   production build (faster, use this for the demo)
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 18 or newer is required. Install it from https://nodejs.org and run this again.
  pause
  exit /b 1
)

if not exist "web\node_modules" (
  echo Installing dependencies. This happens only the first time and takes a minute or two...
  call npm run setup
  if errorlevel 1 (
    echo Install failed. See the messages above.
    pause
    exit /b 1
  )
)

if /i "%~1"=="prod" (
  echo Building the production version...
  call npm run build
  if errorlevel 1 (
    echo Build failed. See the messages above.
    pause
    exit /b 1
  )
  set "RUN=start"
) else (
  set "RUN=dev"
)

echo.
echo Starting New Lease. Your browser will open http://localhost:3000/decide in a few seconds.
echo The first page load can take 10 to 30 seconds. Keep this window open; press Ctrl+C to stop.
echo.
start "" /min cmd /c "timeout /t 8 /nobreak >nul & start http://localhost:3000/decide"
call npm run %RUN%
endlocal
