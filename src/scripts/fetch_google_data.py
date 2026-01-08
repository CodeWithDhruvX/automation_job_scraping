import sys
import os
import datetime

# Add the project root to the python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from src.services.auth_manager import AuthManager
from src.services.reminder_service import ReminderService
from googleapiclient.discovery import build

def main():
    auth_manager = AuthManager()
    reminder_service = ReminderService()
    
    accounts = auth_manager.list_accounts()
    print(f"Found {len(accounts)} connected accounts.")

    for account in accounts:
        if account['provider'] == 'google':
            print(f"\n--- Checking account: {account['email']} ---")
            
            full_account = auth_manager.get_account(account['id'])
            token_data = full_account['token_data']
            creds = reminder_service._get_google_creds(token_data)
            
            # Fetch Tasks
            try:
                tasks_service = build('tasks', 'v1', credentials=creds)
                
                # List task lists first to find the default one or all of them
                tasklists = tasks_service.tasklists().list().execute()
                
                print("\n[Google Tasks]")
                if 'items' in tasklists:
                    for tasklist in tasklists['items']:
                        print(f"Task List: {tasklist['title']}")
                        tasks = tasks_service.tasks().list(tasklist=tasklist['id'], showCompleted=True, showHidden=True).execute()
                        
                        if 'items' in tasks:
                            for task in tasks['items']:
                                status = "[x]" if task['status'] == 'completed' else "[ ]"
                                title = task.get('title', '(No Title)')
                                due = task.get('due', '')
                                print(f"  {status} {title} (Due: {due})")
                        else:
                            print("  No tasks found.")
                else:
                    print("No task lists found.")
                    
            except Exception as e:
                print(f"Error fetching tasks: {e}")

            # Fetch Calendar Events (as Reminders equivalent)
            try:
                calendar_service = build('calendar', 'v3', credentials=creds)
                print("\n[Google Calendar Events (Upcoming 10)]")
                
                now = datetime.datetime.utcnow().isoformat() + 'Z'  # 'Z' indicates UTC time
                events_result = calendar_service.events().list(calendarId='primary', timeMin=now,
                                                    maxResults=10, singleEvents=True,
                                                    orderBy='startTime').execute()
                events = events_result.get('items', [])

                if not events:
                    print('  No upcoming events found.')
                else:
                    for event in events:
                        start = event['start'].get('dateTime', event['start'].get('date'))
                        summary = event.get('summary', '(No Title)')
                        print(f"  {start} - {summary}")

            except Exception as e:
                 print(f"Error fetching calendar events: {e}")

if __name__ == "__main__":
    main()
