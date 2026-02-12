import requests
import json

try:
    r = requests.get('http://localhost:8000/api/invites')
    invites = r.json()
    
    print(f"Total invites: {len(invites)}\n")
    
    for inv in invites[:5]:
        subject = inv['subject'][:60]
        meeting_time = inv.get('meeting_time', 'NOT SET')
        print(f"- {subject}")
        print(f"  meeting_time: {meeting_time}\n")
except Exception as e:
    print(f"Error: {e}")
