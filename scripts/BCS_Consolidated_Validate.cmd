@echo off
setlocal
cd /d E:\Bulk-Communicatio-System
if errorlevel 1 exit /b 1
if not exist AGENTS.md exit /b 1
where node.exe >nul 2>&1
if errorlevel 1 exit /b 1
where npm.cmd >nul 2>&1
if errorlevel 1 exit /b 1
node -e "if(process.versions.node.split('.')[0]!=='24')process.exit(1)"
if errorlevel 1 exit /b 1
set BCS_APPLICATION_MODE=synthetic
set BCS_DATA_MODE=synthetic
set NEXT_TELEMETRY_DISABLED=1
set BCS_LIVE_TESTS=0
set BCS_RUN_LIVE_TESTS=
set BCS_RUN_SUPABASE_TESTS=
call npm.cmd run typecheck
if errorlevel 1 exit /b 1
call npm.cmd run lint
if errorlevel 1 exit /b 1
call npm.cmd test
if errorlevel 1 exit /b 1
call npm.cmd run build
if errorlevel 1 exit /b 1
echo Source validation passed. No database or provider acceptance is implied.
exit /b 0
