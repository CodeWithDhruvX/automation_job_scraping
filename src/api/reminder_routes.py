from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Any
from src.services.reminder_service import ReminderService

router = APIRouter(prefix="/api/reminders", tags=["reminders"])
service = ReminderService()

class CalendarRequest(BaseModel):
    account_id: str
    job_details: Dict[str, Any]
    time: str # ISO format

class EmailRequest(BaseModel):
    account_id: str
    job_details: Dict[str, Any]

@router.post("/calendar")
def create_calendar_event(req: CalendarRequest):
    """Creates a calendar event for the specified account."""
    try:
        result = service.create_calendar_event(req.account_id, req.job_details, req.time)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        # In production, log specific error
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/email")
def send_email_reminder(req: EmailRequest):
    """Sends an email reminder to self."""
    try:
        result = service.send_email_reminder(req.account_id, req.job_details)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
