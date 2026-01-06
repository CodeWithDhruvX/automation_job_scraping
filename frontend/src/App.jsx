import { useState, useEffect } from 'react'
import axios from 'axios'
import { JobTable } from './components/JobTable'
import { FilterBar } from './components/FilterBar'
import { SearchHistory } from './components/SearchHistory'
import { LayoutDashboard, RefreshCw, Trash2, X, Download } from 'lucide-react'

// Configure Axios base URL
const api = axios.create({
  baseURL: 'http://localhost:8000/api'
})

function App() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(false)
  const [scrapping, setScrapping] = useState(false)
  const [searches, setSearches] = useState([]) // All search sessions
  const [activeSearchId, setActiveSearchId] = useState('all') // Currently selected tab

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
      zip_recruiter: false,
      naukri: false
    }
  })

  // Search history state
  const [searchHistory, setSearchHistory] = useState(() => {
    const saved = localStorage.getItem('searchHistory')
    return saved ? JSON.parse(saved) : []
  })

  const fetchSearches = async () => {
    try {
      const res = await api.get('/searches')
      setSearches(res.data)
    } catch (err) {
      console.error("Failed to fetch searches", err)
    }
  }

  const fetchJobs = async (searchId = null) => {
    setLoading(true)
    try {
      const params = {}
      if (searchId && searchId !== 'all') {
        params.search_id = searchId
      }
      const res = await api.get('/jobs', { params })
      setJobs(res.data)
    } catch (err) {
      console.error("Failed to fetch jobs", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchJobs(activeSearchId)
    fetchSearches()
  }, [activeSearchId])

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

      // Automatically fetch the new jobs and searches after a short delay
      setTimeout(() => {
        fetchJobs(activeSearchId)
        fetchSearches()
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
      isSaved: false,
      filters: { ...currentFilters }
    }

    const updatedHistory = [newHistoryItem, ...searchHistory].slice(0, 50) // Increased limit to allow for saved items
    setSearchHistory(updatedHistory)
    localStorage.setItem('searchHistory', JSON.stringify(updatedHistory))
  }

  // Toggle saved status of a history item
  const handleToggleSavedHistory = (id) => {
    const updatedHistory = searchHistory.map(item =>
      item.id === id ? { ...item, isSaved: !item.isSaved } : item
    )
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

  const handleExport = async (searchId = activeSearchId) => {
    try {
      const params = {}
      if (searchId && searchId !== 'all') {
        params.search_id = searchId
      }
      const response = await api.get('/export', { params, responseType: 'blob' })
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
        setSearches([])
        setActiveSearchId('all')
        alert('All jobs cleared successfully!')
      } catch (err) {
        alert('Failed to clear jobs: ' + err.message)
      }
    }
  }

  const handleTabClick = (searchId) => {
    setActiveSearchId(searchId)
  }

  const handleDeleteSearch = async (e, searchId) => {
    e.stopPropagation() // Prevent tab click
    if (window.confirm('Are you sure you want to close this tab? Jobs in this search will be removed.')) {
      try {
        await api.delete(`/searches/${searchId}`)
        // Update local state
        const newSearches = searches.filter(s => s.search_id !== searchId)
        setSearches(newSearches)

        // If deleted active tab, switch to 'all'
        if (activeSearchId === searchId) {
          setActiveSearchId('all')
        } else {
          // If deleted another tab, fetch 'all' or currently active jobs to update counts or remove deleted jobs if they were part of current view?
          // Actually if we are in 'all' view, we should refresh jobs to remove the deleted ones
          if (activeSearchId === 'all') {
            fetchJobs('all')
          }
        }

        // Refresh searches list from server to be sure
        fetchSearches()

        // If we switched to all, fetch jobs for all
        if (activeSearchId === searchId) {
          // setTimeout to allow state update? No, just call plain
          // create a helper or just re-call fetchJobs
          // But since activeIds changed, useEffect will trigger? 
          // Yes useEffect depends on activeSearchId.
          // BUT: if we were already on 'all', activeSearchId didn't change, so useEffect won't fire.
          // So if we were on 'all', we must manually refresh.
        }

      } catch (err) {
        alert('Failed to delete search: ' + err.message)
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
              onToggleSaved={handleToggleSavedHistory}
            />
          </div>
        </div>



        {/* Search Tabs */}
        {
          searches.length > 0 && (
            <div className="border-b border-slate-200 overflow-x-auto">
              <nav className="flex space-x-4 pb-1 min-w-max" aria-label="Tabs">
                <button
                  onClick={() => handleTabClick('all')}
                  className={`
                  px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 
                  ${activeSearchId === 'all'
                      ? 'border-blue-600 text-blue-600 bg-white'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }
                `}
                >
                  All Jobs
                </button>

                {searches.map((search) => (
                  <button
                    key={search.search_id}
                    onClick={() => handleTabClick(search.search_id)}
                    className={`
                    px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 flex flex-col items-start relative group pr-8
                    ${activeSearchId === search.search_id
                        ? 'border-blue-600 text-blue-600 bg-white'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                      }
                  `}
                  >
                    <span className="whitespace-nowrap">{search.search_query}</span>
                    <span className="text-xs opacity-70 whitespace-nowrap">
                      {search.search_location} • {search.job_count} jobs
                    </span>

                    <div
                      onClick={(e) => handleDeleteSearch(e, search.search_id)}
                      className="absolute right-1 top-2 p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      title="Close tab and delete jobs"
                    >
                      <X size={14} />
                    </div>
                  </button>
                ))}
              </nav>
            </div>
          )
        }

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
          <div className="h-full">
            <button
              onClick={() => handleExport()}
              className="w-full h-full min-h-[80px] flex flex-col items-center justify-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-700 font-medium hover:bg-indigo-100 transition-colors shadow-sm"
              title="Export jobs for current tab to Excel"
            >
              <Download size={24} />
              <span>Export {activeSearchId === 'all' ? 'All' : 'Tab'} Data</span>
            </button>
          </div>
        </div>

        {/* Job Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
          <JobTable jobs={jobs} />
        </div>
      </main >
    </div >
  )
}

export default App
