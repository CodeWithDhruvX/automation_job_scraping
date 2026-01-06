import tls_client
from bs4 import BeautifulSoup
import time
import random

def fetch_description(url: str) -> str:
    """
    Attempts to fetch job description from a URL using tls_client (to bypass basic bot protection) and BS4.
    Returns the text description or None if failed.
    """
    # Use tls_client to mimic a real browser request
    session = tls_client.Session(
        client_identifier="chrome_120",
        random_tls_extension_order=True
    )

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Referer": "https://www.google.com/",
    }
    
    try:
        # random sleep to avoid aggressive rate limiting
        time.sleep(random.uniform(0.5, 1.0)) 
        
        response = session.get(url, headers=headers, timeout_seconds=15)
        
        if response.status_code != 200:
            print(f"Failed to fetch {url}: Status {response.status_code}")
            return None
            
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Remove script and style elements
        for script in soup(["script", "style", "nav", "footer", "header", "noscript", "iframe", "svg", "button"]):
            script.decompose()
            
        # --- Site Specific Selectors ---
        
        # Naukri Specific Handling
        if "naukri.com" in url:
            # 1. Look for the main job description section (often <section class="job-desc">)
            naukri_section = soup.find("section", class_=lambda c: c and "job-desc" in c.lower())
            if naukri_section:
                return naukri_section.get_text(separator="\n").strip()

            # 2. Look for the container using generic "job-desc" matching in div
            naukri_div = soup.find("div", class_=lambda c: c and "job-desc" in c.lower())
            if naukri_div:
                 return naukri_div.get_text(separator="\n").strip()

            # 3. Look for "Job Description" header and take the next sibling
            # This is a bit risky but good fallback
            for header in soup.find_all(["h2", "h3", "h4"]):
                if header.get_text() and "job description" in header.get_text().lower():
                    # Get the parent or next sibling
                    content = header.find_next_sibling("div")
                    if content:
                        return content.get_text(separator="\n").strip()

        # LinkedIn
        description_div = soup.find("div", {"class": "show-more-less-html__markup"})
        if description_div:
            return description_div.get_text(separator="\n").strip()
            
        description_div = soup.find("div", {"class": "description__text"})
        if description_div:
            return description_div.get_text(separator="\n").strip()

        # Indeed
        description_div = soup.find("div", {"id": "jobDescriptionText"})
        if description_div:
            return description_div.get_text(separator="\n").strip()

        # Glassdoor
        gd_desc = soup.find("div", {"id": "JobDescriptionContainer"})
        if gd_desc:
            return gd_desc.get_text(separator="\n").strip()
            
        # Generic Fallback: Find the element with a good amount of text
        # that might be the description.
        
        # Option 1: Look for common description classes
        common_classes = ['job-description', 'description', 'details', 'content', 'job-details', 'vacancy-desc']
        for cls in common_classes:
            div = soup.find("div", class_=lambda c: c and cls in c.lower())
            if div and len(div.get_text()) > 200:
                # Basic heuristic: Descs are usually long.
                return div.get_text(separator="\n").strip()

        # Option 2: Main fallback
        text = soup.get_text(separator="\n")
        
        # Clean up empty lines
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        cleaned_text = "\n".join(lines)
        
        # If text is too short, it might be a captcha or empty page
        if len(cleaned_text) < 50:
            return None

        # Truncate if too huge
        if len(cleaned_text) > 10000:
            cleaned_text = cleaned_text[:10000] + "..."
            
        return cleaned_text

    except Exception as e:
        print(f"Error fetching description for {url}: {e}")
        return None
