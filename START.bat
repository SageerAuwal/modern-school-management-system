@echo off
setlocal enabledelayedexpansion
title School Management System - Launcher
color 0A

:: Use UTF-8 code page so characters display cleanly
chcp 65001 >nul

echo.
echo  ================================================
echo    School Management System - Launcher
echo  ================================================
echo.

:: --- 1. Check & Start PostgreSQL -----------------------------------------
echo [1/3] Checking PostgreSQL service...

set PG_SERVICE=postgresql-x64-18

:: Check if the default service exists
sc query %PG_SERVICE% >nul 2>&1
if not %errorlevel%==0 (
    for /f "usebackq delims=" %%s in (`powershell -NoProfile -Command "(Get-Service postgresql* -ErrorAction SilentlyContinue).Name"`) do (
        set PG_SERVICE=%%s
    )
)

if not defined PG_SERVICE (
    set PG_SERVICE=postgresql-x64-18
)

:: Check if already running
sc query !PG_SERVICE! | findstr /i "RUNNING" >nul 2>&1
if %errorlevel%==0 (
    echo  [OK] PostgreSQL service is running: !PG_SERVICE!
) else (
    echo  Starting PostgreSQL service: !PG_SERVICE!...
    net start !PG_SERVICE! >nul 2>&1
    sc query !PG_SERVICE! | findstr /i "RUNNING" >nul 2>&1
    if !errorlevel!==0 (
        echo  [OK] PostgreSQL started successfully.
    ) else (
        echo  [!] Note: If PostgreSQL runs under a different configuration,
        echo      ensure your PostgreSQL server is active. Continuing...
    )
)

echo.

:: --- 2. Free ports if previous instances are lingering ------------------
for /f "tokens=5" %%p in ('netstat -aon ^| findstr ":3001 " ^| findstr "LISTENING"') do (
    taskkill /PID %%p /F >nul 2>&1
)
for /f "tokens=5" %%p in ('netstat -aon ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    taskkill /PID %%p /F >nul 2>&1
)

:: Set environment variables
set DATABASE_URL=postgresql://postgres:SageerBH@localhost:5432/school_db?schema=public
set NODE_ENV=development

:: --- 3. Start API Server -------------------------------------------------
echo [2/3] Starting Backend API on port 3001...

cd /d "%~dp0apps\api"
start "School API - Port 3001" cmd /k "set DATABASE_URL=%DATABASE_URL% && npm run start:dev"

ping -n 4 127.0.0.1 >nul
echo  [OK] API server launched.
echo.

:: --- 4. Start Web Server -------------------------------------------------
echo [3/3] Starting Frontend Web on port 3000...

cd /d "%~dp0apps\web"
start "School Web - Port 3000" cmd /k "npm run dev"

ping -n 4 127.0.0.1 >nul
echo  [OK] Web server launched.
echo.

:: --- 5. Open Browser -----------------------------------------------------
echo ------------------------------------------------
echo  All systems starting! Opening browser in 8 seconds...
echo.
echo  Web URL:  http://localhost:3000
echo  API URL:  http://localhost:3001/api/v1
echo.
echo  Default Login:
echo    Email:    admin@school.local
echo    Password: Admin@1234
echo ------------------------------------------------
echo.

ping -n 9 127.0.0.1 >nul
start "" http://localhost:3000

echo  Browser launched. You can close this launcher window anytime.
ping -n 5 127.0.0.1 >nul
