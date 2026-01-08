from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from src.services.reminder_service import ReminderService

router = APIRouter(prefix="/api/reminders", tags=["reminders"])
service = ReminderService()

class CalendarRequest(BaseModel):
    account_id: str
    job_details: Dict[str, Any]
    time: str # ISO format
    duration_minutes: Optional[int] = 30
    attendees: Optional[List[str]] = None
    reminders: Optional[Dict[str, Any]] = None
    color_id: Optional[str] = None
    transparency: Optional[str] = 'opaque'
    add_google_meet: bool = False

class EmailRequest(BaseModel):
    account_id: str
    job_details: Dict[str, Any]

class TaskRequest(BaseModel):
    account_id: str
    job_details: Dict[str, Any]
    due_date: str # ISO format
    tasklist_id: str = '@default'
    notes: Optional[str] = None

@router.post("/calendar")
def create_calendar_event(req: CalendarRequest):
    """Creates a calendar event for the specified account."""
    try:
        result = service.create_calendar_event(
            account_id=req.account_id, 
            job_details=req.job_details, 
            time_iso=req.time,
            duration_minutes=req.duration_minutes,
            attendees=req.attendees,
            reminders=req.reminders,
            color_id=req.color_id,
            transparency=req.transparency,
            add_google_meet=req.add_google_meet
        )
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

@router.get("/google/tasklists")
def get_task_lists(account_id: str):
    """Fetches Google Task lists for the account."""
    try:
        result = service.get_google_task_lists(account_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/tasks")
def create_task(req: TaskRequest):
    """Creates a Google Task."""
    try:
        result = service.create_google_task(
            req.account_id, 
            req.job_details, 
            req.due_date,
            tasklist_id=req.tasklist_id,
            notes=req.notes
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
