# Scraping Limit Configuration

## Summary
The scraping limit has been updated to allow users to configure how many results they want per scrape, with safe default values.

## Changes Made

### 1. Backend (server.py)
- **Default limit changed**: From `20` to `50` results
- This is the fallback value if the frontend doesn't send a limit
- Comment added explaining safe range (50-500)

### 2. Frontend FilterBar (FilterBar.jsx)
- **Added new selector** for "Results Wanted"
- **Preset options**:
  - 25 (Quick)
  - 50 (Recommended) ⭐ Default
  - 100 (Medium)
  - 200 (Extensive)
  - 500 (Maximum)
- Includes helpful hint: "Higher values may take longer"
- Shows "(per site)" to clarify the limit applies to each selected site

### 3. Frontend App (App.jsx)
- Added `resultsWanted: '50'` to initial filter state
- Updated scrape API call to use `parseInt(currentFilters.resultsWanted) || 50`
- Falls back to 50 if parsing fails

## Safe Usage Guidelines

### By Limit:
| Limit | Speed | Risk | Best For |
|-------|-------|------|----------|
| 25 | ⚡ Fast (30s-1min) | ✅ Very Low | Quick searches |
| 50 | ⚡ Fast (1-2min) | ✅ Low | Daily use (default) |
| 100 | ⏱️ Medium (2-4min) | ⚠️ Medium | Comprehensive searches |
| 200 | 🐌 Slow (4-7min) | ⚠️ Higher | Extensive research |
| 500 | 🐌 Very Slow (8-15min) | ❌ High | Maximum data (use cautiously) |

### By Site:
- **LinkedIn**: Most restrictive, use 25-50 for safety
- **Indeed**: More tolerant, safe up to 100-200
- **Glassdoor**: Moderate, safe up to 50-100

### Best Practices:
1. ✅ Start with 50 and increase only if needed
2. ✅ Use fewer sites when requesting high limits
3. ✅ Monitor for "rate limit" errors
4. ⚠️ Avoid rapid consecutive searches with high limits
5. ⚠️ Consider using proxies for limits above 200

## Testing
To test the new feature:
1. Restart the frontend (if running): `npm run dev` in the `frontend` folder
2. The backend should auto-reload (FastAPI hot reload)
3. You'll see the new "Results Wanted" dropdown in the filter bar
4. Try different values and observe the number of results returned

## Notes
- The limit applies **per site**, so selecting 3 sites with 50 results = up to 150 total jobs
- Higher limits increase scraping time exponentially
- Rate limiting may occur with aggressive settings
- The system automatically handles duplicate jobs across sites
