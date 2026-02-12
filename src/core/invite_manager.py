import json
import os
import datetime
from typing import List, Dict, Optional

class InviteManager:
    def __init__(self, data_file: str = "data/invites.json"):
        self.data_file = data_file
        self.invites: Dict[str, Dict] = {}  # Key: Invite ID, Value: Invite Data
        self._load_data()

    def _load_data(self):
        """Loads invites from JSON file."""
        if os.path.exists(self.data_file):
            try:
                with open(self.data_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        for invite in data:
                            invite_id = invite.get('id')
                            if invite_id:
                                self.invites[invite_id] = invite
                    elif isinstance(data, dict):
                         self.invites = data
            except Exception as e:
                print(f"Error loading invite history: {e}")
                self.invites = {}
        else:
            self.invites = {}

    def save_data(self):
        """Saves invites to JSON file."""
        try:
            os.makedirs(os.path.dirname(self.data_file), exist_ok=True)
            invites_list = list(self.invites.values())
            with open(self.data_file, 'w', encoding='utf-8') as f:
                json.dump(invites_list, f, indent=2, default=str)
        except Exception as e:
            print(f"Error saving invite history: {e}")

    def add_invite(self, invite_data: Dict) -> bool:
        """Adds a new invite if it doesn't exist."""
        invite_id = invite_data.get('id')
        if not invite_id:
            return False
        
        if invite_id not in self.invites:
            self.invites[invite_id] = invite_data
            self.save_data()
            return True
        else:
            # Update metadata for existing invites
            current = self.invites[invite_id]
            updated = False
            
            if invite_data.get('email_url') != current.get('email_url'):
                current['email_url'] = invite_data.get('email_url')
                current['thread_id'] = invite_data.get('thread_id')
                updated = True
            
            # Update meeting_time if it was missing or different
            if invite_data.get('meeting_time') and invite_data.get('meeting_time') != current.get('meeting_time'):
                current['meeting_time'] = invite_data.get('meeting_time')
                updated = True
                
            # Update detection method if we found a better one (e.g. upgrading from LEGACY to ICS)
            if invite_data.get('detection_method') != current.get('detection_method'):
                current['detection_method'] = invite_data.get('detection_method')
                updated = True

            if updated:
                self.save_data()
        return False
    
    def add_invites(self, invites: List[Dict]) -> int:
        """Adds multiple invites. Returns count of new invites."""
        count = 0
        for invite in invites:
            if self.add_invite(invite):
                count += 1
        return count

    def get_all_invites(self) -> List[Dict]:
        """Returns all invites sorted by detection timestamp (newest first)."""
        invites = list(self.invites.values())
        invites.sort(key=lambda x: x.get('detection_timestamp', ''), reverse=True)
        return invites

    def update_status(self, invite_id: str, status: str):
        """Updates the status of an invite."""
        if invite_id in self.invites:
            self.invites[invite_id]['status'] = status
            self.save_data()
            return True
        return False

    def get_invite(self, invite_id: str) -> Optional[Dict]:
        return self.invites.get(invite_id)
