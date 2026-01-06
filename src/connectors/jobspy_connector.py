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

    def search(self, query: str, **kwargs) -> List[Dict]:
        """
        Executes a search using JobSpy.
        
        Args:
            query (str): Job title or keywords.
            **kwargs: Additional arguments like:
                - site_name (List[str] or str): e.g. ["indeed", "linkedin"]
                - location (str): e.g. "New York, NY"
                - hours_old (int): Filter by posting date (hours)
                - country_indir (str): Country for Indeed/Glassdoor (default: from config or 'India')
                - results_wanted (int): Max results (default: from config or 20)
        """
        logger.info(f"Searching via JobSpy for: {query} | Filters: {kwargs}")
        
        try:
            # Resolve parameters with fallback to config defaults
            site_names = kwargs.get('site_name') or ["linkedin", "indeed", "glassdoor"]
            if isinstance(site_names, str):
                site_names = [site_names]
                
            location = kwargs.get('location', '')
            results_wanted = kwargs.get('results_wanted') or self.results_wanted
            country_indir = kwargs.get('country_indir') or self.country_indir
            hours_old = kwargs.get('hours_old', None) # None means no time filter
            job_type = kwargs.get('job_type', None)
            
            # Map robustly
            scrape_args = {
                "site_name": site_names,
                "search_term": query,
                "location": location,
                "results_wanted": results_wanted,
                "country_indir": country_indir,
                "hours_old": hours_old,
                "proxies": self.proxies if self.proxies else None,
            }
            
            # Add optional supported args if present
            if job_type:
                scrape_args["job_type"] = job_type
                
            jobs_df = scrape_jobs(**scrape_args)
            
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
        
        for _, row in jobs_df.iterrows():
            try:
                # Basic mapping
                location = row.get('location', 'Unknown Location')
                if pd.isna(location):
                    location = 'Unknown Location'
                
                # Helper function to safely extract values and handle NaN
                def safe_value(val, default=''):
                    if pd.isna(val):
                        return default if isinstance(default, str) else None
                    return val
                
                # Use standard lowercase keys for internal app consistency
                job_data = {
                    "site": safe_value(row.get('site'), 'Unknown'),
                    "title": safe_value(row.get('title'), 'Unknown Title'),
                    "company": safe_value(row.get('company'), 'Unknown Company'),
                    "location": location,
                    "city": safe_value(row.get('city'), ''),
                    "state": safe_value(row.get('state'), ''),
                    "job_type": safe_value(row.get('job_type'), ''),
                    "interval": safe_value(row.get('interval'), ''),
                    "min_amount": safe_value(row.get('min_amount'), None),
                    "max_amount": safe_value(row.get('max_amount'), None),
                    "job_url": safe_value(row.get('job_url') or row.get('job_url_direct'), ''),
                    "description": safe_value(row.get('description'), ''),
                    "date_posted": safe_value(str(row.get('date_posted', '')), ''), # Ensure string for JSON serialization
                    "currency": safe_value(row.get('currency'), None),
                    
                    # Internal metadata
                    "source": f"JobSpy - {safe_value(row.get('site'), 'Unknown')}",
                    "keyword": query,
                    "date_found": datetime.utcnow().isoformat(),
                }
                
                # Check required fields
                if not job_data['job_url']:
                    continue # Skip if no URL
                    
                results.append(job_data)
            except Exception as e:
                logger.warning(f"Error parsing JobSpy row: {e}")
                continue
                
        return results
