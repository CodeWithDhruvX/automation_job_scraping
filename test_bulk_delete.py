import requests
import json

BASE_URL = "http://localhost:8000/api"

def test_bulk_delete_searches():
    print("Testing Bulk Delete Searches...")
    
    # 1. Create dummy searches (if not possible via API easily, we assume some exist or manually mock)
    # Actually, let's just try to delete non-existent ones to see if it handles gracefully, 
    # or rely on the fact that the endpoint should return success even if 0 deleted.
    
    # But to test properly, we should probably verify it deletes.
    # We can't easily create searches via API without scraping.
    # So we'll just test the endpoint invocation.
    
    payload = {
        "search_ids": ["dummy_id_1", "dummy_id_2"]
    }
    
    try:
        response = requests.post(f"{BASE_URL}/searches/delete-list", json=payload)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            print("✅ Bulk delete endpoint is reachable and returns 200")
        else:
            print("❌ Bulk delete endpoint failed")
            
    except Exception as e:
        print(f"❌ Error connecting to server: {e}")

if __name__ == "__main__":
    test_bulk_delete_searches()
