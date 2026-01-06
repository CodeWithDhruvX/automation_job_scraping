import sys
import os

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from src.utils.desc_fetcher import fetch_description

if __name__ == "__main__":
    print("Testing description fetcher...")
    
    # Test with a dummy URL or ask user for one. 
    # Since we can't interact, we'll try to fetch a specific known URL if possible, 
    # but better to just try one from the user's image if we could read it, but we can't OCR reliably here.
    # Instead, we will try to fetch a generic one or just print instructions.
    
    url = input("Enter a job URL to test fetching: ")
    if url:
        print(f"\nFetching: {url}")
        try:
            desc = fetch_description(url)
            if desc:
                print("\n--- SUCCESS: Description Fetched ---")
                print(desc[:500] + "..." if len(desc) > 500 else desc)
                print(f"\nTotal Length: {len(desc)} chars")
            else:
                print("\n--- FAILED: Could not fetch description ---")
        except Exception as e:
            print(f"\n--- ERROR: {e} ---")
            import traceback
            traceback.print_exc()
