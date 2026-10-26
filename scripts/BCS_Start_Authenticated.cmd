@echo off
setlocal
for %%I in ("%~dp0..") do set "BCS_START_ROOT=%%~fI"
if /I not "%BCS_START_ROOT%"=="E:\Bulk-Communicatio-System" (
  echo ERROR: Run this launcher from the canonical BCS workspace.
  exit /b 1
)
cd /d "%BCS_START_ROOT%" || exit /b 1
where node.exe >nul 2>&1 || (echo ERROR: Node.js is required. & exit /b 1)
where npm.cmd >nul 2>&1 || (echo ERROR: npm is required. & exit /b 1)
node scripts\bcs-authenticated-preflight.cjs
if errorlevel 1 exit /b 1
set "BCS_APPLICATION_MODE=authenticated"
set "BCS_DATA_MODE=database"
set "BCS_LIVE_TESTS=0"
set "NEXT_TELEMETRY_DISABLED=1"
echo Starting authenticated Universal Notify: http://127.0.0.1:3000/login
call npm.cmd run dev --workspace=@bcs/web -- --port 3000
exit /b %errorlevel%
