"""
Debug script to inspect the email payload structure.
"""
import sys
import os
import json

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from connectors.gmail_connector import GmailConnector

def inspect_payload(payload, indent=0):
    """Recursively inspect payload structure."""
    prefix = "  " * indent
    mime_type = payload.get('mimeType', 'NO MIME TYPE')
    filename = payload.get('filename', '')
    
    print(f"{prefix}[Part] mimeType: {mime_type}")
    if filename:
        print(f"{prefix}  filename: {filename}")
    
    body = payload.get('body', {})
    if body.get('data'):
        print(f"{prefix}  has inline data: YES (size: {body.get('size', 0)} bytes)")
    elif body.get('attachmentId'):
        print(f"{prefix}  has attachmentId: {body['attachmentId']}")
    
    if 'parts' in payload:
        print(f"{prefix}  has {len(payload['parts'])} sub-parts:")
        for i, part in enumerate(payload['parts']):
            inspect_payload(part, indent + 1)

def debug_email_structure():
    """Debug the email structure."""
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
    
    print("\\n" + "="*80)
    print("EMAIL PAYLOAD STRUCTURE")
    print("="*80)
    inspect_payload(payload)
    print("="*80)

if __name__ == "__main__":
    debug_email_structure()
