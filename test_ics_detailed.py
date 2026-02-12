"""
Direct inline test to check ICS extraction.
"""
import sys
import os
import re
import datetime
import base64

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from connectors.gmail_connector import GmailConnector

def test_ics_extraction():
    """Test ICS extraction with inline code."""
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
    
    payload = msg['payload']
    
    # Check for ICS attachment
    print(f"\\nChecking for ICS attachment...")
    has_ics = connector._has_ics_attachment(payload)
    print(f"Has ICS attachment: {has_ics}")
    
    if not has_ics:
        print("No ICS attachment found!")
        return
    
    # Try to get ICS content
    print("\\nGetting ICS content...")
    ics_content = connector._get_ics_content_recursive(payload, email_id)
    
    if ics_content:
        print(f"ICS Content length: {len(ics_content)} chars")
        print(f"\\nFirst 500 chars of ICS content:")
        print(ics_content[:500])
        print("\\n" + "="*80)
        
        # Try regex directly
        print("\\nTrying regex pattern...")
        pattern = r'DTSTART(?:;[^:\\n]*)?:(\\d{8})(?:T(\\d{6})Z?)?'
        match = re.search(pattern, ics_content)
        
        if match:
            print(f"REGEX MATCH FOUND!")
            print(f"  Date part: {match.group(1)}")
            print(f"  Time part: {match.group(2)}")
            
            date_part = match.group(1)
            time_part = match.group(2)
            
            if time_part:
                dt = datetime.datetime.strptime(f"{date_part}T{time_part}", "%Y%m%dT%H%M%S")
            else:
                dt = datetime.datetime.strptime(date_part, "%Y%m%d")
            
            print(f"  Parsed datetime: {dt.isoformat()}")
        else:
            print("NO REGEX MATCH!")
            print("\\nSearching for DTSTART in content...")
            if 'DTSTART' in ics_content:
                lines = ics_content.split('\\n')
                for line in lines:
                    if 'DTSTART' in line:
                        print(f"  Found line: {line}")
            else:
                print("  DTSTART not found at all in content")
    else:
        print("NO ICS CONTENT FOUND!")

if __name__ == "__main__":
    test_ics_extraction()
