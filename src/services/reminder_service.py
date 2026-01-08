import datetime
from typing import Dict, Optional, List, Any
import uuid
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleRequest
from googleapiclient.discovery import build
import os
import requests
from src.services.auth_manager import AuthManager

# Instantiate AuthManager
auth_manager = AuthManager()

class ReminderService:
    def get_connected_accounts(self):
        return auth_manager.list_accounts()

    def _get_google_creds(self, token_data: Dict):
        creds = Credentials(
            token=token_data.get('token'),
            refresh_token=token_data.get('refresh_token'),
            token_uri=token_data.get('token_uri') or "https://oauth2.googleapis.com/token",
            client_id=token_data.get('client_id'),
            client_secret=token_data.get('client_secret'),
            scopes=token_data.get('scopes')
        )
        if creds.expired and creds.refresh_token:
            creds.refresh(GoogleRequest())
            # Update stored token
            # Note: We'd need the account details to update. 
            # Ideally AuthManager would handle refresh and auto-save, 
            # but for now we rely on the library or just let it work in memory for the request.
            # To persist, we'd need to catch the updated token. 
            # Simplifying for MVP.
        return creds

    def _refresh_outlook_token(self, account_id: str, token_data: Dict) -> Dict:
        # Check if expired or close to expiration
        # For simplicity, let's always try to refresh if it fails or rely on client
        # In this implementation, we'll assume the token is valid or we handle 401.
        # Proper refresh requires making a POST to token endpoint with refresh_token.
        
        # If we have client_id/secret in env
        client_id = os.getenv("OUTLOOK_CLIENT_ID")
        client_secret = os.getenv("OUTLOOK_CLIENT_SECRET")
        
        if not client_id or not token_data.get('refresh_token'):
            return token_data
            
        token_url = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
        data = {
            'client_id': client_id,
            'client_secret': client_secret,
            'refresh_token': token_data['refresh_token'],
            'grant_type': 'refresh_token'
        }
        try:
            r = requests.post(token_url, data=data)
            if r.status_code == 200:
                new_token = r.json()
                # Update DB
                # We need email to update. We should change update method to take ID.
                # Since we don't have ID-based update yet, we'll skip persisting for this strict MVP step 
                # or fix AuthManager. 
                # Let's just return the new token to use in memory.
                return new_token
        except:
            pass
        return token_data

    def create_calendar_event(
        self, 
        account_id: str, 
        job_details: Dict, 
        time_iso: str,
        duration_minutes: int = 30,
        attendees: Optional[List[str]] = None,
        reminders: Optional[Dict] = None,
        color_id: Optional[str] = None,
        transparency: str = 'opaque',
        add_google_meet: bool = False
    ):
        account = auth_manager.get_account(account_id)
        if not account:
            raise ValueError("Account not found")
        
        provider = account['provider']
        token_data = account['token_data']
        
        title = f"Follow up: {job_details.get('title', 'Job Application')}"
        description = f"Follow up on application for {job_details.get('title')} at {job_details.get('company', 'Unknown Company')}.\nLink: {job_details.get('job_url_direct') or job_details.get('job_url')}"
        if job_details.get('description'):
             description += f"\n\nDetails:\n{job_details.get('description')[:500]}..."

        # Parse time
        try:
            start_dt = datetime.datetime.fromisoformat(time_iso.replace('Z', '+00:00'))
        except:
            start_dt = datetime.datetime.now() + datetime.timedelta(hours=24) # Fallback
            
        end_dt = start_dt + datetime.timedelta(minutes=duration_minutes)
        
        if provider == 'google':
            creds = self._get_google_creds(token_data)
            service = build('calendar', 'v3', credentials=creds)
            
            event = {
                'summary': title,
                'description': description,
                'start': {'dateTime': start_dt.isoformat(), 'timeZone': 'UTC'},
                'end': {'dateTime': end_dt.isoformat(), 'timeZone': 'UTC'},
                'transparency': transparency, # 'opaque' (Busy) or 'transparent' (Free)
            }

            if attendees:
                event['attendees'] = [{'email': email} for email in attendees]
            
            if reminders:
                event['reminders'] = reminders
            
            if color_id and color_id != 'default':
                event['colorId'] = color_id

            if add_google_meet:
                event['conferenceData'] = {
                    'createRequest': {
                        'requestId': f"{uuid.uuid4()}",
                        'conferenceSolutionKey': {'type': 'hangoutsMeet'}
                    }
                }
            
            # conferenceDataVersion=1 is required to create a meeting
            created_event = service.events().insert(
                calendarId='primary', 
                body=event, 
                conferenceDataVersion=1 if add_google_meet else 0
            ).execute()
            
            return {"status": "success", "link": created_event.get('htmlLink'), "meetLink": created_event.get('hangoutLink')}
            
        elif provider == 'outlook':
            # Basic Outlook support (Customizations partly supported)
            
            access_token = token_data.get('access_token')
            url = "https://graph.microsoft.com/v1.0/me/events"
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }
            
            payload = {
                "subject": title,
                "body": {
                    "contentType": "HTML",
                    "content": description
                },
                "start": {
                    "dateTime": start_dt.isoformat(),
                    "timeZone": "UTC"
                },
                "end": {
                    "dateTime": end_dt.isoformat(),
                    "timeZone": "UTC"
                },
                "showAs": "free" if transparency == 'transparent' else "busy"
            }
            
            if attendees:
                payload["attendees"] = [
                     {"emailAddress": {"address": email}, "type": "required"} for email in attendees
                ]

            # Reminders in Outlook are just "reminderMinutesBeforeStart" (int)
            # We try to parse our overrides if possible, or just default
            if reminders and reminders.get('overrides'):
                # Take the first override's minutes
                mins = reminders['overrides'][0].get('minutes', 15)
                payload["isReminderOn"] = True
                payload["reminderMinutesBeforeStart"] = mins
            elif reminders and reminders.get('useDefault') is False:
                 payload["isReminderOn"] = False 

            r = requests.post(url, headers=headers, json=payload)
            if r.status_code not in [200, 201]:
                raise Exception(f"Outlook Error: {r.text}")
                
            return {"status": "success"}
            
        else:
             raise ValueError(f"Unknown provider {provider}")

    def send_email_reminder(self, account_id: str, job_details: Dict):
        """Sends an email to SELF as a reminder"""
        account = auth_manager.get_account(account_id)
        if not account:
             raise ValueError("Account not found")
             
        provider = account['provider']
        email_address = account['email'] # Send to self
        token_data = account['token_data']
        
        subject = f"Reminder: {job_details.get('title')}"
        body_text = f"Don't forget to check on this job:\n\n{job_details.get('title')} at {job_details.get('company')}\n\nLink: {job_details.get('job_url')}"
        
        if provider == 'google':
            creds = self._get_google_creds(token_data)
            service = build('gmail', 'v1', credentials=creds)
            
            # Create message
            from email.mime.text import MIMEText
            import base64
            
            message = MIMEText(body_text)
            message['to'] = email_address
            message['subject'] = subject
            raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
            
            service.users().messages().send(userId='me', body={'raw': raw}).execute()
            return {"status": "sent"}
            
        elif provider == 'outlook':
            access_token = token_data.get('access_token')
            url = "https://graph.microsoft.com/v1.0/me/sendMail"
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }
            
            payload = {
                "message": {
                    "subject": subject,
                    "body": {
                        "contentType": "Text",
                        "content": body_text
                    },
                    "toRecipients": [
                        {
                            "emailAddress": {
                                "address": email_address
                            }
                        }
                    ]
                },
                "saveToSentItems": "true"
            }
            
            r = requests.post(url, headers=headers, json=payload)
            if r.status_code not in [200, 202]:
                 raise Exception(f"Outlook Error: {r.text}")
            
            return {"status": "sent"}

        raise ValueError("Unknown provider")


    def create_google_task(self, account_id: str, job_details: Dict, due_date_iso: Optional[str] = None):
        account = auth_manager.get_account(account_id)
        if not account:
            raise ValueError("Account not found")
        
        provider = account['provider']
        if provider != 'google':
             raise ValueError("Tasks only supported for Google accounts")
             
        token_data = account['token_data']
        creds = self._get_google_creds(token_data)
        service = build('tasks', 'v1', credentials=creds)
        
        title = f"Apply: {job_details.get('title', 'Job Application')}"
        notes = f"Company: {job_details.get('company')}\nLocation: {job_details.get('location', 'Unknown')}\n\nLink: {job_details.get('job_url')}\n\nDescription:\n{job_details.get('description', '')[:500]}..."

        task_body = {
            'title': title,
            'notes': notes,
            'status': 'needsAction'
        }
        
        if due_date_iso:
             # Google Tasks API expects RFC 3339 timestamp string for 'due'
             # Note: Tasks 'due' is date-only in some contexts, but API accepts ISO string.
             # Ideally it should be T00:00:00Z format for purely date-based, strictly speaking.
             # But complete ISO usually works. 
             task_body['due'] = due_date_iso

        result = service.tasks().insert(tasklist='@default', body=task_body).execute()
        return {"status": "success", "id": result.get('id'), "link": result.get('selfLink')}
