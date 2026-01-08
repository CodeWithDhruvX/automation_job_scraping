import os
import sys
import json
import requests
from google_auth_oauthlib.flow import InstalledAppFlow

# Add project root to path so we can import src
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from src.services.auth_manager import AuthManager

GOOGLE_SCOPES = [
    'https://www.googleapis.com/auth/calendar.events', 
    'https://www.googleapis.com/auth/gmail.compose',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/tasks',
    'openid'
]

GOOGLE_SECRETS_FILE = "google_client_secrets.json"

def main():
    print("--- Manual Google Login ---")
    
    # Locate secrets file
    base_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    secrets_path = os.path.join(base_path, GOOGLE_SECRETS_FILE)
    
    if not os.path.exists(secrets_path):
        print(f"Error: {GOOGLE_SECRETS_FILE} not found at {secrets_path}")
        return

    print(f"Using secrets file: {secrets_path}")
    
    try:
        flow = InstalledAppFlow.from_client_secrets_file(
            secrets_path,
            scopes=GOOGLE_SCOPES
        )
        
        print("Launching browser for authentication...")
        creds = flow.run_local_server(port=0)
        
        print("Authentication successful!")
        
        # Get user email
        print("Fetching user info...")
        user_info = requests.get(
            'https://www.googleapis.com/oauth2/v2/userinfo',
            headers={'Authorization': f'Bearer {creds.token}'}
        ).json()
        
        email = user_info.get('email')
        if not email:
            print("Error: Could not retrieve email address from Google.")
            return
            
        print(f"Authenticated as: {email}")
        
        # Prepare token data
        token_data = {
            'token': creds.token,
            'refresh_token': creds.refresh_token,
            'token_uri': creds.token_uri,
            'client_id': creds.client_id,
            'client_secret': creds.client_secret,
            'scopes': creds.scopes
        }
        
        # Save account
        auth_manager = AuthManager()
        account_id = auth_manager.add_or_update_account("google", email, token_data)
        
        print(f"Account saved successfully! Account ID: {account_id}")
        print("You can now close this window and refresh your application settings.")
        
    except Exception as e:
        print(f"An error occurred: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
