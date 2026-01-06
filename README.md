# 🚀 JobSpy - Job Scraping & Automation Platform

A modern, full-stack job aggregation platform with React frontend and FastAPI backend. Search and filter jobs from multiple sources with an intuitive dashboard.

## ⚡ Quick Start

**Fastest way to run:** Just double-click **`smart_run.bat`**

Or from terminal:
```bash
smart_run.bat
```

Then open http://localhost:5173 in your browser!

📖 **[See QUICKSTART.md for detailed instructions →](QUICKSTART.md)**

---

## 🎯 Features

- 🔍 **Multi-Source Job Search** - Aggregate jobs from Indeed, LinkedIn, Glassdoor, ZipRecruiter, and more
- 🎨 **Modern React Dashboard** - Beautiful, responsive UI with real-time filtering
- ⚡ **Smart Search** - Filter by title, location, job type, salary range, and more
- 📊 **Export to Excel** - Download your filtered results
- 🔄 **Search History** - Keep track of previous searches
- 💰 **High-Paying Job Filter** - Focus on high-salary positions
- 🎯 **Exact Match Search** - Precise keyword matching

---

## 🛠️ Setup

### First Time Installation

1. **Backend Setup**
   ```bash
   pip install -r requirements.txt
   ```

2. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   cd ..
   ```

### Running the Application

Choose your preferred method:

| Method | Command | Description |
|--------|---------|-------------|
| **Smart Run** | `smart_run.bat` | ⭐ Kills existing & restarts both servers |
| **Simple Run** | `run_dev.bat` | Starts both servers |
| **VSCode Tasks** | `Ctrl+Shift+P` → Run Task | Run from VSCode Command Palette |

### Auto-Run Options

- **VSCode Auto-Start**: Run `setup_vscode.bat` (one-time)
- **Windows Startup**: Run `setup_windows_autostart.bat` as Admin (optional)

📖 **[See SETUP_AUTORUN.md for VSCode integration →](SETUP_AUTORUN.md)**

---

## 🌐 Access URLs

Once running:
- **Frontend Dashboard**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

---

## 📁 Project Structure

```
automation_job_scraping/
├── 📄 smart_run.bat              # ⭐ Smart runner (recommended)
├── 📄 setup_vscode.bat           # VSCode tasks setup
├── 📄 QUICKSTART.md             # Quick start guide
├── 📄 SETUP_AUTORUN.md          # Auto-run documentation
│
├── 🎨 frontend/                 # React + Vite frontend
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── App.jsx            # Main app
│   │   └── index.css          # Styles
│   └── package.json
│
├── 🔧 src/                      # Python backend
│   ├── api/
│   │   └── server.py          # FastAPI server
│   └── scrapers/              # Job scraping logic
│
├── 📊 data/                     # Database & exports
└── 🔐 config/                   # Configuration files
```

---

## 🔧 Technology Stack

**Frontend:**
- React 18
- Vite
- Tailwind CSS
- Lucide Icons
- Axios

**Backend:**
- Python 3.8+
- FastAPI
- Uvicorn
- python-jobspy
- SQLite

---

## 📝 Available Scripts

| Script | Purpose |
|--------|---------|
| `smart_run.bat` | Kill existing processes & restart both servers |
| `run_dev.bat` | Start both servers (simple) |
| `setup_vscode.bat` | Configure VSCode tasks |
| `setup_windows_autostart.bat` | Setup Windows auto-start |

---

## 🐛 Troubleshooting

**Port already in use?**
```bash
smart_run.bat  # Automatically kills & restarts
```

**Backend won't start?**
```bash
pip install -r requirements.txt
```

**Frontend won't start?**
```bash
cd frontend && npm install
```

📖 **[See QUICKSTART.md for more troubleshooting →](QUICKSTART.md)**

---

## 📄 License

MIT

---

**Made with ❤️ for efficient job hunting**