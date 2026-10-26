@echo off
setlocal
cd /d E:\Bulk-Communicatio-System
if not exist AGENTS.md exit /b 2
set BCS_LIVE_TESTS=0
set NEXT_TELEMETRY_DISABLED=1
set FAILED=0
call npm.cmd run typecheck
if errorlevel 1 set FAILED=1
call npm.cmd run lint
if errorlevel 1 set FAILED=1
call npm.cmd test
if errorlevel 1 set FAILED=1
call npm.cmd run build
if errorlevel 1 set FAILED=1
echo No installation, migration, sending, staging or push was requested by this verifier.
exit /b %FAILED%
