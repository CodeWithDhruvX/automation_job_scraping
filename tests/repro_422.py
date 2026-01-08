import requests
import json

BASE_URL = "http://localhost:8000/api"

def test_payload(name, payload):
    print(f"Testing {name}...")
    try:
        resp = requests.post(f"{BASE_URL}/jobs/clear-dashboard", json=payload)
        if resp.status_code == 200:
            print(f"  [PASS] {resp.status_code}")
        else:
            print(f"  [FAIL] {resp.status_code} - {resp.text}")
    except Exception as e:
        print(f"  [ERROR] {e}")

def run_tests():
    # Valid
    test_payload("Valid empty list", {"preserve_saved": True, "exception_search_ids": []})
    test_payload("Valid list", {"preserve_saved": True, "exception_search_ids": ["abc"]})
    
    # Edge cases
    test_payload("None list", {"preserve_saved": True, "exception_search_ids": None})
    test_payload("List with None", {"preserve_saved": True, "exception_search_ids": ["abc", None]})
    test_payload("Integers", {"preserve_saved": True, "exception_search_ids": [123, 456]})
    test_payload("Mixed types", {"preserve_saved": True, "exception_search_ids": ["abc", 123]})
    test_payload("Missing field", {"preserve_saved": True})
    
    # What frontend might be sending if filter fails
    test_payload("List with empty string", {"preserve_saved": True, "exception_search_ids": [""]})

if __name__ == "__main__":
    run_tests()
