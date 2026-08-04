@echo off
setlocal
cd /d "%~dp0..\backend"
if not exist "..\.codex-logs" mkdir "..\.codex-logs"
set "PATH=C:\Program Files\nodejs;C:\Windows\System32;C:\Windows;%PATH%"
call npm run build
if errorlevel 1 exit /b 1
call "C:\Program Files\nodejs\node.exe" dist\src\main.js >> "..\.codex-logs\backend-run.log" 2>&1
