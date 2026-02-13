from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional
import os
import sys

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from src.core.invite_manager import InviteManager
from src.connectors.gmail_connector import GmailConnector

router = APIRouter(prefix="/api/invites", tags=["invites"])

# Initialize Connector (handles migration and token loading)
invite_manager = InviteManager()
gmail_connector = GmailConnector()

class ScanRequest(BaseModel):
    days: int = 1
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    accounts: Optional[List[str]] = None

class InviteStatusUpdate(BaseModel):
    status: str

@router.get("/accounts")
async def get_accounts():
    """Get list of connected Gmail accounts."""
    return gmail_connector.get_accounts()

@router.post("/accounts")
async def add_account():
    """Add a new Gmail account (opens browser for auth)."""
    # This might block until auth is complete or timeout
    result = gmail_connector.add_new_account()
    if result.get("status") == "error":
        raise HTTPException(status_code=500, detail=result.get("message"))
    return result

@router.delete("/accounts/{email}")
async def remove_email_account(email: str):
    """Remove a connected Gmail account."""
    success = gmail_connector.remove_account(email)
    if not success:
        raise HTTPException(status_code=404, detail="Account not found")
    return {"status": "removed", "email": email}

@router.post("/scan")
def scan_invites(req: ScanRequest):
    """Triggers an email scan for invites."""
    try:
        invites = gmail_connector.scan_emails(
            days=req.days, 
            start_date=req.start_date, 
            end_date=req.end_date,
            target_accounts=req.accounts
        )
        new_count = invite_manager.add_invites(invites)
        if gmail_connector._cancel_scan:
             return {"status": "cancelled", "found": len(invites), "new": new_count, "invites": invites}
        return {"status": "success", "found": len(invites), "new": new_count, "invites": invites}
    except Exception as e:
        # In case of error, we should still return what was found? 
        # But for now, let's just raise exception to inform frontend
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/scan/cancel")
async def cancel_scan():
    """Cancels the ongoing email scan."""
    gmail_connector.cancel_scan()
    return {"status": "cancellation_requested"}

@router.get("/")
async def get_invites():
    """Get all logged invites."""
    return invite_manager.get_all_invites()

@router.put("/{invite_id}/status")
async def update_invite_status(invite_id: str, update: InviteStatusUpdate):
    """Update invite status (e.g. IGNORED, ADDED)."""
    success = invite_manager.update_status(invite_id, update.status)
    if not success:
        raise HTTPException(status_code=404, detail="Invite not found")
    return {"status": "updated", "invite_id": invite_id, "new_status": update.status}

@router.post("/{invite_id}/calendar")
async def add_to_calendar(invite_id: str):
    """Add specific invite to Google Calendar."""
    invite = invite_manager.get_invite(invite_id)
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    
    result = gmail_connector.add_to_calendar(invite)
    
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    
    # Update status to ADDED
    invite_manager.update_status(invite_id, 'ADDED')
    
    return result
