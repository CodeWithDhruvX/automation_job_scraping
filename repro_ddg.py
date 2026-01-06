from duckduckgo_search import DDGS
import logging

logging.basicConfig(level=logging.INFO)

try:
    print("Testing DDGS...")
    results = DDGS().text("test", max_results=5)
    for r in results:
        print(r)
    print("DDGS success")
except Exception as e:
    print(f"DDGS failed: {e}")
