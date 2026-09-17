@echo off
title School Management System - Stopping...
color 0C

echo.
echo  Stopping all School Management System processes...
echo.

:: Kill all node processes running on ports 3000 and 3001
for /f "tokens=5" %%p in ('netstat -aon ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    echo  Stopping Web server (PID %%p)...
    taskkill /PID %%p /F >nul 2>&1
)

for /f "tokens=5" %%p in ('netstat -aon ^| findstr ":3001 " ^| findstr "LISTENING"') do (
    echo  Stopping API server (PID %%p)...
    taskkill /PID %%p /F >nul 2>&1
)

echo.
echo  All servers stopped.
echo.
timeout /t 3 /nobreak >nul
