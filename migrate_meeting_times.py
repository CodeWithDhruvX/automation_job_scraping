"""
Migration script to extract meeting times for existing ICS invites.
This will update all invites that were detected via ICS_ATTACHMENT but don't have meeting_time.
"""
import sys
import os

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from core.invite_manager import InviteManager
from connectors.gmail_connector import GmailConnector

def migrate_meeting_times():
    """Re-extract meeting times for existing ICS invites."""
    print("Starting migration to extract meeting times...")
    
    manager = InviteManager()
    connector = GmailConnector()
    
    # Authenticate with Gmail
    print("Authenticating with Gmail...")
    connector.authenticate()
    
    if not connector.service_gmail:
        print("ERROR: Gmail service not initialized")
        return
    
    invites = manager.get_all_invites()
    updated_count = 0
    
    print(f"Total invites found: {len(invites)}")
    
    for i, invite in enumerate(invites, 1):
        print(f"\\n[{i}/{len(invites)}] Checking invite: {invite['subject'][:50]}")
        print(f"  ID: {invite['id']}")
        print(f"  Detection method: {invite.get('detection_method', 'NOT SET')}")
        print(f"  Has meeting_time: {bool(invite.get('meeting_time'))}")
        
        # Skip if meeting_time already exists
        if invite.get('meeting_time'):
            print(f"  -> SKIP: already has meeting_time = {invite['meeting_time']}")
            continue
        
        # Only process ICS attachments
        if invite.get('detection_method') != 'ICS_ATTACHMENT':
            print(f"  -> SKIP: not an ICS attachment")
            continue
        
        print(f"\\nProcessing: {invite['subject']}")
        print(f"  Email ID: {invite['id']}")
        
        try:
            # Fetch the email again
            msg = connector.service_gmail.users().messages().get(
                userId='me', 
                id=invite['email_id']
            ).execute()
            
            # Extract meeting time
            meeting_time = connector._extract_ics_meeting_time(msg['payload'], invite['email_id'])
            
            if meeting_time:
                print(f"  Found meeting time: {meeting_time}")
                invite['meeting_time'] = meeting_time
                manager.invites[invite['id']]['meeting_time'] = meeting_time
                updated_count += 1
            else:
                print(f"  WARNING: Could not extract meeting time")
                
        except Exception as e:
            print(f"  ERROR: {e}")
            import traceback
            traceback.print_exc()
    
    # Save updates
    if updated_count > 0:
        manager.save_data()
        print(f"\\n{'='*80}")
        print(f"Migration complete! Updated {updated_count} invites with meeting times.")
        print(f"{'='*80}")
    else:
        print(f"\\nNo invites needed updating.")

if __name__ == "__main__":
    migrate_meeting_times()
