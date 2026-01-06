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
    clear_before_scrape: bool = False  # Clear old jobs before new search (default: keep and accumulate)

class JobUpdate(BaseModel):
    status: str

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Job Assistant API is running"}

@app.get("/api/jobs")
def get_jobs(status: Optional[str] = None, search_id: Optional[str] = None):
    """Get all jobs, optionally filtered by status and/or search_id."""
    jobs = job_manager.get_all_jobs()
    
    # Filter by status if provided
    if status:
        jobs = [job for job in jobs if job.get('my_status') == status]
    
    # Filter by search_id if provided
    if search_id:
        if search_id == 'legacy':
            # Show jobs without search_id
            jobs = [job for job in jobs if not job.get('search_id')]
        else:
            jobs = [job for job in jobs if job.get('search_id') == search_id]
    
    return jobs

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

from src.utils.desc_fetcher import fetch_description

@app.delete("/api/jobs/clear")
def clear_all_jobs():
    """Clears all jobs from the database."""
    job_manager.clear_all_jobs()
    return {"message": "All jobs cleared successfully"}

@app.post("/api/jobs/fetch_desc")
def fetch_job_desc(payload: Dict[str, str]):
    """
    Fetches description for a job URL on demand.
    Payload: {"url": "..."}
    """
    url = payload.get("url")
    if not url:
        raise HTTPException(status_code=400, detail="Missing url")
    
    # Check if we already have it (optional, but good for speed if frontend calls unnecessarily)
    # job = job_manager.get_job(url) ... (not implemented efficiently, skip)
    
    desc = fetch_description(url)
    if desc:
        # Save it so we don't have to fetch again
        job_manager.update_job_detail(url, {"description": desc})
        return {"description": desc}
    else:
        raise HTTPException(status_code=404, detail="Could not fetch description")

@app.get("/api/searches")
def get_searches():
    """Get all unique search sessions with metadata."""
    all_jobs = job_manager.get_all_jobs()
    
    # Group jobs by search_id
    searches_dict = {}
    for job in all_jobs:
        search_id = job.get('search_id')
        if not search_id:
            # Handle legacy jobs without search_id
            search_id = 'legacy'
        
        if search_id not in searches_dict:
            searches_dict[search_id] = {
                'search_id': search_id,
                'search_query': job.get('search_query', 'Unknown'),
                'search_location': job.get('search_location', 'Unknown'),
                'search_timestamp': job.get('search_timestamp', ''),
                'search_sites': job.get('search_sites', ''),
                'job_count': 0
            }
        
        searches_dict[search_id]['job_count'] += 1
    
    # Convert to list and sort by timestamp (newest first)
    searches_list = list(searches_dict.values())
    searches_list.sort(key=lambda x: x['search_timestamp'], reverse=True)
    
    return searches_list

@app.delete("/api/searches/{search_id}")
def delete_search(search_id: str):
    """Deletes a specific search session and its jobs."""
    deleted = job_manager.delete_jobs_by_search_id(search_id)
    if not deleted:
         # It's possible the search ID exists but has no jobs (unlikely in this architecture but safely handled)
         # Or it doesn't exist. We'll return success anyway to be idempotent-ish or 404 if strict.
         # For UI simplicity, just return success message.
         pass
    return {"message": f"Search {search_id} deleted"}

@app.get("/api/export")
def export_jobs(search_id: Optional[str] = None):
    """Generates an Excel file of jobs (filtered by search_id if provided) and returns it."""
    try:
        filters = {}
        if search_id and search_id != 'all':
            filters['search_id'] = search_id
            
        df = job_manager.export_to_pandas(filters)
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
    import uuid
    
    # Generate unique search ID for this search session
    search_id = str(uuid.uuid4())
    search_timestamp = datetime.datetime.now().isoformat()
    
    print(f"Starting scrape for {req.title} in {req.location} (search_id: {search_id})")
    
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
    
    # Add search metadata to each job
    for job in jobs:
        job['search_id'] = search_id
        job['search_timestamp'] = search_timestamp
        job['search_query'] = req.title
        job['search_location'] = req.location
        job['search_sites'] = ','.join(req.sites)
    
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
