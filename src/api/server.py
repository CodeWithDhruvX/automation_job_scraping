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
    results_wanted: int = 50  # Default safe limit, can be increased to 100-500
    hours_old: int = 72
    job_type: Optional[str] = None # e.g. "fulltime", "parttime"
    experience: Optional[str] = None # e.g. "entry", "senior"
    salary: Optional[int] = None # e.g. 100000
    exact_match_location: bool = False  # Filter for exact location match
    exact_match_title: bool = False  # Filter for exact title match
    clear_before_scrape: bool = True  # Clear old jobs before new search

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

@app.delete("/api/jobs/clear")
def clear_all_jobs():
    """Clears all jobs from the database."""
    job_manager.clear_all_jobs()
    return {"message": "All jobs cleared successfully"}

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
    
    # Clear old jobs if requested
    if req.clear_before_scrape:
        print("Clearing old jobs before new search...")
        job_manager.clear_all_jobs()
    
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
    
    # Apply exact match filtering if requested
    if req.exact_match_location or req.exact_match_title:
        import re
        filtered_jobs = []
        
        # Debug: Show what we're filtering for
        if req.exact_match_location:
            print(f"Exact match location filter enabled for: '{req.location}'")
        if req.exact_match_title:
            print(f"Exact match title filter enabled for: '{req.title}'")
        
        for job in jobs:
            keep_job = True
            
            # Check exact location match (as complete word, not substring)
            if req.exact_match_location and req.location:
                job_location = job.get('location', '').lower().strip()
                job_city = job.get('city', '').lower().strip()
                job_state = job.get('state', '').lower().strip()
                search_location = req.location.lower().strip()
                
                # Debug: Print first few jobs to see their location data
                if len(filtered_jobs) < 3:
                    print(f"  Job location fields: location='{job_location}', city='{job_city}', state='{job_state}'")
                
                # Create regex pattern to match search_location as a complete word
                # \b ensures word boundaries, so "india" won't match "indianapolis"
                pattern = r'\b' + re.escape(search_location) + r'\b'
                
                # Check if search location appears as a complete word in any location field
                location_match = (
                    re.search(pattern, job_location) is not None or
                    re.search(pattern, job_city) is not None or
                    re.search(pattern, job_state) is not None
                )
                
                if len(filtered_jobs) < 3:
                    print(f"  Pattern: '{pattern}', Match: {location_match}")
                
                if not location_match:
                    keep_job = False
            
            # Check exact title match (exact match for title, not word boundary)
            if req.exact_match_title and req.title:
                job_title = job.get('title', '').lower().strip()
                search_title = req.title.lower().strip()
                
                if search_title not in job_title:
                    keep_job = False
            
            if keep_job:
                filtered_jobs.append(job)
        
        jobs = filtered_jobs
        print(f"After exact match filtering: {len(jobs)} jobs remain")
    
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
