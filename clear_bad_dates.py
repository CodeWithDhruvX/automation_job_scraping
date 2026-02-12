"""
Clear bad meeting_time values so migration can re-extract them.
"""
import json

with open('data/invites.json', 'r', encoding='utf-8') as f:
    invites = json.load(f)

count = 0
for invite in invites:
    mt = invite.get('meeting_time')
    # Clear dates that are clearly wrong (before 2020 or missing)
    if mt and mt < '2020-01-01':
        print(f"Clearing bad date for: {invite['subject'][:50]}")
        print(f"  Was: {mt}")
        del invite['meeting_time']
        count += 1

with open('data/invites.json', 'w', encoding='utf-8') as f:
    json.dump(invites, f, indent=2)

print(f"\nCleared {count} bad meeting times")
