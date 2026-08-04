@echo off
setlocal
cd /d "%~dp0.."
if not exist ".codex-logs" mkdir ".codex-logs"
set "PATH=C:\Program Files\nodejs;C:\Windows\System32;C:\Windows;%PATH%"
call "%~dp0..\node_modules\.bin\vite.cmd" preview --host 127.0.0.1 --port 5173 >> ".codex-logs\frontend-run.log" 2>&1
