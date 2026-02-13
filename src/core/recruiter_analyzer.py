
import re

class RecruiterAnalyzer:
    def __init__(self):
        self.sender_keywords = [
            'hr', 'talent', 'recruitment', 'careers', 'hiring', 'jobs', 
            'staffing', 'human resources', 'people', 'acquisition', 'team'
        ]
        
        self.subject_keywords = [
            'job opportunity', 'we are hiring', "we're hiring", 
            'immediate requirement', 'position for', 'opening', 'vacancy',
            'job application', 'interview', 'shortlisted', 'offer',
            'developer', 'engineer', 'analyst', 'consultant', 'role'
        ]
        
        self.body_keywords = [
            'jd attached', 'job description', 'ctc', 'notice period', 
            'experience required', 'resume', 'cv', 'profile', 
            'salary', 'budget', 'urgent', 'referral', 'apply',
            'key skills', 'responsibilities', 'location', 'years of experience'
        ]

    def analyze_email(self, sender: str, subject: str, body: str) -> dict:
        """
        Analyzes email for recruiter patterns.
        Returns a dict with is_recruiter check and details.
        """
        sender_lower = sender.lower()
        subject_lower = subject.lower()
        body_lower = body.lower()
        
        score = 0
        reasons = []
        
        # Check Sender (High confidence if matches)
        for kw in self.sender_keywords:
            if kw in sender_lower:
                score += 3
                reasons.append(f"Sender keyword: {kw}")
                break 
                
        # Check Subject (High confidence)
        for kw in self.subject_keywords:
            if kw in subject_lower:
                score += 4
                reasons.append(f"Subject keyword: {kw}")
                break
                
        # Check Body (Accumulative)
        match_count = 0
        for kw in self.body_keywords:
             if kw in body_lower:
                match_count += 1
                if match_count <= 5: 
                     reasons.append(f"Body keyword: {kw}")
        
        score += min(match_count, 5) * 0.5 # 0.5 points per body keyword
            
        
        # Decision Threshold
        is_recruiter = score >= 4.5
        
        source = self.detect_source(sender)
        company = self.extract_company(sender, subject, body)
        
        return {
            "is_recruiter": is_recruiter,
            "score": score,
            "reasons": reasons,
            "source": source,
            "company": company
        }
    
    def detect_source(self, sender: str) -> str:
        sender_lower = sender.lower()
        if 'linkedin' in sender_lower: return 'LinkedIn'
        if 'naukri' in sender_lower: return 'Naukri'
        if 'indeed' in sender_lower: return 'Indeed'
        if 'instahyre' in sender_lower: return 'Instahyre'
        if 'wellfound' in sender_lower or 'angel.co' in sender_lower: return 'Wellfound'
        if 'hirist' in sender_lower: return 'Hirist'
        return 'Direct' # Default to Direct/Company
        
    def extract_company(self, sender: str, subject: str, body: str) -> str:
        # Simple heuristic: often in "@company.com" or "at Company"
        # 1. Try to extract from email domain if not generic
        email_match = re.search(r'<.*?@(.*?)>', sender)
        if email_match:
            domain = email_match.group(1)
            if domain not in ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'linkedin.com', 'naukri.com', 'indeed.com']:
                return domain.split('.')[0].title()
                
        # 2. Try "at Company" in subject
        at_match = re.search(r'\bat\s+([A-Z][a-zA-Z0-9\s]+)', subject)
        if at_match:
            # Filter out common false positives
            company = at_match.group(1).strip()
            if company.lower() not in ['immediate', 'urgent', 'hiring', 'opportunity']:
                 return company
                 
        return "Unknown"
