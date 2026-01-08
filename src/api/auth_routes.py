from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import RedirectResponse
import os
import json
from src.services.auth_manager import AuthManager
from google_auth_oauthlib.flow import Flow
from O365 import Account, FileSystemTokenBackend

router = APIRouter(prefix="/api/auth", tags=["auth"])
auth_manager = AuthManager()

# --- Google Config ---
# Scopes for Calendar and Gmail
GOOGLE_SCOPES = [
    'https://www.googleapis.com/auth/calendar.events', 
    'https://www.googleapis.com/auth/gmail.compose',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/tasks',
    'openid'
]
# Expects 'web' or 'installed' client secret config. 
# We'll try to load from 'google_client_secrets.json' or construct from ENV.
GOOGLE_SECRETS_FILE = "google_client_secrets.json"

# --- Outlook Config ---
OUTLOOK_SCOPES = ['User.Read', 'Mail.Send', 'Calendars.ReadWrite']

@router.get("/accounts")
def list_accounts():
    return auth_manager.list_accounts()

@router.delete("/disconnect/{account_id}")
def disconnect_account(account_id: str):
    success = auth_manager.delete_account(account_id)
    if not success:
        raise HTTPException(404, "Account not found")
    return {"status": "ok", "message": "Account disconnected"}

# --- Google Endpoints ---

@router.get("/google/login")
def google_login(request: Request):
    """Initiates Google OAuth Flow"""
    # Try to locate secrets file
    base_path = os.path.dirname(os.path.dirname(os.path.dirname(__file__))) # Root
    secrets_path = os.path.join(base_path, GOOGLE_SECRETS_FILE)
    
    # If file doesn't exist, try to construct from ENV (Advanced, skip for now or assume file)
    if not os.path.exists(secrets_path):
        raise HTTPException(500, detail=f"Google secrets file not found at {secrets_path}")

    # Create flow
    flow = Flow.from_client_secrets_file(
        secrets_path,
        scopes=GOOGLE_SCOPES,
        redirect_uri=str(request.base_url).rstrip('/') + "/api/auth/google/callback"
    )
    
    auth_url, state = flow.authorization_url(access_type='offline', include_granted_scopes='true')
    
    # In a real app, store state in session to validate callback. skipping for MVP.
    return {"url": auth_url}

@router.get("/google/callback")
def google_callback(request: Request, code: str):
    base_path = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    secrets_path = os.path.join(base_path, GOOGLE_SECRETS_FILE)
    
    flow = Flow.from_client_secrets_file(
        secrets_path,
        scopes=GOOGLE_SCOPES,
        redirect_uri=str(request.base_url).rstrip('/') + "/api/auth/google/callback"
    )
    
    try:
        flow.fetch_token(code=code)
    except Exception as e:
        raise HTTPException(400, detail=f"Failed to fetch token: {str(e)}")
    
    creds = flow.credentials
    
    # Get user email to identify account
    # We need to make a request to userinfo. 
    # Using google-api-python-client is heavy just for this, so just use requests
    import requests
    user_info = requests.get(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        headers={'Authorization': f'Bearer {creds.token}'}
    ).json()
    
    email = user_info.get('email')
    if not email:
        raise HTTPException(400, detail="Could not retrieve email address")

    # Serialize credentials
    token_data = {
        'token': creds.token,
        'refresh_token': creds.refresh_token,
        'token_uri': creds.token_uri,
        'client_id': creds.client_id,
        'client_secret': creds.client_secret,
        'scopes': creds.scopes
    }
    
    auth_manager.add_or_update_account("google", email, token_data)
    
    # Redirect back to frontend settings (assuming port 5173 for dev)
    return RedirectResponse("http://localhost:5173/settings?status=success&provider=google")


# --- Outlook Endpoints ---

@router.get("/outlook/login")
def outlook_login(request: Request):
    client_id = os.getenv("OUTLOOK_CLIENT_ID")
    client_secret = os.getenv("OUTLOOK_CLIENT_SECRET")
    
    if not client_id or not client_secret:
         raise HTTPException(500, detail="Outlook client_id or client_secret not found in env")

    credentials = (client_id, client_secret)
    # Redirect URI
    redirect_uri = str(request.base_url).rstrip('/') + "/api/auth/outlook/callback"
    
    # We use O365 library to generate url
    account = Account(credentials)
    
    # This URL generation might print to console, we need the URL string.
    # The library is designed for console apps mostly but supports web.
    # account.connection.get_authorization_url(...)
    
    url, state = account.connection.get_authorization_url(
        requested_scopes=OUTLOOK_SCOPES,
        redirect_uri=redirect_uri
    )
    
    return {"url": url}

@router.get("/outlook/callback")
def outlook_callback(request: Request, code: str):
    client_id = os.getenv("OUTLOOK_CLIENT_ID")
    client_secret = os.getenv("OUTLOOK_CLIENT_SECRET")
    if not client_id or not client_secret:
         raise HTTPException(500, detail="Config missing")

    credentials = (client_id, client_secret)
    redirect_uri = str(request.base_url).rstrip('/') + "/api/auth/outlook/callback"
    
    # We need to create a temporary backend or manual token exchange
    # The O365 lib tries to save to file by default. 
    # We can use a request-token-backend or just handle raw.
    
    # Manual token exchange using requests is often easier than fighting the lib's file persistence
    # But let's try to use the lib
    
    import requests
    
    # Exchange code for token
    token_url = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
    data = {
        'client_id': client_id,
        'client_secret': client_secret,
        'code': code,
        'redirect_uri': redirect_uri,
        'grant_type': 'authorization_code'
    }
    
    r = requests.post(token_url, data=data)
    if r.status_code != 200:
        raise HTTPException(400, detail=f"Token exchange failed: {r.text}")
        
    token_response = r.json()
    
    # Get user email
    # Use the token to query Graph API
    access_token = token_response.get('access_token')
    
    graph_res = requests.get(
        'https://graph.microsoft.com/v1.0/me',
        headers={'Authorization': f'Bearer {access_token}'}
    )
    if graph_res.status_code != 200:
         raise HTTPException(400, detail="Could not get user profile")
         
    user_data = graph_res.json()
    email = user_data.get('mail') or user_data.get('userPrincipalName')
    
    # Save full token response
    auth_manager.add_or_update_account("outlook", email, token_response)
    
    return RedirectResponse("http://localhost:5173/settings?status=success&provider=outlook")
