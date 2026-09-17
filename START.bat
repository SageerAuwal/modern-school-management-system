@echo off
title School Management System - Starting...
color 0A

echo.
echo  ╔══════════════════════════════════════════════╗
echo  ║   School Management System - Launcher        ║
echo  ╚══════════════════════════════════════════════╝
echo.

:: ─── 1. Check & Start PostgreSQL ─────────────────────────────────────────
echo [1/3] Checking PostgreSQL...

:: Find the PostgreSQL service name dynamically
for /f "tokens=*" %%s in ('sc query type= service state= all ^| findstr /i "postgresql"') do (
    for /f "tokens=2" %%n in ("%%s") do set PG_SERVICE=%%n
)

if not defined PG_SERVICE (
    echo  ERROR: PostgreSQL service not found. Is PostgreSQL installed?
    pause
    exit /b 1
)

:: Check if already running
sc query %PG_SERVICE% | findstr "RUNNING" >nul 2>&1
if %errorlevel%==0 (
    echo  OK - PostgreSQL is already running.
) else (
    echo  Starting PostgreSQL...
    net start %PG_SERVICE% >nul 2>&1
    if %errorlevel%==0 (
        echo  OK - PostgreSQL started.
    ) else (
        echo  WARNING: Could not start PostgreSQL. Try running this file as Administrator.
        pause
        exit /b 1
    )
)

echo.

:: ─── 2. Set environment variables ────────────────────────────────────────
set DATABASE_URL=postgresql://postgres:SageerBH@localhost:5432/school_db?schema=public
set NODE_ENV=development

:: ─── 3. Start API Server ─────────────────────────────────────────────────
echo [2/3] Starting API server (http://localhost:3001)...

cd /d "%~dp0apps\api"
start "School API - Port 3001" cmd /k "set DATABASE_URL=%DATABASE_URL% && npm run start:dev"

:: Wait a moment for API to begin starting
timeout /t 3 /nobreak >nul

echo  OK - API server launching in background.
echo.

:: ─── 4. Start Web Server ─────────────────────────────────────────────────
echo [3/3] Starting Web server (http://localhost:3000)...

cd /d "%~dp0apps\web"
start "School Web - Port 3000" cmd /k "npm run dev"

:: Wait for web to begin
timeout /t 3 /nobreak >nul

echo  OK - Web server launching in background.
echo.

:: ─── 5. Open browser ─────────────────────────────────────────────────────
echo ──────────────────────────────────────────────────
echo.
echo  All services starting! Opening browser in 10s...
echo.
echo  Web:   http://localhost:3000
echo  API:   http://localhost:3001/api/v1
echo.
echo  Login: admin@school.local / Admin@1234
echo.
echo  To stop: close the two terminal windows that opened.
echo ──────────────────────────────────────────────────
echo.

timeout /t 10 /nobreak >nul
start "" http://localhost:3000

echo  Browser opened. You can close this window now.
timeout /t 5 /nobreak >nul
