@echo off
setlocal
cd /d E:\Bulk-Communicatio-System
set BCS_APPLICATION_MODE=synthetic
set BCS_DATA_MODE=synthetic
set BCS_LIVE_TESTS=0
set NEXT_TELEMETRY_DISABLED=1
call npm.cmd run dev --workspace=@bcs/web -- --port 3107
