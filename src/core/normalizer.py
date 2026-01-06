import re

class DataNormalizer:
    @staticmethod
    def normalize_title(title: str) -> str:
        """
        Cleans and normalizes job titles.
        Example: "Senior Backend Engineer (Remote)" -> "Senior Backend Engineer"
        """
        if not title:
            return ""
        
        # Remove text in parentheses (often contains location or contract type)
        # e.g., "Engineer (Remote) - $100k"
        cleaned = re.sub(r'\(.*?\)', '', title)
        
        # Remove commonly seen pipes or dashes at the end
        if '|' in cleaned:
            cleaned = cleaned.split('|')[0]
        if ' - ' in cleaned:
            # Often "Role - Company" or "Role - Location"
            cleaned = cleaned.split(' - ')[0]
            
        return cleaned.strip()

    @staticmethod
    def normalize_location(location: str) -> str:
        """
        Standardizes location strings.
        Example: "New York, NY 10001" -> "New York, NY"
        """
        if not location:
            return "Unknown"
        
        # Basic cleanup
        cleaned = location.strip()
        
        # Normalize "Remote" variations
        if 'remote' in cleaned.lower():
            return 'Remote'
            
        return cleaned

    @staticmethod
    def normalize_job(job_dict: dict) -> dict:
        """
        Runs full normalization on a job dictionary.
        """
        job_dict['title'] = DataNormalizer.normalize_title(job_dict.get('title'))
        job_dict['location'] = DataNormalizer.normalize_location(job_dict.get('location'))
        job_dict['company'] = (job_dict.get('company') or "").strip()
        return job_dict
