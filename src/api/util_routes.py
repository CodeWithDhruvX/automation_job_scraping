from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import requests
from bs4 import BeautifulSoup
import re

router = APIRouter(prefix="/api/utils", tags=["utils"])

class MetadataRequest(BaseModel):
    url: str

@router.post("/fetch-metadata")
def fetch_metadata(payload: MetadataRequest):
    """
    Fetches title and meta description from a public URL.
    Used for 'Magic Paste' to auto-fill job details.
    """
    url = payload.url
    if not url:
        raise HTTPException(status_code=400, detail="Missing URL")

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }

    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # 1. Try JSON-LD (Schema.org) - The Gold Standard for Job Data
        import json
        ld_scripts = soup.find_all('script', type='application/ld+json')
        
        extracted_data = {}
        
        for script in ld_scripts:
            try:
                data = json.loads(script.string)
                # Sometimes it's a list or graph
                if isinstance(data, dict):
                     items = [data]
                elif isinstance(data, list):
                     items = data
                else:
                     # e.g. @graph
                     items = data.get('@graph', [])
                     if not isinstance(items, list):
                         items = [items]

                for item in items:
                    if item.get('@type') == 'JobPosting':
                         # Found it! Extract fields.
                         extracted_data['title'] = item.get('title')
                         extracted_data['description'] = item.get('description') # Often HTML
                         extracted_data['date_posted'] = item.get('datePosted')
                         
                         # Company
                         hiring_org = item.get('hiringOrganization')
                         if isinstance(hiring_org, dict):
                             extracted_data['company'] = hiring_org.get('name')
                         elif isinstance(hiring_org, str):
                             extracted_data['company'] = hiring_org
                             
                         # Location
                         job_loc = item.get('jobLocation')
                         if isinstance(job_loc, dict):
                             address = job_loc.get('address')
                             if isinstance(address, dict):
                                 parts = [
                                     address.get('addressLocality'),
                                     address.get('addressRegion'), 
                                     address.get('addressCountry')
                                 ]
                                 extracted_data['location'] = ", ".join([p for p in parts if p])
                             elif isinstance(address, str):
                                 extracted_data['location'] = address
                         
                         # Job Type
                         j_type = item.get('employmentType')
                         if isinstance(j_type, list):
                             extracted_data['job_type'] = ", ".join(j_type)
                         else:
                             extracted_data['job_type'] = j_type
                             
                         # Salary (BaseSalary)
                         base_salary = item.get('baseSalary')
                         if isinstance(base_salary, dict):
                             value = base_salary.get('value')
                             if isinstance(value, dict):
                                 min_sal = value.get('minValue')
                                 max_sal = value.get('maxValue')
                                 unit = value.get('unitText')
                                 if min_sal:
                                     extracted_data['min_amount'] = min_sal
                                 if max_sal:
                                     extracted_data['max_amount'] = max_sal
                             # Sometimes it is just a 'value' key if fixed salary
                             elif isinstance(value, (int, float, str)):
                                 extracted_data['min_amount'] = value

                         break # Found the job, stop looking
            except Exception as e:
                print(f"JSON-LD parsing error: {e}")
                continue
            
            if 'title' in extracted_data:
                break
        
        # 2. Existing Fallback Logic (Title/Desc/Company)
        if not extracted_data.get('title'):
             extracted_data['title'] = soup.title.string.strip() if soup.title and soup.title.string else ""
             
        if not extracted_data.get('description'):
            meta_desc = soup.find("meta", attrs={"name": "description"}) or soup.find("meta", attrs={"property": "og:description"})
            if meta_desc and meta_desc.get("content"):
                extracted_data['description'] = meta_desc["content"].strip()
                
        if not extracted_data.get('company'):
            # Guess Company from Title
            title = extracted_data.get('title', '')
            company = ""
            company_indicators = [" at ", " @ ", " | ", " - "]
            for ind in company_indicators:
                if ind in title:
                    parts = title.split(ind)
                    if len(parts) > 1:
                        candidate = parts[-1].strip()
                        candidate = re.sub(r'\s*\|.*', '', candidate)
                        company = candidate
                        break
            
            if not company:
                from urllib.parse import urlparse
                domain = urlparse(url).netloc
                domain = domain.replace("www.", "").split('.')[0]
                company = domain.capitalize()
            
            extracted_data['company'] = company

        # Clean HTML from description if it came from JSON-LD
        desc = extracted_data.get('description', '')
        if desc and '<' in desc and '>' in desc:
            try:
                desc_soup = BeautifulSoup(desc, 'html.parser')
                extracted_data['description'] = desc_soup.get_text(separator="\n\n").strip()
            except:
                pass

        return {
            "title": extracted_data.get('title', ''),
            "company": extracted_data.get('company', ''),
            "description": extracted_data.get('description', ''),
            "location": extracted_data.get('location', ''),
            "job_type": extracted_data.get('job_type', ''),
            "min_amount": extracted_data.get('min_amount'),
            "max_amount": extracted_data.get('max_amount'),
            "site": "Manual Import"
        }

    except Exception as e:
        print(f"Standard fetch failed: {e}")
        # Fallback to Jina Proxy (The 'Hack')
        return fetch_via_jina(url)

def fetch_via_jina(url: str):
    """
    Uses r.jina.ai as a proxy to render JS-heavy pages and return Markdown.
    This is the 'hack' for difficult sites.
    """
    print(f"Attempting Jina hack for: {url}")
    try:
        jina_url = f"https://r.jina.ai/{url}"
        # Jina requires no special headers usually, but we be polite
        resp = requests.get(jina_url, timeout=15)
        resp.raise_for_status()
        
        text = resp.text
        
        # Jina returns Markdown. The first line is usually the title.
        lines = text.split('\n')
        lines = [l.strip() for l in lines if l.strip()]
        
        if not lines:
            return {"error": "Jina returned empty content"}
            
        # Heuristic parsing
        title = ""
        description = text
        company = ""
        
        # Often line 1 is "Title: ..." or just the title
        if lines[0].startswith("Title: "):
            title = lines[0].replace("Title: ", "")
        else:
            title = lines[0]
            
        # Try to find company in title
        company_indicators = [" at ", " @ ", " | ", " - "]
        for ind in company_indicators:
            if ind in title:
                parts = title.split(ind)
                if len(parts) > 1:
                    candidate = parts[-1].strip()
                    candidate = re.sub(r'\s*\|.*', '', candidate)
                    company = candidate
                    break
        
        if not company:
             # Domain fallback
            from urllib.parse import urlparse
            domain = urlparse(url).netloc
            domain = domain.replace("www.", "").split('.')[0]
            company = domain.capitalize()

        return {
            "title": title,
            "company": company,
            "description": description,
            "site": "Manual Import (Via Jina)"
        }
        
    except Exception as e:
        print(f"Jina hack failed: {e}")
        return {
            "title": "",
            "company": "",
            "description": "",
            "error": str(e)
        }

    except Exception as e:
        print(f"Error fetching metadata: {e}")
        # Allow client to handle failure gracefully (e.g. user just types it in)
        return {
            "title": "",
            "company": "",
            "description": "",
            "error": str(e)
        }
