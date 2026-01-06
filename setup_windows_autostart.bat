@echo off
REM ========================================
REM  Windows Task Scheduler Setup
REM  Creates a scheduled task to auto-run JobSpy
REM ========================================

echo.
echo This will create a Windows scheduled task that runs automatically
echo when you log in to your computer.
echo.
echo Press Ctrl+C to cancel, or press any key to continue...
pause >nul

REM Get the current directory
set "SCRIPT_DIR=%~dp0"
set "SCRIPT_PATH=%SCRIPT_DIR%smart_run.bat"

echo.
echo Creating scheduled task...
echo.

REM Create the scheduled task
schtasks /create /tn "JobSpy Auto Start" /tr "\"%SCRIPT_PATH%\"" /sc onlogon /rl highest /f

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo  SUCCESS!
    echo ========================================
    echo.
    echo A scheduled task "JobSpy Auto Start" has been created.
    echo It will run automatically when you log in.
    echo.
    echo To manage this task:
    echo   - Open Task Scheduler (taskschd.msc)
    echo   - Find "JobSpy Auto Start"
    echo   - Right-click to Enable/Disable/Delete
    echo.
    echo To remove this task, run:
    echo   schtasks /delete /tn "JobSpy Auto Start" /f
    echo ========================================
) else (
    echo.
    echo ========================================
    echo  ERROR
    echo ========================================
    echo.
    echo Failed to create scheduled task.
    echo Please run this script as Administrator.
    echo.
    echo Right-click setup_windows_autostart.bat
    echo and select "Run as administrator"
    echo ========================================
)

echo.
pause
