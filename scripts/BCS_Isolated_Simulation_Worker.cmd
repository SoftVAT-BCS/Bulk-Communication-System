@echo off
setlocal
cd /d E:\Bulk-Communicatio-System
if errorlevel 1 exit /b 1
if not "%BCS_ISOLATED_ACCEPTANCE%"=="I_CONFIRM_DISPOSABLE_LOCAL_DATABASE" exit /b 2
if not defined BCS_ISOLATED_WORKER_URL exit /b 2
if not defined BCS_SIMULATION_COMPANY exit /b 2
node.exe apps\worker\src\postgres-main.ts
exit /b %errorlevel%
