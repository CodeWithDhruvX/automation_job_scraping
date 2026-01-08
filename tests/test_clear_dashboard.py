import requests
import json

BASE_URL = "http://localhost:8000/api"

def test_clear_dashboard():
    print("Step 1: Creating dummy jobs...")
    
    # Create jobs with different statuses
    jobs = [
        {"job_url": "http://test.com/new1", "title": "New Job 1", "my_status": "NEW"},
        {"job_url": "http://test.com/applied1", "title": "Applied Job 1", "my_status": "APPLIED"},
        {"job_url": "http://test.com/rejected1", "title": "Rejected Job 1", "my_status": "REJECTED"},
        {"job_url": "http://test.com/saved1", "title": "Saved Job 1", "my_status": "SAVED"},
        {"job_url": "http://test.com/smart1", "title": "Smart Tab Job 1", "my_status": "NEW", "search_id": "smart_tab_1"}
    ]
    
    # We can't directly add jobs via API with custom status easily unless we import or manually manipulate.
    # The 'import' endpoint sets status to 'NEW'.
    # So we'll import them, then update statuses.
    
    import_payload = {
        "jobs": [
            {**j, "search_id": j.get("search_id", "test_search")} for j in jobs
        ]
    }
    
    resp = requests.post(f"{BASE_URL}/jobs/import", json=import_payload)
    if resp.status_code != 200:
        print(f"Failed to import jobs: {resp.text}")
        return
        
    print("Jobs imported. Updating statuses...")
    for job in jobs:
        if job["my_status"] != "NEW":
            requests.post(f"{BASE_URL}/jobs/update", json={"url": job["job_url"], "status": job["my_status"]})

    # Verify initial state
    resp = requests.get(f"{BASE_URL}/jobs")
    current_jobs = resp.json()
    print(f"Total jobs before clear: {len(current_jobs)}")
    
    print("\nStep 2: Clearing Dashboard...")
    # Emulate the frontend call
    payload = {
        "preserve_saved": True,
        "exception_search_ids": ["smart_tab_1"]
    }
    
    resp = requests.post(f"{BASE_URL}/jobs/clear-dashboard", json=payload)
    if resp.status_code == 200:
        data = resp.json()
        print(f"Clear successful: {data}")
        # Verify stats
        if 'deleted_count' in data and 'kept_status' in data:
             print(f"[PASS] Stats received: deleted={data['deleted_count']}, kept_status={data['kept_status']}, kept_smart={data['kept_smart_tab']}")
        else:
             print(f"[FAIL] Missing stats in response: {data}")
    else:
        print(f"Clear FAILED: {resp.status_code} - {resp.text}")
        return

    print("\nStep 3: Verifying remaining jobs...")
    resp = requests.get(f"{BASE_URL}/jobs")
    remaining_jobs = resp.json()
    remaining_urls = [j["job_url"] for j in remaining_jobs]
    
    print(f"Total jobs after clear: {len(remaining_jobs)}")
    
    # Check what remained
    expected_urls = [
        "http://test.com/applied1",
        "http://test.com/rejected1", 
        "http://test.com/saved1",
        "http://test.com/smart1"
    ]
    
    should_be_deleted = ["http://test.com/new1"]
    
    success = True
    for url in expected_urls:
        if url in remaining_urls:
            print(f"[PASS] Preserved {url}")
        else:
            print(f"[FAIL] Missing {url}")
            success = False
            
    for url in should_be_deleted:
        if url not in remaining_urls:
            print(f"[PASS] Deleted {url}")
        else:
            print(f"[FAIL] Did NOT delete {url}")
            success = False

    if success:
        print("\nTEST PASSED: Correct jobs preserved!")
    else:
        print("\nTEST FAILED: Incorrect preservation logic.")

if __name__ == "__main__":
    test_clear_dashboard()
