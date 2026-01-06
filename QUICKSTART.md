# JobSpy - Quick Start Guide

## 🚀 Easiest Way to Run Both Apps

### Method 1: Double-Click to Run (Recommended)
**Just double-click `smart_run.bat`** - that's it!

This smart batch file will:
- ✅ Kill any existing processes running on ports 8000 and 5173
- ✅ Start your backend server (FastAPI/Uvicorn)
- ✅ Start your frontend server (React/Vite)
- ✅ Open both in separate terminal windows
- ✅ Show you the URLs to access

### Method 2: Run from Terminal
```bash
smart_run.bat
```

### Method 3: Create Desktop Shortcut
1. Right-click on `smart_run.bat`
2. Select "Send to" → "Desktop (create shortcut)"
3. Now you can start your app from desktop with one click!

---

## 🎯 Auto-Run in VSCode

### Option A: Use VSCode Tasks (Quick Setup)

1. **Run the setup script** (one-time only):
   ```bash
   setup_vscode.bat
   ```

2. **In VSCode**, press `Ctrl+Shift+P` and type:
   - "Tasks: Run Task"
   - Select **"Start All Services"** or **"Smart Run (Kill & Restart)"**

3. **Create a keyboard shortcut** (Optional):
   - File → Preferences → Keyboard Shortcuts
   - Search for "Tasks: Run Task"
   - Assign `Ctrl+Shift+R` (or your preferred shortcut)

### Option B: Auto-Run on Folder Open

Since `.vscode/` is gitignored, here's how to set it up:

1. **Install VSCode Extension**: [Blade Runner](https://marketplace.visualstudio.com/items?itemName=blade-runner.blade-runner)
   - Or search "Blade Runner" in VSCode Extensions

2. **Configure it** (press F1 or Ctrl+Shift+P):
   - Type "Blade Runner: Configure"
   - Add this command: `smart_run.bat`

### Option C: Manual VSCode Setup

Create `.vscode/tasks.json` manually with this content:

```json
{
  "version": "2.0.0",
  "tasks": [
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

---

## 📦 First Time Setup

### Backend Setup
```bash
# Install Python dependencies
pip install -r requirements.txt
```

### Frontend Setup
```bash
# Navigate to frontend
cd frontend

# Install Node dependencies
npm install

# Return to root
cd ..
```

---

## 🌐 Access Your App

Once running:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

---

## 🛠️ Available Commands

| Command | Description |
|---------|-------------|
| `smart_run.bat` | ⭐ Smart runner - kills existing & restarts both |
| `setup_vscode.bat` | Setup VSCode tasks configuration |
| `run_dev.bat` | Simple runner - starts both apps |

### Manual Commands

**Backend only:**
```bash
uvicorn src.api.server:app --reload --port 8000
```

**Frontend only:**
```bash
cd frontend
npm run dev
```

---

## 🔧 Troubleshooting

### "Port already in use" Error
Just run `smart_run.bat` again - it automatically kills existing processes!

### Backend won't start
```bash
pip install -r requirements.txt
```

### Frontend won't start
```bash
cd frontend
npm install
```

### Manually kill processes
```bash
# Kill backend (port 8000)
netstat -ano | findstr :8000
taskkill /F /PID <process_id>

# Kill frontend (port 5173)
netstat -ano | findstr :5173
taskkill /F /PID <process_id>
```

---

## 📝 What Each File Does

- **`smart_run.bat`** - Intelligent runner that handles process cleanup and restart
- **`setup_vscode.bat`** - One-time setup script for VSCode tasks
- **`run_dev.bat`** - Original simple runner
- **`SETUP_AUTORUN.md`** - Detailed setup documentation

---

## 🎨 Pro Tips

1. **Pin to Taskbar**: Right-click `smart_run.bat` → Pin to Taskbar
2. **Keyboard Shortcut**: Set up Ctrl+Shift+R in VSCode to run tasks
3. **Multiple Instances**: `smart_run.bat` prevents duplicate instances automatically
4. **Quick Restart**: Just run `smart_run.bat` again - it handles everything!

---

**Made with ❤️ for easy development**
