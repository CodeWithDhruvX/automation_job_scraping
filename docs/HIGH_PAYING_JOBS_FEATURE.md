# 💰 High-Paying Jobs - Smart Search Features

## Overview
The system now includes intelligent features specifically designed to help you find and prioritize high-paying job opportunities.

---

## 🎯 Smart Filter Buttons

### Quick Salary Filters
Located in the "Smart Filters" section, these one-click buttons instantly set salary thresholds:

1. **$100k+ Only** 🟢
   - Sets minimum salary to $100,000
   - Perfect for mid-level to senior positions
   - Color: Emerald green

2. **$150k+ Only** 🟢
   - Sets minimum salary to $150,000
   - Targets high-paying senior roles
   - Color: Emerald green

3. **$200k+ Premium** 🟣
   - Sets minimum salary to $200,000
   - Premium positions (Director+, Specialized roles)
   - Color: Purple gradient

### Experience Level Quick Filter
- **Senior+ Roles** 🔵
  - Automatically filters for "Mid-Senior" experience level
  - High-paying positions typically require senior-level experience
  - One-click to target the most lucrative job tiers

### Hide No Salary Checkbox
- Excludes jobs without salary information
- Ensures you only see transparent, upfront salary data
- Great for focusing on companies with salary transparency

---

## 📊 Job Table Enhancements

### Auto-Sorting by Salary
- **Default Sort**: Highest salary first (💰 Highest Salary)
- **Sort Options**:
  - 💰 Highest Salary - Best for finding top-paying jobs
  - 💸 Lowest Salary - Budget/entry-level roles
  - 📅 Most Recent - Newest postings

### Visual Pay Badges
Jobs are automatically tagged based on salary:

- **💎 Premium Badge** ($200k+)
  - Purple-pink gradient
  - "Premium" label with award icon
  - Instantly identifies top-tier opportunities

- **📈 High Pay Badge** ($150k-$199k)
  - Emerald-teal gradient
  - "High Pay" label with trending up icon
  - Marks above-average compensation

### Salary Statistics Bar
Real-time analytics at the top of the table:
- **Total Jobs**: Count of all jobs in results
- **With Salary**: How many include salary data
- **Avg Max**: Average of max salaries (useful for market rate)
- **Highest**: The top-paying opportunity in your results

---

## 🔧 Technical Implementation

### Backend Filtering
The scraper now supports comprehensive salary filtering:

```python
# Filter parameters
salary_min: int        # Minimum salary threshold
salary_max: int        # Maximum salary threshold
hide_no_salary: bool   # Exclude jobs without salary
```

**Filtering Logic**:
1. Jobs are scraped from sources (LinkedIn, Indeed, Glassdoor)
2. Salary filters are applied:
   - If `salary_min` is set: Only show jobs where max_amount >= salary_min
   - If `salary_max` is set: Only show jobs where min_amount <= salary_max
   - If `hide_no_salary` is enabled: Remove all jobs without salary data
3. Results are returned sorted by salary (highest first)

### Frontend Features
- Quick filter buttons pre-populate salary ranges
- Table automatically sorts by descending salary
- Visual badges use conditional styling
- Real-time stats calculated from job data

---

## 🎓 Usage Tips

### Finding High-Paying Jobs

**Strategy 1: Start Broad, Filter Narrow**
1. Search for your desired role (e.g., "Software Engineer")
2. Click "$100k+ Only" to filter
3. Review results and adjust (e.g., "$150k+ Only")
4. Use "Hide No Salary" to focus on transparent employers

**Strategy 2: Senior Position Targeting**
1. Enter job title (e.g., "Product Manager")
2. Click "Senior+ Roles" for experience filter
3. Click "$150k+ Only" for appropriate senior salary
4. Sort table by "💰 Highest Salary"

**Strategy 3: Location + Salary Combo**
1. Set location (e.g., "San Francisco, CA" or "Remote")
2. Enable "Exact match only" for location
3. Set "$200k+ Premium" filter
4. Review "Premium" badged jobs first

### Understanding the Data

- **Salary Range**: Jobs show `$min - $max` (e.g., $120,000 - $180,000)
- **No Salary**: Some jobs don't publish salary → use "Hide No Salary" to filter
- **Avg Max**: Good indicator of market rate for your search
- **Premium Badge**: These are the top opportunities → apply first!

---

## 📈 Example Workflows

### Workflow: Find Remote $150k+ Engineering Jobs
```
1. Title: "Software Engineer"
2. Location: "Remote"
3. Click "Senior+ Roles"
4. Click "$150k+ Only"
5. Check "Hide No Salary"
6. Click "Start Scraper"
7. Review jobs with "High Pay" or "Premium" badges
```

### Workflow: Executive Positions
```
1. Title: "Director of Engineering"
2. Location: (your preferred location)
3. Experience: "Director"
4. Click "$200k+ Premium"
5. Sort by "💰 Highest Salary"
6. Focus on "Premium" badged opportunities
```

### Workflow: Market Research
```
1. Search for your job title without salary filters
2. Check the "Avg Max" salary in the stats bar
3. Note the "Highest" salary offered
4. Use this data to negotiate or set expectations
5. Apply "$X+ Only" filter at your target salary
```

---

## 🔮 Future Enhancements (Potential)

- **Salary Trends**: Track salary changes over time
- **Company Compensation Ratings**: Rate companies by pay transparency
- **Total Compensation Estimator**: Include equity, bonuses, benefits
- **Salary Alerts**: Get notified when jobs above your threshold appear
- **Geographic Salary Normalization**: Adjust for cost of living
- **Auto-Apply to High-Paying**: Prioritize applications to premium positions

---

## ⚙️ Configuration

All features work with the existing filter system. No additional setup required.

**Default Behavior**:
- Jobs sorted by salary (highest first)
- All salary ranges accepted (no minimum)
- Jobs without salary are shown (unless "Hide No Salary" is enabled)

**Customization**:
Simply use the filter buttons or manually input salary ranges in the filter bar!

---

## 🎨 Visual Design

The feature uses a color-coded system for quick recognition:
- 🟢 **Emerald Green** = Good salary ($100k+)
- 🟣 **Purple** = Premium salary ($200k+)
- 🔵 **Blue** = Senior positions
- 📊 **Stats Bar** = Blue gradient background

All badges use gradient styling for a premium, modern appearance.

---

## 📝 Notes

- **Salary Data Quality**: Depends on job board transparency (LinkedIn, Indeed, Glassdoor)
- **Filtering Performance**: Filters run server-side for faster results
- **Search History**: Your salary filters are saved in search history
- **Export**: Excel exports include full salary information

---

**Happy job hunting! 🚀**
