"""
Save ICS content to a file for examination.
"""
import sys
import os

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from connectors.gmail_connector import GmailConnector

email_id = "19c50b2b9cf7d24f"  # Video Interview - Freespace (the one with correct date)

connector = GmailConnector()
connector.authenticate()

if connector.service_gmail:
    msg = connector.service_gmail.users().messages().get(
        userId='me', 
        id=email_id
    ).execute()
    
    ics_content = connector._get_ics_content_recursive(msg['payload'], email_id)
    
    if ics_content:
        with open('sample_ics.txt', 'w', encoding='utf-8') as f:
            f.write(ics_content)
        print(f"Saved ICS content ({len(ics_content)} chars) to sample_ics.txt")
    else:
        print("No ICS content found")
else:
    print("Gmail service not initialized")
