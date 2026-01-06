import schedule
import time
import yaml
import os
from src.utils.logger import logger
from src.utils.query_gen import QueryGenerator
from src.core.database import DatabaseManager
from src.core.normalizer import DataNormalizer
from src.core.deduper import Deduper
from src.exporter import Exporter

# Connectors
from src.connectors.jobspy_connector import JobSpyConnector

def load_config():
    config_path = os.path.join(os.path.dirname(__file__), '../config/config.yaml')
    with open(config_path, 'r') as f:
        return yaml.safe_load(f)

def run_job_search():
    logger.info("Starting Job Search Routine (Free Mode)...")
    config = load_config()
    
    # 1. Setup DB
    db_manager = DatabaseManager(config['database']['connection_string'])
    db_manager.create_tables()
    session = db_manager.get_session()
    
    # 2. Generate Queries
    query_gen = QueryGenerator(config)
    
    # 3. Initialize Connectors
    connectors = []
    
    # We use FreeSearchConnector for general "Google-like" queries if enabled
    # In config, we previously had 'google_jobs' and 'linkedin_via_google'.
    # We'll map 'google_jobs' enabled status to doing a general DuckDuckGo search.
    if config['sources'].get('google_jobs', {}).get('enabled'):
        connectors.append(FreeSearchConnector(config))
        
    if config['sources'].get('jobspy', {}).get('enabled'):
        connectors.append(JobSpyConnector(config))

    # 4. Fetch & Process
    all_jobs = []
    


    # For JobSpy
    js_connector = next((c for c in connectors if isinstance(c, JobSpyConnector)), None)
    if js_connector:
        # JobSpy supports searching for broader terms, so we can iterate through roles
        for role in config['roles']:
            # Combine role + location for better targeting if needed, 
            # but JobSpy takes location separately. We have `country_indir` in config.
            # We can just pass the role as the query.
            jobs = js_connector.search(role)
            all_jobs.extend(jobs)

    logger.info(f"Total raw jobs found: {len(all_jobs)}")

    # 5. Normalize & Dedupe
    normalized_jobs = [DataNormalizer.normalize_job(j) for j in all_jobs]
    
    deduper = Deduper(session)
    deduper.dedupe_and_save(normalized_jobs)
    
    # 6. Export
    exporter = Exporter(session, config)
    exporter.export_jobs()
    
    session.close()
    logger.info("Job Search Routine Completed.")

def main():
    logger.info("Job Scraper Service Started")
    
    # Run once immediately on startup
    run_job_search()
    
    # Schedule
    config = load_config()
    run_time = config['scheduler'].get('run_at', "09:00")
    interval = config['scheduler'].get('interval_hours', 24)
    
    # Schedule daily at specific time
    schedule.every().day.at(run_time).do(run_job_search)
    
    logger.info(f"Scheduler set to run daily at {run_time}")
    
    while True:
        schedule.run_pending()
        time.sleep(60)

if __name__ == "__main__":
    main()
