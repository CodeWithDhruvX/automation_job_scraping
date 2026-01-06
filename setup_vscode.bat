@echo off
echo ========================================
echo  Setting up VSCode Auto-Run
echo ========================================
echo.

REM Create .vscode directory if it doesn't exist
if not exist ".vscode" (
    echo Creating .vscode directory...
    mkdir .vscode
)

REM Create tasks.json
echo Creating tasks.json...
(
echo {
echo   "version": "2.0.0",
echo   "tasks": [
echo     {
echo       "label": "Start Backend",
echo       "type": "shell",
echo       "command": "uvicorn",
echo       "args": [
echo         "src.api.server:app",
echo         "--reload",
echo         "--port",
echo         "8000"
echo       ],
echo       "isBackground": true,
echo       "problemMatcher": {
echo         "pattern": {
echo           "regexp": "^.*$",
echo           "file": 1,
echo           "location": 2,
echo           "message": 3
echo         },
echo         "background": {
echo           "activeOnStart": true,
echo           "beginsPattern": "Started server process",
echo           "endsPattern": "Application startup complete"
echo         }
echo       },
echo       "presentation": {
echo         "reveal": "always",
echo         "panel": "dedicated",
echo         "group": "dev-servers"
echo       }
echo     },
echo     {
echo       "label": "Start Frontend",
echo       "type": "shell",
echo       "command": "npm",
echo       "args": [
echo         "run",
echo         "dev"
echo       ],
echo       "options": {
echo         "cwd": "${workspaceFolder}/frontend"
echo       },
echo       "isBackground": true,
echo       "problemMatcher": {
echo         "pattern": {
echo           "regexp": "^.*$",
echo           "file": 1,
echo           "location": 2,
echo           "message": 3
echo         },
echo         "background": {
echo           "activeOnStart": true,
echo           "beginsPattern": "VITE",
echo           "endsPattern": "Local:.*http://localhost:5173"
echo         }
echo       },
echo       "presentation": {
echo         "reveal": "always",
echo         "panel": "dedicated",
echo         "group": "dev-servers"
echo       }
echo     },
echo     {
echo       "label": "Start All Services",
echo       "dependsOn": [
echo         "Start Backend",
echo         "Start Frontend"
echo       ],
echo       "problemMatcher": [],
echo       "presentation": {
echo         "reveal": "always",
echo         "panel": "dedicated"
echo       }
echo     },
echo     {
echo       "label": "Smart Run (Kill & Restart)",
echo       "type": "shell",
echo       "command": "${workspaceFolder}/smart_run.bat",
echo       "problemMatcher": [],
echo       "presentation": {
echo         "reveal": "always",
echo         "panel": "new"
echo       }
echo     }
echo   ]
echo }
) > .vscode\tasks.json

echo.
echo ========================================
echo  Setup Complete!
echo ========================================
echo.
echo VSCode tasks have been configured in .vscode\tasks.json
echo.
echo To use in VSCode:
echo   1. Press Ctrl+Shift+P
echo   2. Type "Tasks: Run Task"
echo   3. Select "Start All Services" or "Smart Run"
echo.
echo Alternatively, just run: smart_run.bat
echo ========================================
pause
