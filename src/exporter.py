import pandas as pd
import os
from datetime import datetime
from src.core.database import Job
from src.utils.logger import logger

class Exporter:
    def __init__(self, session, config):
        self.session = session
        self.config = config
        self.output_dir = self.config.get('export', {}).get('output_dir', 'data/exports')
        self.format = self.config.get('export', {}).get('format', 'excel').lower()
        
        if not os.path.exists(self.output_dir):
            os.makedirs(self.output_dir)

    def export_jobs(self):
        """
        Exports all jobs from the database to the configured format.
        """
        try:
            # Query all jobs
            jobs_query = self.session.query(Job).all()
            if not jobs_query:
                logger.info("No jobs to export.")
                return

            # Convert to list of dicts
            data = [job.to_dict() for job in jobs_query]
            df = pd.DataFrame(data)
            
            # Select and reorder columns
            cols = ["title", "company", "location", "source", "url", "keyword", "date_found"]
            # Ensure columns exist (handle empty DB case gracefully)
            df = df[[c for c in cols if c in df.columns]]

            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"jobs_{timestamp}"

            if self.format == 'csv':
                path = os.path.join(self.output_dir, f"{filename}.csv")
                df.to_csv(path, index=False, encoding='utf-8')
                logger.info(f"Exported {len(df)} jobs to {path}")
            else:
                path = os.path.join(self.output_dir, f"{filename}.xlsx")
                df.to_excel(path, index=False)
                logger.info(f"Exported {len(df)} jobs to {path}")
                
        except Exception as e:
            logger.error(f"Export failed: {e}")
