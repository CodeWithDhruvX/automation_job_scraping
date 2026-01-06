import json
import os
from typing import List, Dict, Optional, Any
import uuid

DATA_DIR = os.path.join(os.path.dirname(__file__), '../../data')
TOKENS_FILE = os.path.join(DATA_DIR, 'auth_tokens.json')

class AuthManager:
    """
    Manages storage and retrieval of OAuth tokens for multiple accounts.
    Stores data in data/auth_tokens.json.
    """
    def __init__(self):
        self._ensure_data_dir()
        self.tokens = self._load_tokens()

    def _ensure_data_dir(self):
        os.makedirs(DATA_DIR, exist_ok=True)
        if not os.path.exists(TOKENS_FILE):
             with open(TOKENS_FILE, 'w') as f:
                 json.dump({"accounts": []}, f)

    def _load_tokens(self) -> Dict[str, Any]:
        try:
            with open(TOKENS_FILE, 'r') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return {"accounts": []}

    def _save_tokens(self):
        with open(TOKENS_FILE, 'w') as f:
            json.dump(self.tokens, f, indent=2)

    def add_or_update_account(self, provider: str, email: str, token_data: Dict) -> str:
        """
        Adds a new account or updates an existing one (keyed by provider + email).
        Returns the account ID.
        """
        # Check if exists
        for acc in self.tokens["accounts"]:
            if acc["provider"] == provider and acc["email"] == email:
                acc["token_data"] = token_data
                self._save_tokens()
                return acc["id"]
        
        # Create new
        new_id = str(uuid.uuid4())
        self.tokens["accounts"].append({
            "id": new_id,
            "provider": provider,
            "email": email,
            "token_data": token_data
        })
        self._save_tokens()
        return new_id

    def get_account(self, account_id: str) -> Optional[Dict]:
        """Returns the full account dict including tokens."""
        for acc in self.tokens["accounts"]:
            if acc["id"] == account_id:
                return acc
        return None

    def list_accounts(self) -> List[Dict]:
        """Returns public info (id, provider, email) for all accounts."""
        return [{
            "id": acc["id"],
            "provider": acc["provider"],
            "email": acc["email"]
        } for acc in self.tokens["accounts"]]

    def delete_account(self, account_id: str) -> bool:
        """Removes an account by ID."""
        initial_len = len(self.tokens["accounts"])
        self.tokens["accounts"] = [acc for acc in self.tokens["accounts"] if acc["id"] != account_id]
        if len(self.tokens["accounts"]) < initial_len:
            self._save_tokens()
            return True
        return False
