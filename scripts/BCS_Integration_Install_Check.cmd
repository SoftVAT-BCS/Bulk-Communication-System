@echo off
setlocal
cd /d E:\Bulk-Communicatio-System
node.exe scripts\bcs-source-integrity.cjs
if errorlevel 1 exit /b 1
node.exe -e "if(process.versions.node.split('.')[0]!=='24')process.exit(2)"
if errorlevel 1 exit /b 2
call npm.cmd ls --depth=0
if errorlevel 1 exit /b 3
echo Existing local installation verified. No packages, SQL or secrets were installed.
echo Missing dependencies require a separate reviewed lockfile installation; never install implicitly.
exit /b 0
