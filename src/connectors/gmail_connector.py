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
from src.core.recruiter_analyzer import RecruiterAnalyzer

# If modifying these scopes, delete the token files.
SCOPES = [
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/calendar.events'
]

class GmailConnector:
    def __init__(self, credentials_file='google_client_secrets.json', tokens_dir='tokens', dry_run=False):
        self.credentials_file = credentials_file
        self.tokens_dir = tokens_dir
        self.creds = None
        self._cancel_scan = False
        self.dry_run = dry_run
        
        # Ensure tokens directory exists
        if not os.path.exists(self.tokens_dir):
            os.makedirs(self.tokens_dir)
            
        # Migration: Check for legacy token.json
        if os.path.exists('token.json'):
            # Only migrate if tokens dir is empty to avoid duplicates or overwrites on restart
            if not os.listdir(self.tokens_dir):
                self._migrate_legacy_token()
            else:
                pass
        
        self.recruiter_analyzer = RecruiterAnalyzer()
        self.existing_labels = {} # Cache for labels {name: id}

    def _migrate_legacy_token(self):
        """Migrates the legacy token.json to the new tokens directory structure."""
        try:
            print("Migrating legacy token.json...")
            # Use rules that might match legacy scopes
            legacy_scopes = ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/calendar.events']
            try:
                creds = Credentials.from_authorized_user_file('token.json', legacy_scopes)
            except:
                # If loading with specific scopes fails, try generic
                creds = Credentials.from_authorized_user_file('token.json')

            if creds.valid or (creds.expired and creds.refresh_token):
                if creds.expired:
                    try:
                        creds.refresh(Request())
                    except Exception as e:
                        print(f"Failed to refresh legacy token: {e}")
                        return
                
                print("NOTE: Scopes have changed to include 'modify'. You may need to re-authenticate if you see 403 errors.")

                try:
                    service = build('gmail', 'v1', credentials=creds)
                    profile = service.users().getProfile(userId='me').execute()
                    email = profile['emailAddress']
                    
                    new_path = os.path.join(self.tokens_dir, f"{email}.json")
                    with open(new_path, 'w') as f:
                        f.write(creds.to_json())
                    
                    print(f"Migrated token.json to {new_path}")
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

    def _ensure_label(self, service_gmail, label_name):
        """Ensures a label exists, returns its ID."""
        if self.dry_run:
            return f"LABEL_ID_{label_name}"

        if label_name in self.existing_labels:
            return self.existing_labels[label_name]
            
        try:
            # Check if cached first, if not, maybe list again or just try create?
            # Listing is safer but costly. Let's assume list is done at start of scan.
            # If not in existing_labels, it probably doesn't exist.
            
            # Try to find it again in case it was missed or created elsewhere
            # Actually, to be safe, just try create and catch "already exists" if we want to be atomic,
            # but Gmail API listing is better.
            
            # Create if not exists
            print(f"Creating label: {label_name}")
            label_object = {
                'name': label_name, 
                'labelListVisibility': 'labelShow', 
                'messageListVisibility': 'show'
            }
            try:
                created_label = service_gmail.users().labels().create(userId='me', body=label_object).execute()
                self.existing_labels[created_label['name']] = created_label['id']
                return created_label['id']
            except HttpError as e:
                if e.resp.status == 409: # Already exists
                    # Fetch ID
                    results = service_gmail.users().labels().list(userId='me').execute()
                    labels = results.get('labels', [])
                    for label in labels:
                        self.existing_labels[label['name']] = label['id']
                        if label['name'].lower() == label_name.lower():
                            return label['id']
                else:
                    raise e
                    
        except Exception as e:
            print(f"Error managing label {label_name}: {e}")
            return None

    def _apply_labels(self, service_gmail, message_id, label_names):
        """Applies a list of labels to a message."""
        if not label_names: return
        
        label_ids = []
        for name in label_names:
            lid = self._ensure_label(service_gmail, name)
            if lid: label_ids.append(lid)
            
        if not label_ids: return

        if self.dry_run:
            print(f"[DRY RUN] Would remove 'UNREAD' and apply labels {label_names} to message {message_id}")
            return

        try:
            # Add labels and remove UNREAD (mark as read)
            # Wait, do we want to mark as read? Requirement says "Check unread...". 
            # Usuaully organizing means processing, so marking as read is good.
            # But let's check requirement: "Mark as read/unread" is listed as capability. "Track unread recruiter emails... if older than 3 days -> Pending Action"
            # If we organize it, maybe we should keep it unread if it requires action?
            # Requirement says: "Your inbox becomes... Automatically categorized".
            # Usually automated filing entails archiving or moving from inbox.
            # Let's just Apply Labels. User can decide if they want to archive.
            # actually, let's NOT remove UNREAD by default unless specified. 
            # But usually organized emails shouldn't clutter "Unread" if they are low priority.
            # Let's just add labels for now. 
            
            body = {
                'addLabelIds': label_ids
                # 'removeLabelIds': ['UNREAD'] 
            }
            service_gmail.users().messages().modify(userId='me', id=message_id, body=body).execute()
            print(f"Applied labels {label_names} to {message_id}")
        except Exception as e:
            print(f"Error applying labels to {message_id}: {e}")

    def scan_emails(self, days=1, start_date=None, end_date=None, target_accounts=None):
        """Scans emails across all or specified accounts."""
        self._cancel_scan = False
        all_invites = []
        
        accounts = self.get_accounts()
        if target_accounts:
            accounts = [a for a in accounts if a in target_accounts]
            
        if not accounts:
            print("No accounts to scan.")
            return []
            
        for email in accounts:
            if self._cancel_scan: break
                
            print(f"--- Scanning Account: {email} ---")
            service_gmail, _ = self._get_services(email)
            
            if service_gmail:
                # Refresh label cache for this account
                self.existing_labels = {}
                try:
                    results = service_gmail.users().labels().list(userId='me').execute()
                    for label in results.get('labels', []):
                        self.existing_labels[label['name']] = label['id']
                except:
                    pass
                    
                invites = self._scan_account_invites(service_gmail, email, days, start_date, end_date)
                all_invites.extend(invites)
            else:
                print(f"Skipping {email} (Auth failed or re-auth required)")
                
        return all_invites

    def _scan_account_invites(self, service_gmail, email_address, days, start_date, end_date):
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

                print(f"[{email_address}] Processing {len(messages)} emails...")
                
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
                            email_url = f"https://mail.google.com/mail/u/0/?authuser={email_address}#all/{msg['threadId']}"
                            body = self._get_email_body(msg['payload'])
                            
                            # 1. Recruiter Analysis & Organization
                            analysis = self.recruiter_analyzer.analyze_email(sender, subject, body)
                            
                            if analysis['is_recruiter']:
                                classification = analysis['classification']
                                labels_to_apply = []
                                
                                # Root Label
                                labels_to_apply.append("Recruiter")
                                
                                # Source Label
                                source = classification.get('source', 'Direct')
                                labels_to_apply.append(f"Recruiter/{source}")
                                
                                # Priority Label
                                priority = classification.get('priority', 'Low')
                                labels_to_apply.append(f"Priority/{priority}")
                                
                                # Company Label
                                company = classification.get('company')
                                if company and company != "Unknown":
                                    labels_to_apply.append(f"Company/{company}")
                                    
                                print(f"[{email_address}] RECRUITER DETECTED: {subject} -> {labels_to_apply}")
                                self._apply_labels(service_gmail, msg['id'], labels_to_apply)
                                
                                # Add to invites list for UI visibility as well
                                invites.append({
                                    'id': msg['id'],
                                    'account_email': email_address,
                                    'subject': subject,
                                    'sender': sender,
                                    'email_url': email_url,
                                    'meeting_link': email_url, 
                                    'detection_timestamp': datetime.datetime.now().isoformat(),
                                    'status': 'ORGANIZED',
                                    'detection_method': 'RECRUITER_RULE',
                                    'reasons': classification['reasons'],
                                    'source': source,
                                    'company': company,
                                    'priority': priority
                                })
                                continue 
                            
                            # 2. Existing Calendar/Meeting Detection
                            if self._has_ics_attachment(msg['payload']):
                                print(f"[{email_address}] FOUND (ICS): {subject}")
                                extracted_link = self._extract_best_link(body)
                                invites.append({
                                    'id': msg['id'],
                                    'account_email': email_address,
                                    'email_url': email_url,
                                    'subject': subject,
                                    'sender': sender,
                                    'meeting_link': extracted_link or email_url,
                                    'meeting_time': self._extract_ics_meeting_time(msg['payload'], msg['id'], service_gmail),
                                    'timestamp': datetime.datetime.now().isoformat(),
                                    'status': 'PENDING',
                                    'detection_method': 'ICS_ATTACHMENT'
                                })
                            
                            elif self._extract_best_link(body):
                                valid_link = self._extract_best_link(body)
                                print(f"[{email_address}] FOUND (Link): {subject}")
                                invites.append({
                                    'id': msg['id'],
                                    'account_email': email_address,
                                    'email_url': email_url,
                                    'subject': subject,
                                    'sender': sender,
                                    'meeting_link': valid_link,
                                    'timestamp': datetime.datetime.now().isoformat(),
                                    'status': 'PENDING',
                                    'detection_method': 'LINK_PATTERN'
                                })

                        except Exception as e:
                            print(f"Error processing message {msg.get('id')}: {e}")
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
        email = invite_details.get('account_email')
        if not email:
            accounts = self.get_accounts()
            email = accounts[0] if accounts else None
        
        if not email: return {"error": "No accounts"}

        _, service_calendar = self._get_services(email)
        if not service_calendar: return {"error": "Service not init"}

        try:
            start_time = datetime.datetime.now() + datetime.timedelta(hours=1)
            end_time = start_time + datetime.timedelta(minutes=duration_minutes)
            
            description = f"Meeting Link: {invite_details.get('meeting_link')}\n\nFrom: {invite_details.get('email_url')}"

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

    def _get_ics_content_recursive(self, payload, message_id, service_gmail):
        if payload.get('mimeType') == 'text/calendar':
            data = payload.get('body', {}).get('data')
            if data: return base64.urlsafe_b64decode(data).decode()
            
            att_id = payload.get('body', {}).get('attachmentId')
            if att_id and message_id and service_gmail:
                try:
                    att = service_gmail.users().messages().attachments().get(
                        userId='me', messageId=message_id, id=att_id).execute()
                    if att.get('data'): return base64.urlsafe_b64decode(att['data']).decode()
                except: pass
        
        if 'parts' in payload:
            for part in payload['parts']:
                res = self._get_ics_content_recursive(part, message_id, service_gmail)
                if res: return res
        return None
