"""
Script to clean and re-save job data with proper JSON formatting.
This fixes any NaN or Inf values that may have been saved.
"""
import sys
import os

# Add project root to path
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from src.core.job_manager import JobManager

def main():
    print("Initializing JobManager...")
    manager = JobManager()
    
    print(f"Loaded {len(manager.jobs)} jobs from history")
    
    # Force re-save with sanitization
    print("Re-saving with sanitized values...")
    manager.save_data()
    
    print("✅ Data cleaned and saved successfully!")
    print(f"Total jobs: {len(manager.get_all_jobs())}")
    
    # Test JSON serialization
    import json
    try:
        json.dumps(manager.get_all_jobs())
        print("✅ JSON serialization test passed!")
    except Exception as e:
        print(f"❌ JSON serialization test failed: {e}")

if __name__ == "__main__":
    main()
