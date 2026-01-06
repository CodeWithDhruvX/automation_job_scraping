import json
import os
import datetime
from typing import List, Dict, Optional
import pandas as pd

class JobManager:
    def __init__(self, data_file: str = "data/job_history.json"):
        self.data_file = data_file
        self.jobs: Dict[str, Dict] = {}  # Key: Job URL, Value: Job Data
        self._load_data()

    def _load_data(self):
        """Loads jobs from JSON file."""
        if os.path.exists(self.data_file):
            try:
                with open(self.data_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    # Convert list to dict keyed by URL for fast access
                    # Assuming data is stored as a list of dicts
                    if isinstance(data, list):
                        for job in data:
                            url = job.get('job_url') or job.get('url') # Handle legacy or different keys
                            if url:
                                self.jobs[url] = job
                    elif isinstance(data, dict):
                        self.jobs = data
            except Exception as e:
                print(f"Error loading job history: {e}")
                self.jobs = {}
        else:
            self.jobs = {}

    def save_data(self):
        """Saves jobs to JSON file."""
        import math
        
        try:
            # Ensure directory exists
            os.makedirs(os.path.dirname(self.data_file), exist_ok=True)
            
            # Sanitize data before saving
            jobs_to_save = []
            for job in self.jobs.values():
                # Create a copy to avoid mutating the original
                sanitized_job = {}
                for key, value in job.items():
                    # Convert NaN, Inf to None for valid JSON
                    if isinstance(value, float):
                        if math.isnan(value) or math.isinf(value):
                            sanitized_job[key] = None
                        else:
                            sanitized_job[key] = value
                    else:
                        sanitized_job[key] = value
                jobs_to_save.append(sanitized_job)
            
            with open(self.data_file, 'w', encoding='utf-8') as f:
                # Save as list for better readability/interop
                json.dump(jobs_to_save, f, indent=2, default=str)
        except Exception as e:
            print(f"Error saving job history: {e}")

    def add_jobs(self, new_jobs: List[Dict]) -> int:
        """
        Adds new jobs to the manager. 
        Returns the number of *newly* added jobs (not previously seen).
        """
        count = 0
        for job in new_jobs:
            url = job.get('job_url')
            if not url:
                continue
                
            if url not in self.jobs:
                # Initialize status for new job
                job['my_status'] = 'NEW'  # Statuses: NEW, APPLIED, SKIPPED, SAVED
                job['added_date'] = datetime.datetime.now().isoformat()
                self.jobs[url] = job
                count += 1
            else:
                # Optional: Update existing job data if needed? 
                # For now, we respect the old status and just maybe update description if missing
                pass
        
        if count > 0:
            self.save_data()
        
        return count

    def get_all_jobs(self) -> List[Dict]:
        """Returns all jobs as a list, with JSON-safe values."""
        import math
        
        jobs_list = list(self.jobs.values())
        
        # Sanitize float values for JSON compliance
        for job in jobs_list:
            for key, value in job.items():
                # Convert NaN, Inf, -Inf to None
                if isinstance(value, float):
                    if math.isnan(value) or math.isinf(value):
                        job[key] = None
        
        return jobs_list

    def get_jobs_by_status(self, status: str) -> List[Dict]:
        return [job for job in self.jobs.values() if job.get('my_status') == status]

    def update_status(self, job_url: str, new_status: str):
        if job_url in self.jobs:
            self.jobs[job_url]['my_status'] = new_status
            self.jobs[job_url]['status_updated_at'] = datetime.datetime.now().isoformat()
            self.save_data()

    def export_to_pandas(self, filters: Dict = None) -> pd.DataFrame:
        data = list(self.jobs.values())
        if not data:
            return pd.DataFrame()
        
        df = pd.DataFrame(data)
        
        # Renaissance of the UPPERCASE columns for Excel Export
        rename_map = {
            "site": "SITE",
            "title": "TITLE",
            "company": "COMPANY",
            "city": "CITY", 
            "state": "STATE",
            "location": "LOCATION", # Fallback if city/state empty
            "job_type": "JOB_TYPE",
            "interval": "INTERVAL",
            "min_amount": "MIN_AMOUNT",
            "max_amount": "MAX_AMOUNT",
            "job_url": "JOB_URL",
            "description": "DESCRIPTION",
            "date_posted": "DATE_POSTED"
        }
        
        # Filter and rename
        export_cols = ["SITE", "TITLE", "COMPANY", "CITY", "STATE", "JOB_TYPE", "INTERVAL", "MIN_AMOUNT", "MAX_AMOUNT", "JOB_URL", "DATE_POSTED"]
        
        # Rename existing columns
        df = df.rename(columns=rename_map)
        
        # Ensure all export_cols exist
        for col in export_cols:
            if col not in df.columns:
                df[col] = ""
                
        # Select only requested columns
        df = df[export_cols]
            
        return df
