import os.path
import base64
import re
import datetime
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from email.utils import parsedate_to_datetime
import traceback

# If modifying these scopes, delete the file token.json.
SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/calendar.events'
]

class GmailConnector:
    def __init__(self, credentials_file='google_client_secrets.json', token_file='token.json'):
        self.credentials_file = credentials_file
        self.token_file = token_file
        self.creds = None
        self.service_gmail = None
        self.service_calendar = None
        self._cancel_scan = False

    def cancel_scan(self):
        """Sets the cancel flag to stop scanning."""
        self._cancel_scan = True

    def authenticate(self):
        """Authenticates with Google APIs."""
        if os.path.exists(self.token_file):
            self.creds = Credentials.from_authorized_user_file(self.token_file, SCOPES)
        
        if not self.creds or not self.creds.valid:
            if self.creds and self.creds.expired and self.creds.refresh_token:
                self.creds.refresh(Request())
            else:
                flow = InstalledAppFlow.from_client_secrets_file(
                    self.credentials_file, SCOPES)
                self.creds = flow.run_local_server(port=0)
            
            with open(self.token_file, 'w') as token:
                token.write(self.creds.to_json())

        try:
            self.service_gmail = build('gmail', 'v1', credentials=self.creds)
            self.service_calendar = build('calendar', 'v3', credentials=self.creds)
        except HttpError as err:
            print(f"An error occurred during API build: {err}")

    def scan_emails(self, days=1):
        """Scans emails for meeting links using 3-Layer Detection."""
        self._cancel_scan = False
        self.authenticate()
        if not self.service_gmail:
            print("Gmail service not initialized.")
            return []

        invites = []
        
        date_query = (datetime.datetime.now() - datetime.timedelta(days=days)).strftime("%Y/%m/%d")
        query = f'after:{date_query}'

        try:
            results = self.service_gmail.users().messages().list(userId='me', q=query).execute()
            messages = results.get('messages', [])

            print(f"Scanning {len(messages)} emails...")

            for message in messages:
                if self._cancel_scan:
                    print("Scan cancelled by user.")
                    break

                msg = self.service_gmail.users().messages().get(userId='me', id=message['id']).execute()
                
                # Metadata
                headers = msg['payload']['headers']
                subject = next((h['value'] for h in headers if h['name'] == 'Subject'), 'No Subject')
                sender = next((h['value'] for h in headers if h['name'] == 'From'), 'Unknown Sender')
                date_str = next((h['value'] for h in headers if h['name'] == 'Date'), '')
                try:
                    detection_timestamp = parsedate_to_datetime(date_str).isoformat()
                except:
                    detection_timestamp = datetime.datetime.now().isoformat()
                
                email_url = f"https://mail.google.com/mail/u/0/#all/{message['threadId']}"

                # --- LAYER 1: ICS Attachment Detection ---
                if self._has_ics_attachment(msg['payload']):
                    print(f"FOUND (Layer 1 - ICS): {subject}")
                    # For ICS, we might not have a direct "link" to click, but the email itself is the invite.
                    # We try to extract a link anyway for the UI, or just link to the email.
                    body = self._get_email_body(msg['payload'])
                    extracted_link = self._extract_best_link(body)
                    
                    invites.append({
                        'id': message['id'],
                        'email_id': message['id'],
                        'thread_id': message['threadId'],
                        'subject': subject,
                        'sender': sender,
                        'email_url': email_url,
                        'meeting_link': extracted_link or email_url, # Fallback to email URL if no specific link
                        'detection_timestamp': detection_timestamp,
                        'status': 'PENDING',
                        'detection_method': 'ICS_ATTACHMENT'
                    })
                    continue # Confirmed invite, move to next email

                # --- LAYER 2 & 3: Link Analysis ---
                body = self._get_email_body(msg['payload'])
                valid_link = self._extract_best_link(body)

                if valid_link:
                    print(f"FOUND (Layer 2/3 - Link): {subject}")
                    invites.append({
                        'id': message['id'],
                        'email_id': message['id'],
                        'thread_id': message['threadId'],
                        'subject': subject,
                        'sender': sender,
                        'email_url': email_url,
                        'meeting_link': valid_link,
                        'detection_timestamp': detection_timestamp,
                        'status': 'PENDING',
                        'detection_method': 'LINK_PATTERN'
                    })

        except HttpError as error:
            print(f"An error occurred: {error}")
            traceback.print_exc()

        return invites

    def _has_ics_attachment(self, payload):
        """Layer 1: Checks for .ics attachments or calendar content type."""
        if payload.get('mimeType') == 'text/calendar':
            return True
        
        parts = payload.get('parts', [])
        for part in parts:
            if part.get('mimeType') == 'text/calendar':
                return True
            if part.get('filename', '').endswith('.ics'):
                return True
            if 'parts' in part:
                if self._has_ics_attachment(part):
                    return True
        return False

    def _extract_best_link(self, body):
        """Layer 2 & 3: Extracts and validates URLs."""
        # Regex to extract all http/https links
        # Simple regex to catch generic URLs
        url_pattern = r'https?://[^\s<>"]+'
        urls = re.findall(url_pattern, body)
        
        for url in urls:
            # Clean url (remove trailing punctuation often caught by regex)
            url = url.rstrip('.,;)>')
            
            # Layer 2: Whitelist
            if self._is_whitelisted(url):
                return url
            
            # Layer 3: Fallback Path Logic
            if self._is_fallback_match(url):
                return url
                
        return None

    def _is_whitelisted(self, url):
        """Checks if URL matches known meeting domains."""
        whitelist = [
            'meet.google.com', 'zoom.us', 'teams.microsoft.com', 'calendly.com',
            'webex.com', 'gotomeeting.com', 'whereby.com', 'ringcentral.com',
            'bluejeans.com', 'meet.jit.si'
        ]
        
        for domain in whitelist:
            if f"://{domain}" in url or f".{domain}" in url:
                return True
        return False

    def _is_fallback_match(self, url):
        """Checks for meeting keywords in path (Fallback)."""
        keywords = ['/meet', '/j/', '/join', '/meeting', '/meetup-join', '/vc/']
        
        # Condition 1: Length > 30 (heuristic from user)
        if len(url) <= 30:
            return False
            
        # Condition 2: Contains path keywords
        has_keyword = any(k in url for k in keywords)
        
        # Condition 3: Contains digits (token-like)
        has_digits = any(c.isdigit() for c in url)
        
        return has_keyword and has_digits

    def _get_email_body(self, payload):
        """Recursively extracts email body from payload."""
        body = ""
        if 'parts' in payload:
            for part in payload['parts']:
                if part['mimeType'] == 'text/plain':
                    data = part['body'].get('data')
                    if data:
                        body += base64.urlsafe_b64decode(data).decode()
                elif part['mimeType'] == 'text/html':
                    data = part['body'].get('data')
                    if data:
                        body += " " + base64.urlsafe_b64decode(data).decode()
                elif 'parts' in part:
                    body += self._get_email_body(part)
        else:
             data = payload['body'].get('data')
             if data:
                 body += base64.urlsafe_b64decode(data).decode()
        return body

    def _extract_meeting_link(self, text):
        """Deprecated: Replaced by _extract_best_link."""
        return self._extract_best_link(text)

    def add_to_calendar(self, invite_details, duration_minutes=30):
        """Adds an event to Google Calendar."""
        self.authenticate()
        if not self.service_calendar:
             return {"error": "Calendar service not initialized"}

        try:
            start_time = datetime.datetime.now() + datetime.timedelta(hours=1)
            end_time = start_time + datetime.timedelta(minutes=duration_minutes)
            
            description = f"Meeting Link: {invite_details.get('meeting_link')}\n\nFrom Email: {invite_details.get('email_url')}\n\nDetected via: {invite_details.get('detection_method', 'Unknown')}"

            event = {
                'summary': f"Meeting: {invite_details.get('subject')}",
                'location': invite_details.get('meeting_link'),
                'description': description,
                'start': {
                    'dateTime': start_time.isoformat(),
                    'timeZone': 'UTC',
                },
                'end': {
                    'dateTime': end_time.isoformat(),
                    'timeZone': 'UTC',
                },
            }

            event = self.service_calendar.events().insert(calendarId='primary', body=event).execute()
            return {"status": "created", "eventLink": event.get('htmlLink')}

        except HttpError as error:
            print(f"An error occurred: {error}")
            return {"error": str(error)}
