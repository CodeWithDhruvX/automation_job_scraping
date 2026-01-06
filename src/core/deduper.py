from sqlalchemy.exc import IntegrityError
from src.core.database import Job
from src.utils.logger import logger
from datetime import datetime

class Deduper:
    def __init__(self, session):
        self.session = session

    def is_duplicate(self, job_dict: dict) -> bool:
        """
        Checks if a job already exists in the database.
        Check 1: Exact URL match (fastest).
        Check 2: Composite hash of (Company + Title + Location) to detect same job listed on different URLs (optional but recommended).
        """
        url = job_dict.get('url')
        if not url:
            return True # Treat invalid URL as duplicate/invalid to skip

        # Check by URL
        exists = self.session.query(Job).filter_by(url=url).first()
        if exists:
            # Update last_seen
            exists.last_seen = datetime.utcnow()
            try:
                self.session.commit()
            except:
                self.session.rollback()
            return True
            
        # Optional: Check by fuzzy match or composite key
        # For now, we rely on URL as the primary source of truth to avoid false positives.
        
        return False

    def dedupe_and_save(self, jobs: list[dict]):
        """
        Iterates through jobs, checks for duplicates, and saves new ones.
        """
        new_count = 0
        for job_data in jobs:
            if not self.is_duplicate(job_data):
                try:
                    new_job = Job(
                        title=job_data.get('title'),
                        company=job_data.get('company'),
                        location=job_data.get('location'),
                        url=job_data.get('url'),
                        source=job_data.get('source'),
                        keyword=job_data.get('keyword'),
                        date_found=datetime.utcnow(),
                        last_seen=datetime.utcnow()
                    )
                    self.session.add(new_job)
                    self.session.commit()
                    new_count += 1
                except IntegrityError:
                    self.session.rollback()
                    logger.warning(f"Integrity Error saving job: {job_data.get('url')}")
                except Exception as e:
                    self.session.rollback()
                    logger.error(f"Error saving job: {e}")
        
        logger.info(f"Saved {new_count} new jobs out of {len(jobs)} processed.")
