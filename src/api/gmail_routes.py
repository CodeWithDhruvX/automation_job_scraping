from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import os
import sys

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from src.connectors.gmail_connector import GmailConnector
from src.core.recruiter_analyzer import RecruiterAnalyzer

router = APIRouter(prefix="/api/gmail", tags=["gmail"])

# Initialize Connector
gmail_connector = GmailConnector()
recruiter_analyzer = RecruiterAnalyzer()

class OrganizeRequest(BaseModel):
    days: int = 7
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    accounts: Optional[List[str]] = None

@router.get("/emails")
async def get_organized_emails(
    category: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    days: int = 1
):
    """Get organized Gmail emails with optional date range filtering."""
    try:
        # Use date range if provided, otherwise use days
        emails = gmail_connector.scan_emails(
            days=days,
            start_date=start_date,
            end_date=end_date
        )
        
        # Transform to frontend format
        organized_emails = []
        for email in emails:
            # Get additional info from recruiter analyzer if available
            source = email.get('source', 'Unknown')
            company = email.get('company', 'Unknown')
            
            # Determine priority based on detection method and other factors
            priority = 'Medium'
            if email.get('detection_method') == 'ICS_ATTACHMENT' or 'interview' in email.get('subject', '').lower():
                priority = 'High'
            
            # Determine status
            status = 'New'
            if email.get('status') == 'ADDED':
                status = 'Interview'
            elif email.get('status') == 'IGNORED':
                status = 'Ignored'
            
            # Determine if there's an attachment
            has_attachment = email.get('detection_method') == 'ICS_ATTACHMENT'
            
            # Create labels
            labels = []
            if source:
                labels.append(f"Recruiter/{source}")
            if priority:
                labels.append(f"Priority/{priority}")
            labels.append(f"Status/{status}")
                
            organized_email = {
                'id': email.get('id'),
                'subject': email.get('subject'),
                'sender': email.get('sender'),
                'company': company,
                'source': source,
                'portal': f"Recruiter/{source}",
                'priority': priority,
                'labels': labels,
                'received': email.get('detection_timestamp'),
                'hasAttachment': has_attachment,
                'status': status,
                'email_url': email.get('email_url'),
                'meeting_link': email.get('meeting_link')
            }
            
            # Apply category filter if specified
            if category:
                if category == 'recruiters':
                    if email.get('detection_method') not in ['RECRUITER_PATTERN', 'ICS_ATTACHMENT', 'LINK_PATTERN']:
                        continue
                elif category == 'high_priority':
                    if priority != 'High':
                        continue
                elif category == 'interviews':
                    if status != 'Interview':
                        continue
                elif category == 'follow_up':
                    # Logic for follow-up (e.g., emails older than 3 days with no response)
                    pass
                        
            organized_emails.append(organized_email)
        
        return organized_emails
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/organize/cancel")
async def cancel_organize():
    """Cancels the ongoing email scan."""
    gmail_connector.cancel_scan()
    return {"status": "cancellation_requested"}

@router.post("/organize")
async def organize_emails(req: OrganizeRequest):
    """Run the Gmail organizer to scan and categorize emails."""
    try:
        emails = gmail_connector.scan_emails(
            days=req.days, 
            start_date=req.start_date, 
            end_date=req.end_date,
            target_accounts=req.accounts
        )
        
        return {
            "status": "success",
            "scanned": len(emails),
            "message": f"Successfully organized {len(emails)} emails"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats")
async def get_email_stats():
    """Get statistics about organized emails."""
    try:
        emails = gmail_connector.scan_emails(days=30)
        
        total = len(emails)
        recruiters = len([e for e in emails if e.get('detection_method') in ['RECRUITER_PATTERN', 'ICS_ATTACHMENT', 'LINK_PATTERN']])
        applications = 0  # Could be enhanced with additional tracking
        interviews = len([e for e in emails if e.get('detection_method') == 'ICS_ATTACHMENT' or 'interview' in e.get('subject', '').lower()])
        
        return {
            "total": total,
            "recruiters": recruiters,
            "applications": applications,
            "interviews": interviews
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
