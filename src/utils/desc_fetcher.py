import requests
from bs4 import BeautifulSoup
import time
import random

def fetch_description(url: str) -> str:
    """
    Attempts to fetch job description from a URL using requests and BS4.
    Returns the text description or None if failed.
    """
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
    }
    
    try:
        # random sleep to avoid aggressive rate limiting if called in sequence (though user clicks are slow)
        # time.sleep(random.uniform(0.5, 1.5)) 
        
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code != 200:
            print(f"Failed to fetch {url}: Status {response.status_code}")
            return None
            
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Remove script and style elements
        for script in soup(["script", "style", "nav", "footer", "header"]):
            script.decompose()
            
        # Try to find specific containers based on common sites
        # LinkedIn public job page
        description_div = soup.find("div", {"class": "show-more-less-html__markup"})
        if description_div:
            return description_div.get_text(separator="\n").strip()
            
        description_div = soup.find("div", {"class": "description__text"})
        if description_div:
            return description_div.get_text(separator="\n").strip()

        # Indeed (tough, often requires semantic classes)
        description_div = soup.find("div", {"id": "jobDescriptionText"})
        if description_div:
            return description_div.get_text(separator="\n").strip()
            
        # Generic Fallback: Find the element with the most text
        # This is crude but effective for a "smart" fallback
        # Or just return title + body text? No, too noisy.
        
        # Helper to score elements
        # ...
        
        # Simple fallback: Get text from body
        text = soup.get_text(separator="\n")
        
        # Clean up empty lines
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        cleaned_text = "\n".join(lines)
        
        # Truncate if too huge (unlikely for job desc, but possible for full page)
        if len(cleaned_text) > 10000:
            cleaned_text = cleaned_text[:10000] + "..."
            
        return cleaned_text

    except Exception as e:
        print(f"Error fetching description for {url}: {e}")
        return None
