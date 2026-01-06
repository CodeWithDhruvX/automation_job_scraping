from fastapi import FastAPI, HTTPException, Query, BackgroundTasks
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import os
import sys
import datetime

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from src.core.job_manager import JobManager
from src.connectors.jobspy_connector import JobSpyConnector

app = FastAPI(title="Job Application Assistant API")

# Allow CORS for React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify explicit origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

job_manager = JobManager()

class ScrapeRequest(BaseModel):
    title: str
    location: str
    sites: List[str] = ["linkedin", "indeed", "glassdoor"]
    results_wanted: int = 20
    hours_old: int = 72
    job_type: Optional[str] = None # e.g. "fulltime", "parttime"
    experience: Optional[str] = None # e.g. "entry", "senior"
    salary: Optional[int] = None # e.g. 100000

class JobUpdate(BaseModel):
    status: str

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Job Assistant API is running"}

@app.get("/api/jobs")
def get_jobs(status: Optional[str] = None):
    """Get all jobs, optionally filtered by status."""
    if status:
        return job_manager.get_jobs_by_status(status)
    return job_manager.get_all_jobs()

@app.post("/api/jobs/update")
def update_job_status_post(payload: Dict[str, str]):
    """
    Updates job status. Payload: {"url": "...", "status": "APPLIED"}
    """
    url = payload.get("url")
    status = payload.get("status")
    if not url or not status:
        raise HTTPException(status_code=400, detail="Missing url or status")
    
    job_manager.update_status(url, status)
    return {"status": "updated", "url": url, "new_status": status}

@app.get("/api/export")
def export_jobs():
    """Generates an Excel file of all jobs and returns it."""
    try:
        df = job_manager.export_to_pandas()
        if df.empty:
            raise HTTPException(status_code=404, detail="No jobs to export")
        
        # Ensure data/exports exists
        output_dir = os.path.join(os.path.dirname(__file__), '../../data/exports')
        os.makedirs(output_dir, exist_ok=True)
        
        filename = f"jobs_export_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        file_path = os.path.join(output_dir, filename)
        
        df.to_excel(file_path, index=False)
        
        return FileResponse(path=file_path, filename=filename, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def run_scraper_task(req: ScrapeRequest):
    """Background task to run scraper."""
    print(f"Starting scrape for {req.title} in {req.location}")
    # Config
    connector_config = {
        "sources": {"jobspy": {"enabled": True}},
        "search": {"results_wanted": req.results_wanted, "country_indir": "India"} 
    }
    
    # Construct query with extra parameters if needed, or pass them if JobSpyConnector supports them
    # Just passing them to search() which maps them to JobSpy arguments
    
    connector = JobSpyConnector(connector_config)
    
    # Use formatted query if experience/salary provided
    final_query = req.title
    if req.experience:
        final_query += f" {req.experience}"
    # Salary often not supported as direct API arg in free scraper, so maybe leave out or append 
    # if req.salary: ...
        
    jobs = connector.search(
        query=final_query,
        site_name=req.sites,
        location=req.location,
        hours_old=req.hours_old,
        job_type=req.job_type
    )
    
    # Save to manager
    new_count = job_manager.add_jobs(jobs)
    print(f"Scrape complete. Added {new_count} new jobs.")

@app.post("/api/scrape")
def trigger_scrape(req: ScrapeRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(run_scraper_task, req)
    return {"message": "Scraping started in background", "query": req.title}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
