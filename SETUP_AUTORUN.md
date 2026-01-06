# JobSpy Auto-Run Setup Guide

## Quick Start
Just double-click `smart_run.bat` to run both frontend and backend!

## What's Included

### 1. **smart_run.bat** - Smart Batch Runner
This batch file:
- ✅ Kills any existing processes on ports 8000 (backend) and 5173 (frontend)
- ✅ Starts the backend (Uvicorn on port 8000)
- ✅ Starts the frontend (Vite on port 5173)
- ✅ Shows status messages and URLs
- ✅ Runs both apps in separate windows for easy monitoring

**Usage:**
```bash
# Just double-click the file or run from terminal:
smart_run.bat
```

## VSCode Auto-Run Setup

Since `.vscode/` is in your `.gitignore`, you have two options:

### Option 1: Manual VSCode Configuration (Recommended)

1. Create a `.vscode` folder in your project root if it doesn't exist
2. Create `.vscode/tasks.json` with this content:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Start Backend",
      "type": "shell",
      "command": "uvicorn",
      "args": [
        "src.api.server:app",
        "--reload",
        "--port",
        "8000"
      ],
      "isBackground": true,
      "problemMatcher": {
        "pattern": {
          "regexp": "^.*$",
          "file": 1,
          "location": 2,
          "message": 3
        },
        "background": {
          "activeOnStart": true,
          "beginsPattern": "Started server process",
          "endsPattern": "Application startup complete"
        }
      },
      "presentation": {
        "reveal": "always",
        "panel": "dedicated",
        "group": "dev-servers"
      }
    },
    {
      "label": "Start Frontend",
      "type": "shell",
      "command": "npm",
      "args": [
        "run",
        "dev"
      ],
      "options": {
        "cwd": "${workspaceFolder}/frontend"
      },
      "isBackground": true,
      "problemMatcher": {
        "pattern": {
          "regexp": "^.*$",
          "file": 1,
          "location": 2,
          "message": 3
        },
        "background": {
          "activeOnStart": true,
          "beginsPattern": "VITE",
          "endsPattern": "Local:.*http://localhost:5173"
        }
      },
      "presentation": {
        "reveal": "always",
        "panel": "dedicated",
        "group": "dev-servers"
      }
    },
    {
      "label": "Start All Services",
      "dependsOn": [
        "Start Backend",
        "Start Frontend"
      ],
      "problemMatcher": [],
      "presentation": {
        "reveal": "always",
        "panel": "dedicated"
      }
    },
    {
      "label": "Smart Run (Kill & Restart)",
      "type": "shell",
      "command": "${workspaceFolder}/smart_run.bat",
      "problemMatcher": [],
      "presentation": {
        "reveal": "always",
        "panel": "new"
      }
    }
  ]
}
```

3. **To auto-run on folder open**, you can use the Command Palette:
   - Press `Ctrl+Shift+P`
   - Type "Tasks: Run Task"
   - Select "Start All Services" or "Smart Run (Kill & Restart)"

4. **To make it truly automatic**, install the VSCode extension "Task Runner" or use a keyboard shortcut:
   - Go to File > Preferences > Keyboard Shortcuts
   - Search for "Tasks: Run Task"
   - Assign a shortcut like `Ctrl+Shift+R`

### Option 2: Using Auto-Run Extension

1. Install the VSCode extension: **"AutoLaunch"** or **"Blade Runner"**
2. Configure it to run `smart_run.bat` when the workspace opens

### Option 3: Windows Desktop Shortcut

Create a desktop shortcut for quick access:

1. Right-click on `smart_run.bat`
2. Select "Create shortcut"
3. Move the shortcut to your desktop
4. (Optional) Right-click the shortcut > Properties > Change Icon to customize

## Available Commands

### In VSCode Terminal:
```bash
# Smart run (kills existing and restarts)
smart_run.bat

# Original dev runner (simple start)
run_dev.bat

# Backend only
uvicorn src.api.server:app --reload --port 8000

# Frontend only
cd frontend
npm run dev
```

## URLs

Once running, access:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Troubleshooting

### Port already in use?
Just run `smart_run.bat` - it automatically kills existing processes!

### Backend won't start?
```bash
# Ensure dependencies are installed
pip install -r requirements.txt
```

### Frontend won't start?
```bash
# Install dependencies
cd frontend
npm install
```

### Need to stop services?
- Close the terminal windows, OR
- Run `smart_run.bat` again (it will restart)
- Manually kill processes:
  ```bash
  # Kill port 8000 (backend)
  netstat -ano | findstr :8000
  taskkill /F /PID <process_id>
  
  # Kill port 5173 (frontend)
  netstat -ano | findstr :5173
  taskkill /F /PID <process_id>
  ```

## File Structure
```
automation_job_scraping/
├── smart_run.bat          # ⭐ Smart runner (kills & restarts)
├── run_dev.bat            # Simple runner
├── src/
│   └── api/
│       └── server.py      # Backend FastAPI app
├── frontend/
│   ├── src/
│   └── package.json       # Frontend Vite app
└── .vscode/               # (gitignored, create manually)
    └── tasks.json         # VSCode tasks
```
