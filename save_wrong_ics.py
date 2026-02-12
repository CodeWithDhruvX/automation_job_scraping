"""
Save ICS content from the email with wrong date.
"""
import sys
import os

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from connectors.gmail_connector import GmailConnector

email_id = "19c51e7fa200268e"  # L1 - Dhruv Shah (has wrong date: 1601-01-01)

connector = GmailConnector()
connector.authenticate()

if connector.service_gmail:
    msg = connector.service_gmail.users().messages().get(
        userId='me', 
        id=email_id
    ).execute()
    
    ics_content = connector._get_ics_content_recursive(msg['payload'], email_id)
    
    if ics_content:
        with open('wrong_date_ics.txt', 'w', encoding='utf-8') as f:
            f.write(ics_content)
        print(f"Saved ICS content ({len(ics_content)} chars) to wrong_date_ics.txt")
        
        # Show DTSTART lines
        print("\nDTSTART lines:")
        for line in ics_content.split('\n'):
            if 'DTSTART' in line:
                print(f"  {line.strip()}")
    else:
        print("No ICS content found")
else:
    print("Gmail service not initialized")
