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

invite_manager = InviteManager()
gmail_connector = GmailConnector()

class ScanRequest(BaseModel):
    days: int = 1

class InviteStatusUpdate(BaseModel):
    status: str

@router.post("/scan")
def scan_invites(req: ScanRequest):
    """Triggers an email scan for invites."""
    try:
        invites = gmail_connector.scan_emails(days=req.days)
        new_count = invite_manager.add_invites(invites)
        if gmail_connector._cancel_scan:
             return {"status": "cancelled", "found": len(invites), "new": new_count, "invites": invites}
        return {"status": "success", "found": len(invites), "new": new_count, "invites": invites}
    except Exception as e:
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
