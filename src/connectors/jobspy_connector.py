import pandas as pd
from typing import List, Dict
from datetime import datetime
from jobspy import scrape_jobs
from src.connectors.base import BaseConnector
from src.utils.logger import logger

class JobSpyConnector(BaseConnector):
    """
    Uses python-jobspy library to scrape jobs from LinkedIn, Indeed, Glassdoor, etc.
    """
    def __init__(self, config=None):
        super().__init__(config)
        self.jobspy_config = self.config.get('sources', {}).get('jobspy', {})
        self.proxies = self.jobspy_config.get('proxies', [])
        # Default to a reasonable number if not specified
        self.results_wanted = self.config.get('search', {}).get('results_wanted', 20) 
        self.country_indir = self.config.get('search', {}).get('country_indir', 'India')

    def search(self, query: str) -> List[Dict]:
        """
        Executes a search using JobSpy.
        """
        logger.info(f"Searching via JobSpy for: {query}")
        
        try:
            # JobSpy supports finding jobs on: linkedin, indeed, glassdoor, zip_recruiter
            # We can expose this as a configurable list or default to a set
            site_names = ["linkedin", "indeed", "glassdoor", "zip_recruiter"]
            
            jobs_df = scrape_jobs(
                site_name=site_names,
                search_term=query,
                results_wanted=self.results_wanted,
                country_indir=self.country_indir, # or 'USA', 'UK' etc.
                proxies=self.proxies if self.proxies else None
            )
            
            if jobs_df is None or jobs_df.empty:
                logger.warning(f"JobSpy found no jobs for query: {query}")
                return []
            
            logger.info(f"JobSpy found {len(jobs_df)} jobs for query: {query}")
            return self._transform_to_standard_schema(jobs_df, query)

        except Exception as e:
            logger.error(f"JobSpy search failed for {query}: {e}")
            return []

    def _transform_to_standard_schema(self, jobs_df: pd.DataFrame, query: str) -> List[Dict]:
        """
        Transforms JobSpy DataFrame to standard list of dicts.
        """
        results = []
        # JobSpy returns columns like: id, site, job_url, job_url_direct, title, company, location, date_posted, etc.
        
        for _, row in jobs_df.iterrows():
            try:
                # Basic mapping
                job_data = {
                    "title": row.get('title', 'Unknown Title'),
                    "company": row.get('company', 'Unknown Company'),
                    "location": row.get('location', 'Unknown Location'),
                    "url": row.get('job_url') or row.get('job_url_direct'),
                    "source": f"JobSpy - {row.get('site', 'Unknown')}",
                    "keyword": query,
                    "date_found": datetime.utcnow().isoformat()
                }
                
                # Check required fields
                if not job_data['url']:
                    continue # Skip if no URL
                    
                results.append(job_data)
            except Exception as e:
                logger.warning(f"Error parsing JobSpy row: {e}")
                continue
                
        return results
