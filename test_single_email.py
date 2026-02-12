"""
Simple test to check if we can extract meeting time from one specific email.
"""
import sys
import os

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from connectors.gmail_connector import GmailConnector

def test_single_email():
    """Test extraction on a single email."""
    email_id = "19c51e7fa200268e"  # L1 - Dhruv Shah - Java Full Stack Developer - FPG
    
    connector = GmailConnector()
    connector.authenticate()
    
    if not connector.service_gmail:
        print("ERROR: Gmail service not initialized")
        return
    
    print(f"Fetching email {email_id}...")
    msg = connector.service_gmail.users().messages().get(
        userId='me', 
        id=email_id
    ).execute()
    
    print("\\nExtracting meeting time...")
    meeting_time = connector._extract_ics_meeting_time(msg['payload'])
    
    print(f"\\nResult: {meeting_time}")

if __name__ == "__main__":
    test_single_email()
