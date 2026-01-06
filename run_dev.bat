@echo off
echo Starting Backend...
start "JobSpy Backend" cmd /k "uvicorn src.api.server:app --reload --port 8000"
echo Starting Frontend...
cd frontend
start "JobSpy Frontend" cmd /k "npm run dev"
echo Done! Access the app at http://localhost:5173
pause
