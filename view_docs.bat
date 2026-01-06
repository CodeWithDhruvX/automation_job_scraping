@echo off
echo ========================================
echo  JobSpy Documentation
echo ========================================
echo.
echo Opening documentation files...
echo.

REM Open the main documentation files
start SMART_RUN_SUMMARY.md
timeout /t 1 /nobreak >nul
start QUICKSTART.md

echo.
echo Documentation opened in your default markdown viewer.
echo.
echo Available documents:
echo   - SMART_RUN_SUMMARY.md (Start here!)
echo   - QUICKSTART.md
echo   - SETUP_AUTORUN.md
echo   - README.md
echo.
pause
