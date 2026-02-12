import re
import datetime

# Sample ICS content patterns to test
test_cases = [
    # Standard format with timezone
    """BEGIN:VCALENDAR
DTSTART;TZID=Asia/Calcutta:20260212T173000
DTEND;TZID=Asia/Calcutta:20260212T180000
SUMMARY:Test Meeting
END:VCALENDAR""",
    
    # UTC format
    """BEGIN:VCALENDAR
DTSTART:20260212T173000Z
DTEND:20260212T180000Z
SUMMARY:Test Meeting
END:VCALENDAR""",
    
    # Date only format
    """BEGIN:VCALENDAR
DTSTART;VALUE=DATE:20260212
SUMMARY:All Day Event
END:VCALENDAR""",
    
    # Microsoft Teams format
    """BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Microsoft Corporation//Outlook 16.0 MIMEDIR//EN
METHOD:REQUEST
BEGIN:VEVENT
DTSTART;TZID=India Standard Time:20260212T170000
DTEND;TZID=India Standard Time:20260212T180000
SUMMARY:Interview
END:VEVENT
END:VCALENDAR"""
]

def test_extraction(content):
    """Test the regex pattern."""
    # Original regex (with bug)
    old_pattern = r'DTSTART(?:;[^:\n]*)?:?(\d{8})(?:T(\d{6})Z?)?'
    
    # Fixed regex
    new_pattern = r'DTSTART(?:;[^:\n]*)?:(\d{8})(?:T(\d{6})Z?)?'
    
    print("=" * 80)
    print(f"Testing content:\n{content[:200]}")
    print("-" * 80)
    
    old_match = re.search(old_pattern, content)
    new_match = re.search(new_pattern, content)
    
    print(f"Old pattern match: {old_match.groups() if old_match else 'NO MATCH'}")
    print(f"New pattern match: {new_match.groups() if new_match else 'NO MATCH'}")
    
    if new_match:
        date_part = new_match.group(1)
        time_part = new_match.group(2)
        
        try:
            if time_part:
                dt = datetime.datetime.strptime(f"{date_part}T{time_part}", "%Y%m%dT%H%M%S")
            else:
                dt = datetime.datetime.strptime(date_part, "%Y%m%d")
            
            print(f"[SUCCESS] Parsed datetime: {dt.isoformat()}")
        except ValueError as e:
            print(f"[ERROR] Error parsing: {e}")
    print()

for i, test_case in enumerate(test_cases, 1):
    print(f"\nTest Case {i}:")
    test_extraction(test_case)
