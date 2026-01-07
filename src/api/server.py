from fastapi import FastAPI, HTTPException, Query, BackgroundTasks
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import os
import sys
import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from src.core.job_manager import JobManager
from src.api.auth_routes import router as auth_router
from src.api.reminder_routes import router as reminder_router
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

app.include_router(auth_router)
app.include_router(reminder_router)

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
    foreign_only: bool = False # Filter for non-INR jobs
    visa_sponsorship: bool = False # Filter for visa sponsorship keywords
    remote_anywhere: bool = False # Filter for "remote anywhere" / "worldwide"
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

@app.delete("/api/jobs/detail")
def delete_single_job(url: str = Query(..., description="The URL of the job to delete")):
    """Deletes a single job by URL."""
    success = job_manager.delete_job(url)
    if not success:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"status": "deleted", "url": url}

@app.post("/api/jobs/delete-list")
def delete_job_list(payload: Dict[str, List[str]]):
    """
    Deletes multiple jobs. Payload: {"urls": ["url1", "url2"]}
    """
    urls = payload.get("urls", [])
    if not urls:
        raise HTTPException(status_code=400, detail="No urls provided")
    
    count = job_manager.delete_jobs(urls)
    return {"status": "deleted", "count": count}

@app.post("/api/jobs/import")
def import_jobs(payload: Dict):
    """
    Import jobs from external source (e.g., Excel).
    Payload: {"jobs": [...list of job objects...]}
    """
    jobs_to_import = payload.get("jobs", [])
    if not jobs_to_import:
        raise HTTPException(status_code=400, detail="No jobs provided")
    
    imported_count = job_manager.add_jobs(jobs_to_import)
    
    return {
        "message": f"Successfully imported {imported_count} new jobs",
        "imported_count": imported_count,
        "total_received": len(jobs_to_import)
    }

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

class ExportRequest(BaseModel):
    search_id: Optional[str] = None
    job_urls: Optional[List[str]] = None

@app.get("/api/export")
def export_jobs(search_id: Optional[str] = None):
    """Generates an Excel file of jobs (filtered by search_id if provided) and returns it."""
    try:
        filters = {}
        if search_id and search_id != 'all':
            filters['search_id'] = search_id
            
        return _generate_export(filters)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/export")
def export_jobs_post(req: ExportRequest):
    """Generates an Excel file of jobs based on filters in body."""
    try:
        filters = {}
        if req.search_id and req.search_id != 'all':
            filters['search_id'] = req.search_id
            
        if req.job_urls:
            filters['job_urls'] = req.job_urls
            
        return _generate_export(filters)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def _generate_export(filters):
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
    if req.exact_match_location or req.exact_match_title or req.salary or req.foreign_only or req.visa_sponsorship or req.remote_anywhere:
        import re
        filtered_jobs = []
        
        # Debug: Show what we're filtering for
        if req.exact_match_location:
            print(f"Exact match location filter enabled for: '{req.location}'")
        if req.exact_match_title:
            print(f"Exact match title filter enabled for: '{req.title}'")
        if req.salary:
            print(f"Salary filter enabled: Min {req.salary}")
        if req.foreign_only:
            print(f"Foreign only filter enabled (excluding INR)")
        
        for job in jobs:
            keep_job = True
            
            # Check exact location match (as complete word, not substring)
            if req.exact_match_location and req.location:
                job_location = job.get('location', '').lower().strip()
                job_city = job.get('city', '').lower().strip()
                job_state = job.get('state', '').lower().strip()
                search_location = req.location.lower().strip()
                
                # Create regex pattern to match search_location as a complete word
                # \b ensures word boundaries, so "india" won't match "indianapolis"
                try:
                    pattern = r'\b' + re.escape(search_location) + r'\b'
                    
                    # Check if search location appears as a complete word in any location field
                    location_match = (
                        re.search(pattern, job_location) is not None or
                        re.search(pattern, job_city) is not None or
                        re.search(pattern, job_state) is not None
                    )
                    
                    if not location_match:
                        keep_job = False
                except Exception:
                    pass # Regex error fallback
            
            # Check exact title match (exact match for title, not word boundary)
            if req.exact_match_title and req.title and keep_job:
                job_title = job.get('title', '').lower().strip()
                search_title = req.title.lower().strip()
                
                if search_title not in job_title:
                    keep_job = False

            # Salary Filtering
            if req.salary and keep_job:
                min_amount = job.get('min_amount')
                # If we don't have salary info, we currently keep it (optional: make this strict?)
                # For now, let's only filter OUT if we strictly know it's less than requested
                if min_amount is not None:
                     try:
                         # Normalize to monthly/yearly? 
                         # Usually JobSpy gives annual or hourly. 
                         # This is a naive check assuming similar periods or user inputs annual
                         if float(min_amount) < req.salary:
                             keep_job = False
                     except:
                         pass

            # Foreign/International Filtering
            if req.foreign_only and keep_job:
                currency = job.get('currency')
                # Filter out known INR or India indicators if we want 'foreign only'
                if currency and str(currency).upper() == 'INR':
                    keep_job = False
                # Double check location just in case currency is missing
                job_loc = job.get('location', '').lower()
                if 'india' in job_loc:
                    keep_job = False

            # Visa Sponsorship Filtering
            if req.visa_sponsorship and keep_job:
                description = job.get('description', '').lower()
                # Keywords that suggest visa support
                visa_keywords = [
                    "visa sponsorship", "visa support", "visa sponsored", 
                    "relocation support", "relocation assistance", "sponsorship available",
                    "work permit support"
                ]
                # Check if ANY keyword is present
                if not any(keyword in description for keyword in visa_keywords):
                    keep_job = False

            # Remote Anywhere Filtering
            if req.remote_anywhere and keep_job:
                location = job.get('location', '').lower()
                description = job.get('description', '').lower()
                job_type = job.get('job_type', '').lower()
                
                # Must be remote
                is_remote = "remote" in location or "remote" in job_type
                
                # Must indicate "anywhere" or global scope
                # "remote" in location alone isn't enough (could be "Remote, NY")
                # We look for "anywhere", "worldwide", "global"
                is_global = (
                    "anywhere" in location or "worldwide" in location or "global" in location or
                    "anywhere" in description or "worldwide" in description or "global" in description or
                    "work from anywhere" in description
                )
                
                if not (is_remote and is_global):
                    keep_job = False
            
            if keep_job:
                filtered_jobs.append(job)
        
        jobs = filtered_jobs
        print(f"After filtering: {len(jobs)} jobs remain")
    
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
