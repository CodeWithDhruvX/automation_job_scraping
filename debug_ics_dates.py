"""
Debug script to examine ICS content and find why dates are being extracted incorrectly.
"""
import sys
import os
import re
import datetime

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from connectors.gmail_connector import GmailConnector

# Email IDs from the data
email_ids = [
    ("19c51e7fa200268e", "L1 - Dhruv Shah"),  # Expected: Feb 13, 2026 3pm
    ("19c50d04b23c4f06", "Encora Interview"),  # Expected: Today 6pm
    ("19c515b13b387f30", "Interview canceled"),  # Expected: Feb 12, 5pm
]

def debug_ics(email_id, subject):
    print(f"\n{'='*80}")
    print(f"Email: {subject}")
    print(f"ID: {email_id}")
    print('='*80)
    
    connector = GmailConnector()
    connector.authenticate()
    
    if not connector.service_gmail:
        print("ERROR: Gmail service not initialized")
        return
    
    # Fetch email
    msg = connector.service_gmail.users().messages().get(
        userId='me', 
        id=email_id
    ).execute()
    
    # Get ICS content
    ics_content = connector._get_ics_content_recursive(msg['payload'], email_id)
    
    if not ics_content:
        print("NO ICS CONTENT FOUND")
        return
    
    print(f"\nICS Content length: {len(ics_content)} chars")
    
    # Find all lines with DTSTART
    lines = ics_content.split('\n')
    print("\nAll DTSTART lines:")
    for i, line in enumerate(lines):
        if 'DTSTART' in line:
            print(f"  Line {i}: {line.strip()}")
    
    # Test current regex
    print("\n--- Testing Current Regex ---")
    pattern = r'DTSTART(?:;[^:\n]*)?:(\d{8})(?:T(\d{6})Z?)?'
    matches = re.finditer(pattern, ics_content)
    
    for i, match in enumerate(matches, 1):
        date_part = match.group(1)
        time_part = match.group(2)
        print(f"\nMatch {i}:")
        print(f"  Date: {date_part}")
        print(f"  Time: {time_part}")
        print(f"  Full match: {match.group(0)}")
        
        # Try to parse
        try:
            if time_part:
                dt = datetime.datetime.strptime(f"{date_part}T{time_part}", "%Y%m%dT%H%M%S")
            else:
                dt = datetime.datetime.strptime(date_part, "%Y%m%d")
            print(f"  Parsed: {dt.isoformat()}")
        except Exception as e:
            print(f"  Parse error: {e}")

if __name__ == "__main__":
    for email_id, subject in email_ids[:2]:  # Debug first 2 emails
        debug_ics(email_id, subject)
