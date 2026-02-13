import os.path
import base64
import re
import datetime
import glob
import time
import traceback
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from email.utils import parsedate_to_datetime

# If modifying these scopes, delete the token files.
SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/calendar.events'
]

class GmailConnector:
    def __init__(self, credentials_file='google_client_secrets.json', tokens_dir='tokens'):
        self.credentials_file = credentials_file
        self.tokens_dir = tokens_dir
        self.creds = None
        self._cancel_scan = False
        
        # Ensure tokens directory exists
        if not os.path.exists(self.tokens_dir):
            os.makedirs(self.tokens_dir)
            
        # Migration: Check for legacy token.json
        if os.path.exists('token.json'):
            # Only migrate if tokens dir is empty to avoid duplicates or overwrites on restart
            if not os.listdir(self.tokens_dir):
                self._migrate_legacy_token()
            else:
                # If tokens exist, maybe rename/archive legacy token so we don't check it again?
                # Or just ignore it.
                pass

    def _migrate_legacy_token(self):
        """Migrates the legacy token.json to the new tokens directory structure."""
        try:
            print("Migrating legacy token.json...")
            # Use SCOPES variable which no longer has userinfo.email, so it matches legacy token
            creds = Credentials.from_authorized_user_file('token.json', SCOPES)
            
            if creds.valid or (creds.expired and creds.refresh_token):
                if creds.expired:
                    try:
                        creds.refresh(Request())
                    except Exception as e:
                        print(f"Failed to refresh legacy token: {e}")
                        return

                # Get email to name the file
                try:
                    service = build('gmail', 'v1', credentials=creds)
                    profile = service.users().getProfile(userId='me').execute()
                    email = profile['emailAddress']
                    
                    new_path = os.path.join(self.tokens_dir, f"{email}.json")
                    with open(new_path, 'w') as f:
                        f.write(creds.to_json())
                    
                    print(f"Migrated token.json to {new_path}")
                    # Rename legacy token to avoid re-migration attempts
                    os.rename('token.json', 'token.json.bak')
                except Exception as e:
                    print(f"Error fetching profile for migration: {e}")

        except Exception as e:
            print(f"Error migrating token.json: {e}")

    def cancel_scan(self):
        """Sets the cancel flag to stop scanning."""
        self._cancel_scan = True

    def get_accounts(self):
        """Returns a list of connected email addresses."""
        accounts = []
        for token_path in glob.glob(os.path.join(self.tokens_dir, '*.json')):
            filename = os.path.basename(token_path)
            email = os.path.splitext(filename)[0]
            if '@' in email: # Basic validation
                accounts.append(email)
        return accounts

    def add_new_account(self):
        """Triggers auth flow for a new account and saves the token."""
        try:
            flow = InstalledAppFlow.from_client_secrets_file(
                self.credentials_file, SCOPES)
            creds = flow.run_local_server(port=0)
            
            # Get email address to key the token
            service = build('gmail', 'v1', credentials=creds)
            profile = service.users().getProfile(userId='me').execute()
            email = profile['emailAddress']
            
            token_path = os.path.join(self.tokens_dir, f"{email}.json")
            with open(token_path, 'w') as token:
                token.write(creds.to_json())
                
            return {"status": "success", "email": email}
        except Exception as e:
            print(f"Error adding account: {e}")
            return {"status": "error", "message": str(e)}
            
    def remove_account(self, email):
        """Removes a connected account."""
        path = os.path.join(self.tokens_dir, f"{email}.json")
        if os.path.exists(path):
            os.remove(path)
            return True
        return False

    def _get_services(self, email):
        """Gets Gmail and Calendar services for a specific email."""
        token_path = os.path.join(self.tokens_dir, f"{email}.json")
        if not os.path.exists(token_path):
            print(f"No token found for {email}")
            return None, None
            
        try:
            creds = Credentials.from_authorized_user_file(token_path, SCOPES)
            if not creds.valid:
                if creds.expired and creds.refresh_token:
                    creds.refresh(Request())
                    with open(token_path, 'w') as token:
                        token.write(creds.to_json())
                else:
                    return None, None
                    
            service_gmail = build('gmail', 'v1', credentials=creds)
            service_calendar = build('calendar', 'v3', credentials=creds)
            return service_gmail, service_calendar
        except Exception as e:
            print(f"Error loading services for {email}: {e}")
            return None, None

    def scan_emails(self, days=1, start_date=None, end_date=None, target_accounts=None):
        """Scans emails across all or specified accounts."""
        self._cancel_scan = False
        all_invites = []
        
        accounts = self.get_accounts()
        if target_accounts:
            # target_accounts should be a list of emails
            accounts = [a for a in accounts if a in target_accounts]
            
        if not accounts:
            print("No accounts to scan.")
            return []
            
        for email in accounts:
            if self._cancel_scan:
                break
                
            print(f"--- Scanning Account: {email} ---")
            service_gmail, _ = self._get_services(email)
            
            if service_gmail:
                invites = self._scan_account_invites(service_gmail, email, days, start_date, end_date)
                all_invites.extend(invites)
            else:
                print(f"Skipping {email} (Auth failed)")
                
        return all_invites

    def _scan_account_invites(self, service_gmail, email_address, days, start_date, end_date):
        """Internal method to scan a specific account using the provided service."""
        invites = []
        
        # Determine date query
        if start_date and end_date:
            s_date = start_date.replace('-', '/')
            e_date = end_date.replace('-', '/')
            try:
                e_dt = datetime.datetime.strptime(e_date, "%Y/%m/%d")
                e_dt_plus_1 = e_dt + datetime.timedelta(days=1)
                e_date_query = e_dt_plus_1.strftime("%Y/%m/%d")
            except:
                 e_date_query = e_date

            query = f'after:{s_date} before:{e_date_query}'
        else:
            date_query = (datetime.datetime.now() - datetime.timedelta(days=days)).strftime("%Y/%m/%d")
            query = f'after:{date_query}'

        try:
            request = service_gmail.users().messages().list(userId='me', q=query, maxResults=100)
            
            while request is not None:
                if self._cancel_scan: break
                
                results = request.execute()
                messages = results.get('messages', [])
                
                if not messages: break

                print(f"[{email_address}] Processing {len(messages)} emails from list...")
                
                batch_size = 20
                for i in range(0, len(messages), batch_size):
                    if self._cancel_scan: break
                    
                    sub_batch_msgs = messages[i:i + batch_size]
                    
                    batch_results = []
                    def batch_callback(request_id, response, exception):
                        if exception:
                            print(f"Error fetching message {request_id}: {exception}")
                        else:
                            batch_results.append(response)

                    batch = service_gmail.new_batch_http_request(callback=batch_callback)
                    for message in sub_batch_msgs:
                        batch.add(service_gmail.users().messages().get(userId='me', id=message['id']))
                    batch.execute()

                    for msg in batch_results:
                        try:
                            headers = msg['payload']['headers']
                            subject = next((h['value'] for h in headers if h['name'] == 'Subject'), 'No Subject')
                            sender = next((h['value'] for h in headers if h['name'] == 'From'), 'Unknown Sender')
                            date_str = next((h['value'] for h in headers if h['name'] == 'Date'), '')
                            try:
                                detection_timestamp = parsedate_to_datetime(date_str).isoformat()
                            except:
                                detection_timestamp = datetime.datetime.now().isoformat()
                            
                            # Different base URL for threads/messages? No, generic works, handled by browser auth state
                            # However, opening multiple accounts in browser requires /u/0, /u/1 etc.
                            # We can't know which /u/X the user is logged into. 
                            # But we can provide the email in the search query maybe? 
                            # https://mail.google.com/mail/u/?authuser=user@example.com is not standard...
                            # Actually https://mail.google.com/mail/u/0/?authuser=EMAIL works!
                            email_url = f"https://mail.google.com/mail/u/0/?authuser={email_address}#all/{msg['threadId']}"

                            if self._has_ics_attachment(msg['payload']):
                                print(f"[{email_address}] FOUND (ICS): {subject}")
                                body = self._get_email_body(msg['payload'])
                                extracted_link = self._extract_best_link(body)
                                
                                invites.append({
                                    'id': msg['id'],
                                    'account_email': email_address,
                                    'email_id': msg['id'],
                                    'thread_id': msg['threadId'],
                                    'subject': subject,
                                    'sender': sender,
                                    'email_url': email_url,
                                    'meeting_link': extracted_link or email_url,
                                    'meeting_time': self._extract_ics_meeting_time(msg['payload'], msg['id'], service_gmail),
                                    'detection_timestamp': detection_timestamp,
                                    'status': 'PENDING',
                                    'detection_method': 'ICS_ATTACHMENT'
                                })
                                continue

                            body = self._get_email_body(msg['payload'])
                            valid_link = self._extract_best_link(body)

                            if valid_link:
                                print(f"[{email_address}] FOUND (Link): {subject}")
                                invites.append({
                                    'id': msg['id'],
                                    'account_email': email_address,
                                    'email_id': msg['id'],
                                    'thread_id': msg['threadId'],
                                    'subject': subject,
                                    'sender': sender,
                                    'email_url': email_url,
                                    'meeting_link': valid_link,
                                    'detection_timestamp': detection_timestamp,
                                    'status': 'PENDING',
                                    'detection_method': 'LINK_PATTERN'
                                })
                        except Exception as e:
                            print(f"Error processing message {msg.get('id', 'unknown')}: {e}")
                            traceback.print_exc()
                    
                    time.sleep(1)

                request = service_gmail.users().messages().list_next(previous_request=request, previous_response=results)

        except HttpError as error:
            print(f"An error occurred scanning {email_address}: {error}")
            traceback.print_exc()

        return invites

    def _has_ics_attachment(self, payload):
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
        url_pattern = r'https?://[^\s<>"]+'
        urls = re.findall(url_pattern, body)
        for url in urls:
            url = url.rstrip('.,;)>')
            if self._is_whitelisted(url):
                return url
            if self._is_fallback_match(url):
                return url
        return None

    def _is_whitelisted(self, url):
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
        keywords = ['/meet', '/j/', '/join', '/meeting', '/meetup-join', '/vc/']
        if len(url) <= 30: return False
        has_keyword = any(k in url for k in keywords)
        has_digits = any(c.isdigit() for c in url)
        return has_keyword and has_digits

    def _get_email_body(self, payload):
        body = ""
        if 'parts' in payload:
            for part in payload['parts']:
                if part['mimeType'] == 'text/plain':
                    data = part['body'].get('data')
                    if data: body += base64.urlsafe_b64decode(data).decode()
                elif part['mimeType'] == 'text/html':
                    data = part['body'].get('data')
                    if data: body += " " + base64.urlsafe_b64decode(data).decode()
                elif 'parts' in part:
                    body += self._get_email_body(part)
        else:
             data = payload['body'].get('data')
             if data: body += base64.urlsafe_b64decode(data).decode()
        return body

    def add_to_calendar(self, invite_details, duration_minutes=30):
        """Adds an event to the Calendar of the account that received the invite."""
        email = invite_details.get('account_email')
        
        # Fallback if no account_email (legacy data)
        if not email:
            accounts = self.get_accounts()
            if accounts:
                email = accounts[0]
            else:
                return {"error": "No accounts connected"}

        _, service_calendar = self._get_services(email)
        if not service_calendar:
             return {"error": f"Calendar service not initialized for {email}"}

        try:
            start_time = datetime.datetime.now() + datetime.timedelta(hours=1)
            end_time = start_time + datetime.timedelta(minutes=duration_minutes)
            
            description = f"Meeting Link: {invite_details.get('meeting_link')}\n\nFrom Email: {invite_details.get('email_url')}\n\nDetected via: {invite_details.get('detection_method', 'Unknown')}\n\nAccount: {email}"

            event = {
                'summary': f"Meeting: {invite_details.get('subject')}",
                'location': invite_details.get('meeting_link'),
                'description': description,
                'start': {'dateTime': start_time.isoformat(), 'timeZone': 'UTC'},
                'end': {'dateTime': end_time.isoformat(), 'timeZone': 'UTC'},
            }

            event = service_calendar.events().insert(calendarId='primary', body=event).execute()
            return {"status": "created", "eventLink": event.get('htmlLink')}

        except HttpError as error:
            print(f"An error occurred: {error}")
            return {"error": str(error)}

    def _get_ics_content_recursive(self, payload, message_id, service_gmail):
        if payload.get('mimeType') == 'text/calendar':
            body = payload.get('body', {})
            data = body.get('data')
            if data:
                try:
                    return base64.urlsafe_b64decode(data).decode()
                except Exception as e:
                    print(f"Error decoding inline ICS: {e}")
            
            attachment_id = body.get('attachmentId')
            if attachment_id and message_id and service_gmail:
                try:
                    attachment = service_gmail.users().messages().attachments().get(
                        userId='me', messageId=message_id, id=attachment_id
                    ).execute()
                    data = attachment.get('data')
                    if data:
                        return base64.urlsafe_b64decode(data).decode()
                except Exception as e:
                    print(f"Error fetching attachment: {e}")
        
        if 'parts' in payload:
            for part in payload['parts']:
                content = self._get_ics_content_recursive(part, message_id, service_gmail)
                if content:
                    return content
        return None

    def _extract_ics_meeting_time(self, payload, message_id, service_gmail):
        try:
            content = self._get_ics_content_recursive(payload, message_id, service_gmail)
            if content:
                vevent_match = re.search(r'BEGIN:VEVENT(.*?)END:VEVENT', content, re.DOTALL)
                if not vevent_match: return None
                
                vevent_content = vevent_match.group(1)
                match = re.search(r'DTSTART(?:;[^:\n]*)?:(\d{8})(?:T(\d{6})Z?)?', vevent_content)
                
                if match:
                    date_part = match.group(1)
                    time_part = match.group(2)
                    try:
                        if time_part:
                            dt = datetime.datetime.strptime(f"{date_part}T{time_part}", "%Y%m%dT%H%M%S")
                        else:
                            dt = datetime.datetime.strptime(date_part, "%Y%m%d")
                        return dt.isoformat()
                    except ValueError:
                        return None
        except Exception:
            return None
        return None
