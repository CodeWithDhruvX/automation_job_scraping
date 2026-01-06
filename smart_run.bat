@echo off
setlocal enabledelayedexpansion

echo ========================================
echo  JobSpy Smart Runner
echo ========================================
echo.

REM Kill existing processes
echo [1/4] Checking for running processes...
echo.

REM Kill existing Node.js processes (Vite dev server)
echo Stopping frontend (Node.js processes on port 5173)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
    if !errorlevel! equ 0 (
        echo   - Killed process %%a
    )
)

REM Kill existing Uvicorn processes (Backend on port 8000)
echo Stopping backend (Uvicorn processes on port 8000)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
    if !errorlevel! equ 0 (
        echo   - Killed process %%a
    )
)

echo.
echo [2/4] Starting Backend Server...
echo.

REM Start backend in a new window
start "JobSpy Backend" cmd /k "cd /d "%~dp0" && echo Starting Uvicorn Backend on http://localhost:8000... && uvicorn src.api.server:app --reload --port 8000"

REM Wait for backend to start
timeout /t 3 /nobreak >nul

echo [3/4] Starting Frontend Server...
echo.

REM Start frontend in a new window
start "JobSpy Frontend" cmd /k "cd /d "%~dp0frontend" && echo Starting Vite Dev Server on http://localhost:5173... && npm run dev"

echo.
echo [4/4] All services started!
echo ========================================
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:5173
echo   Docs:     http://localhost:8000/docs
echo ========================================
echo.
echo Press any key to exit this window...
echo (The apps will continue running in separate windows)
pause >nul
