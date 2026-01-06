# Legal Job Aggregation & Automation Platform

A compliant, automated system to discover jobs from Google Jobs, ATS platforms, and company career pages.

## Features
- **Sourcing**: Fetches jobs from Google Search (via SERP API) and direct ATS integrations.
- **Compliance**: No direct LinkedIn scraping; uses `site:linkedin.com/jobs` queries.
- **Data Management**: Deduplicates, normalizes, and stores jobs in SQLite/PostgreSQL.
- **Export**: Exports curated job lists to Excel/CSV.

## Setup

1. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configuration**
   Edit `config/config.yaml` to set your roles, locations, and API keys.
   
   *Note: You need a SERP API key (e.g., from SerpAPI) for Google functionality.*

3. **Run**
   ```bash
   python src/main.py
   ```

## Directory Structure
- `config/`: Configuration files.
- `data/`: Database and export files.
- `src/`: Source code.
  - `connectors/`: Data fetchers.
  - `core/`: Database and logic.
  - `utils/`: Helpers.

## License
MIT
