import { useState, useEffect } from 'react'
import axios from 'axios'
import { JobTable } from './components/JobTable'
import { FilterBar } from './components/FilterBar'
import { SearchHistory } from './components/SearchHistory'
import { LayoutDashboard, RefreshCw, Trash2 } from 'lucide-react'

// Configure Axios base URL
const api = axios.create({
  baseURL: 'http://localhost:8000/api'
})

function App() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(false)
  const [scrapping, setScrapping] = useState(false)

  // Filter state with default values
  const [filters, setFilters] = useState({
    title: '',
    location: '',
    experience: '',
    datePosted: '72',
    salaryMin: '',
    salaryMax: '',
    resultsWanted: '50',  // Default safe limit
    exactMatchLocation: false,
    exactMatchTitle: false,
    sites: {
      linkedin: true,
      indeed: true,
      glassdoor: true,
      zip_recruiter: false
    }
  })

  // Search history state
  const [searchHistory, setSearchHistory] = useState(() => {
    const saved = localStorage.getItem('searchHistory')
    return saved ? JSON.parse(saved) : []
  })

  const fetchJobs = async () => {
    setLoading(true)
    try {
      const res = await api.get('/jobs')
      setJobs(res.data)
    } catch (err) {
      console.error("Failed to fetch jobs", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchJobs()
  }, [])

  const handleScrape = async (currentFilters) => {
    setScrapping(true)
    // Don't clear jobs - allow accumulation from multiple searches
    // setJobs([])  // REMOVED: Was clearing jobs on each new search

    try {
      const activeSites = Object.entries(currentFilters.sites)
        .filter(([_, active]) => active)
        .map(([site]) => site)

      if (activeSites.length === 0) {
        alert("Please select at least one site.")
        setScrapping(false)
        return
      }

      await api.post('/scrape', {
        title: currentFilters.title,
        location: currentFilters.location,
        sites: activeSites,
        results_wanted: parseInt(currentFilters.resultsWanted) || 50,
        hours_old: parseInt(currentFilters.datePosted),
        experience: currentFilters.experience,
        salary: currentFilters.salaryMin ? parseInt(currentFilters.salaryMin) : null,
        exact_match_location: currentFilters.exactMatchLocation || false,
        exact_match_title: currentFilters.exactMatchTitle || false,
        clear_before_scrape: false  // Keep accumulating jobs from multiple searches
      })

      // Add to search history
      addToSearchHistory(currentFilters)

      alert("Scraping started! New jobs will load shortly.")

      // Automatically fetch the new jobs after a short delay
      setTimeout(() => {
        fetchJobs()
      }, 2000)
    } catch (err) {
      alert("Failed to start scrape: " + err.message)
    } finally {
      setScrapping(false)
    }
  }

  // Add search to history
  const addToSearchHistory = (currentFilters) => {
    const newHistoryItem = {
      id: Date.now(),
      timestamp: Date.now(),
      filters: { ...currentFilters }
    }

    const updatedHistory = [newHistoryItem, ...searchHistory].slice(0, 20) // Keep last 20 searches
    setSearchHistory(updatedHistory)
    localStorage.setItem('searchHistory', JSON.stringify(updatedHistory))
  }

  // Load filters from history
  const handleSelectHistory = (historicalFilters) => {
    setFilters({ ...historicalFilters })
  }

  // Clear all history
  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear all search history?')) {
      setSearchHistory([])
      localStorage.removeItem('searchHistory')
    }
  }

  const handleExport = async () => {
    try {
      const response = await api.get('/export', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `jobs_export_${new Date().toISOString().slice(0, 10)}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err) {
      alert("Export failed: " + err.message)
    }
  }

  const handleClearAllJobs = async () => {
    if (window.confirm('Are you sure you want to clear all jobs? This action cannot be undone.')) {
      try {
        await api.delete('/jobs/clear')
        setJobs([])
        alert('All jobs cleared successfully!')
      } catch (err) {
        alert('Failed to clear jobs: ' + err.message)
      }
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <LayoutDashboard size={20} />
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            JobSpy Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleClearAllJobs}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-red-700 rounded-md hover:bg-red-700 transition-colors"
            title="Clear all jobs from database"
          >
            <Trash2 size={16} />
            Clear All
          </button>
          <button
            onClick={fetchJobs}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6 mx-auto space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Filters (8 columns on large screens) */}
          <div className="lg:col-span-8">
            <FilterBar
              onScrape={handleScrape}
              onExport={handleExport}
              isScraping={scrapping}
              filters={filters}
              onFiltersChange={setFilters}
            />
          </div>

          {/* Right Column: Search History (4 columns on large screens) */}
          <div className="lg:col-span-4">
            <SearchHistory
              history={searchHistory}
              onSelectHistory={handleSelectHistory}
              onClearHistory={handleClearHistory}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-slate-500 text-sm font-medium">Total Jobs</div>
            <div className="text-2xl font-bold mt-1">{jobs.length}</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-slate-500 text-sm font-medium">New</div>
            <div className="text-2xl font-bold mt-1 text-green-600">
              {jobs.filter(j => j.my_status === 'NEW').length}
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-slate-500 text-sm font-medium">Applied</div>
            <div className="text-2xl font-bold mt-1 text-blue-600">
              {jobs.filter(j => j.my_status === 'APPLIED').length}
            </div>
          </div>
        </div>

        {/* Job Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
          <JobTable jobs={jobs} />
        </div>
      </main>
    </div>
  )
}

export default App
