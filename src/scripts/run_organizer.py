import argparse
import os
import sys
import json
from datetime import datetime

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from src.connectors.gmail_connector import GmailConnector

def main():
    parser = argparse.ArgumentParser(description="Run Gmail Intelligent Organizer")
    parser.add_argument("--days", type=int, default=3, help="Number of days to scan (default: 3)")
    parser.add_argument("--dry-run", action="store_true", help="Run without modifying Gmail labels")
    parser.add_argument("--start-date", type=str, help="Start date (YYYY-MM-DD)")
    parser.add_argument("--end-date", type=str, help="End date (YYYY-MM-DD)")
    
    args = parser.parse_args()
    
    print(f"Starting Gmail Organizer (Dry Run: {args.dry_run})")
    
    connector = GmailConnector(
        credentials_file='google_client_secrets.json', 
        tokens_dir='tokens',
        dry_run=args.dry_run
    )
    
    # 1. Check Accounts
    accounts = connector.get_accounts()
    print(f"Found {len(accounts)} connected accounts: {accounts}")
    
    if not accounts:
        print("No accounts connected. Please run server or connect manually.")
        return

    # 2. Run Scan
    stats = {
        "total_scanned": 0,
        "recruiters_found": 0,
        "invites_found": 0
    }
    
    results = connector.scan_emails(
        days=args.days,
        start_date=args.start_date,
        end_date=args.end_date
    )
    
    # 3. Analyze Results
    print("\n--- Summary ---")
    for item in results:
        status = item.get('status')
        subject = item.get('subject')
        email = item.get('account_email')
        
        if item.get('detection_method') == 'RECRUITER_RULE':
            stats['recruiters_found'] += 1
            print(f"[RECRUITER] {email}: {subject}")
            print(f"   -> Source: {item.get('source')}, Company: {item.get('company')}, Priority: {item.get('priority')}")
            print(f"   -> Reasons: {item.get('reasons')}")
            
        elif item.get('detection_method') in ['ICS_ATTACHMENT', 'LINK_PATTERN']:
            stats['invites_found'] += 1
            print(f"[INVITE] {email}: {subject} ({item.get('meeting_link')})")
            
    print("\n--- Stats ---")
    print(f"Total Items Found: {len(results)}")
    print(f"Recruiters Identified: {stats['recruiters_found']}")
    print(f"Invites Found: {stats['invites_found']}")
    
    if args.dry_run:
        print("\n[NOTE] This was a DRY RUN. No labels were applied.")

if __name__ == "__main__":
    main()
