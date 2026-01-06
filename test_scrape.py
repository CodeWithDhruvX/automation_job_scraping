from src.connectors.jobspy_connector import JobSpyConnector
import logging

logging.basicConfig(level=logging.INFO)

def test_scrape():
    print("Initializing Connector...")
    connector_config = {
        "sources": {"jobspy": {"enabled": True}},
        "search": {"results_wanted": 5, "country_indir": "India"} 
    }
    connector = JobSpyConnector(connector_config)
    
    print("Searching...")
    jobs = connector.search(
        query="Software Engineer",
        site_name=["linkedin", "indeed"],
        location="India",
        hours_old=72
    )
    
    print(f"Found {len(jobs)} jobs")
    if jobs:
        print("First job:", jobs[0])

if __name__ == "__main__":
    test_scrape()
