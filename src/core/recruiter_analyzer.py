import re
import json
import os

class RecruiterAnalyzer:
    def __init__(self, config_path=None):
        if not config_path:
            # Default to config/organizer_config.json relative to project root
            # Assuming this file is in src/core/, so root is ../../
            base_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            config_path = os.path.join(base_path, 'config', 'organizer_config.json')
        
        self.config = self._load_config(config_path)
        
        self.sender_keywords = self.config.get('keywords', {}).get('sender', [])
        self.subject_keywords = self.config.get('keywords', {}).get('subject', [])
        self.body_keywords = self.config.get('keywords', {}).get('body', [])
        
        self.priority_rules = self.config.get('priority_rules', {})

    def _load_config(self, path):
        try:
            with open(path, 'r') as f:
                return json.load(f)
        except Exception:
            # Fallback if config fails
            return {
                "keywords": {
                    "sender": ["hr", "talent", "recruitment", "careers", "hiring"],
                    "subject": ["job", "hiring", "opportunity"],
                    "body": ["jd", "description", "resume"]
                }
            }

    def analyze_email(self, sender: str, subject: str, body: str) -> dict:
        """
        Analyzes email for recruiter patterns using strict rule-based logic.
        """
        sender_lower = sender.lower()
        subject_lower = subject.lower()
        body_lower = body.lower()
        
        is_recruiter = False
        reasons = []
        
        # Rule 1: Sender Match
        if any(kw in sender_lower for kw in self.sender_keywords):
            is_recruiter = True
            reasons.append("Sender keyword match")

        # Rule 2: Subject Match (if not already matched)
        if not is_recruiter:
            if any(kw in subject_lower for kw in self.subject_keywords):
                is_recruiter = True
                reasons.append("Subject keyword match")
        
        # Rule 3: Body Match (Stronger requirement: combine keywords?)
        # For now, let's say if subject didn't match, we need at least one strong body keyword 
        # OR multiple weak ones. But requirements say "any combination matches".
        if not is_recruiter:
             if any(kw in body_lower for kw in self.body_keywords):
                 is_recruiter = True
                 reasons.append("Body keyword match")

        if not is_recruiter:
            return {
                "is_recruiter": False,
                "classification": None
            }
            
        # If it IS a recruiter, classify it
        source = self.detect_source(sender)
        company = self.extract_company(sender, subject, body, source)
        priority = self.classify_priority(subject, body, company)
        
        classification = {
            "source": source,
            "company": company,
            "priority": priority,
            "reasons": reasons
        }
        
        return {
            "is_recruiter": True,
            "classification": classification
        }
    
    def detect_source(self, sender: str) -> str:
        sender_lower = sender.lower()
        if 'linkedin.com' in sender_lower: return 'LinkedIn'
        if 'naukri.com' in sender_lower: return 'Naukri'
        if 'indeed.com' in sender_lower: return 'Indeed'
        if 'instahyre.com' in sender_lower: return 'Instahyre'
        if 'wellfound' in sender_lower or 'angel.co' in sender_lower: return 'Wellfound'
        if 'hirist' in sender_lower: return 'Hirist'
        
        # Generalized Check
        if any(x in sender_lower for x in ['consultancy', 'staffing', 'recruiter']):
             return 'Consultancy'
             
        return 'Direct' # Default to Direct/Company if specific portal not found
        
    def extract_company(self, sender: str, subject: str, body: str, source: str) -> str:
        # 1. From Subject: "Hiring for <Company>" or "Opening at <Company>"
        # Regex for "at X" or "for X"
        # Avoid "Hiring for Python Developer" -> "Python Developer" is not company
        
        subject_patterns = [
            r'(?:hiring|opening|position|role|vacancy) (?:at|for) ([A-Z][a-zA-Z0-9\s\&]+)',
            r'from ([A-Z][a-zA-Z0-9\s\&]+)'
        ]
        
        for pattern in subject_patterns:
            match = re.search(pattern, subject)
            if match:
                candidate = match.group(1).strip()
                # Filter out likely false positives (roles, generic terms)
                if not self._is_ignored_company_name(candidate):
                    return candidate

        # 2. From Body: "Company: X"
        body_patterns = [
            r'(?:Client|Company|Organization):\s*([A-Za-z0-9\s\&]+)'
        ]
        for pattern in body_patterns:
            match = re.search(pattern, body)
            if match:
                candidate = match.group(1).strip().split('\n')[0] # Take first line only
                if len(candidate) < 50 and not self._is_ignored_company_name(candidate):
                    return candidate

        # 3. From Sender Domain (Recruiter/Direct only)
        if source == 'Direct':
            email_match = re.search(r'<.*?@(.*?)>', sender)
            if not email_match:
                 email_match = re.search(r'([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})', sender)
            
            if email_match:
                domain = email_match.group(1).lower()
                # Remove common email providers
                ignore_domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'live.com']
                if domain not in ignore_domains:
                    # amazon.com -> Amazon
                    company_name = domain.split('.')[0].title()
                    return company_name
                    
        return "Unknown"

    def _is_ignored_company_name(self, name):
        name_lower = name.lower()
        ignored = [
            'immediate', 'urgent', 'hiring', 'opportunity', 'job', 'role', 'vacancy', 
            'opening', 'client', 'leading', 'reputed', 'mnc', 'startup',
            'python', 'java', 'react', 'senior', 'junior', 'developer', 'engineer'
        ]
        return any(x == name_lower for x in ignored) or any(x in name_lower for x in ['years', 'month', 'experience'])

    def classify_priority(self, subject: str, body: str, company: str) -> str:
        text = (subject + " " + body).lower()
        
        high_rules = self.priority_rules.get('high', {})
        medium_rules = self.priority_rules.get('medium', {})
        low_rules = self.priority_rules.get('low', {})
        
        # LOW PRIORITY CHECKS FIRST
        if any(kw in text for kw in low_rules.get('keywords', [])):
            return 'Low'
            
        # HIGH PRIORITY CHECKS
        
        # Location match
        if any(loc in text for loc in high_rules.get('locations', [])):
            return 'High'
            
        # Tech stack match (if many matches)
        tech_matches = sum(1 for tech in high_rules.get('tech_stack', []) if tech in text)
        if tech_matches >= 2:
            return 'High'
            
        # Keywords
        if any(kw in text for kw in high_rules.get('keywords', [])):
            return 'High'
            
        # MEDIUM PRIORITY
        # Good company?
        # Tech stack single match?
        if tech_matches >= 1:
            return 'Medium'
        
        if any(tech in text for tech in medium_rules.get('tech_stack', [])):
            return 'Medium'

        return 'Low'

