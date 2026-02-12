"""
Save email payload to JSON for inspection.
"""
import sys
import os
import json

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from connectors.gmail_connector import GmailConnector

def save_payload():
    """Save payload to JSON."""
    email_id = "19c51e7fa200268e"
    
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
    
    with open('email_payload.json', 'w', encoding='utf-8') as f:
        json.dump(msg['payload'], f, indent=2)
    
    print("Saved to email_payload.json")

if __name__ == "__main__":
    save_payload()
