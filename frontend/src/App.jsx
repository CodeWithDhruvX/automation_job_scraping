import { useState, useEffect } from 'react'
import axios from 'axios'
import { JobTable } from './components/JobTable'
import { FilterBar } from './components/FilterBar'
import { SearchHistory } from './components/SearchHistory'
import { SettingsModal } from './components/SettingsModal'
import { AppliedJobsView } from './components/AppliedJobsView'
import { SmartTabView } from './components/SmartTabView'
import { SmartTabModal } from './components/SmartTabModal'
import { RejectedJobsView } from './components/RejectedJobsView'
import { LayoutDashboard, RefreshCw, Trash2, X, Download, ExternalLink, Settings, Upload, Sparkles } from 'lucide-react'
import * as XLSX from 'xlsx'

// Configure Axios base URL
const api = axios.create({
  baseURL: 'http://localhost:8000/api'
})

function App() {
  const [jobs, setJobs] = useState([])
  const [allJobs, setAllJobs] = useState([]) // Track all jobs for accurate counts
  const [loading, setLoading] = useState(false)
  const [scrapping, setScrapping] = useState(false)
  const [searches, setSearches] = useState([])
  const [activeSearchId, setActiveSearchId] = useState('all')
  const [filteredJobUrls, setFilteredJobUrls] = useState(null)
  const [selectedJobUrls, setSelectedJobUrls] = useState([])
  const [showSettings, setShowSettings] = useState(false)
  const [showAppliedJobsView, setShowAppliedJobsView] = useState(false)
  const [showRejectedJobsView, setShowRejectedJobsView] = useState(false)

  // Smart Tab State
  const [showSmartTabView, setShowSmartTabView] = useState(false)
  const [showSmartTabModal, setShowSmartTabModal] = useState(false)
  const [smartTabIds, setSmartTabIds] = useState(() => {
    const saved = localStorage.getItem('smartTabIds')
    if (!saved) return []
    try {
      const parsed = JSON.parse(saved)
      // Migration: Convert string[] to {id, label}[]
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
        const migrated = parsed.map(id => ({ id, label: null }))
        localStorage.setItem('smartTabIds', JSON.stringify(migrated))
        return migrated
      }
      return parsed
    } catch (e) {
      console.error("Failed to parse smartTabIds", e)
      return []
    }
  })

  // Filter state
  const [filters, setFilters] = useState({
    title: '',
    location: '',
    experience: '',
    datePosted: '72',
    jobType: '',
    salaryMin: '',
    salaryMax: '',
    resultsWanted: '50',
    exactMatchLocation: false,
    exactMatchTitle: false,
    foreignOnly: false,
    visaSponsorship: false,
    remoteAnywhere: false,
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

  // Saved Jobs state
  const [savedJobs, setSavedJobs] = useState(() => {
    const saved = localStorage.getItem('savedJobs')
    return saved ? JSON.parse(saved) : []
  })

  // Check URL params for settings and hash for Applied Jobs view
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('open') === 'true' || params.get('status') === 'success') {
      setShowSettings(true)
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname)
    }

    // Check URL hash for Applied Jobs view
    if (window.location.hash === '#applied-jobs') {
      setShowAppliedJobsView(true)
    } else if (window.location.hash === '#smart-tabs') {
      setShowSmartTabView(true)
    } else if (window.location.hash === '#rejected-jobs') {
      setShowRejectedJobsView(true)
    }
  }, [])

  // Listen for hash changes (browser back/forward)
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#applied-jobs') {
        setShowAppliedJobsView(true)
        setShowSmartTabView(false)
      } else if (window.location.hash === '#smart-tabs') {
        setShowSmartTabView(true)
        setShowAppliedJobsView(false)
      } else if (window.location.hash === '#rejected-jobs') {
        setShowRejectedJobsView(true)
        setShowAppliedJobsView(false)
        setShowSmartTabView(false)
      } else {
        setShowAppliedJobsView(false)
        setShowSmartTabView(false)
        setShowRejectedJobsView(false)
      }
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const fetchSearches = async () => {
    try {
      const res = await api.get('/searches')
      setSearches(res.data)
    } catch (err) {
      console.error("Failed to fetch searches", err)
    }
  }

  const fetchJobs = async (searchId = null) => {
    if (searchId === 'saved') {
      setJobs(savedJobs)
      return
    }

    if (searchId === 'applied') {
      setLoading(true)
      try {
        const res = await api.get('/jobs')
        setAllJobs(res.data) // Store all jobs for counts
        const appliedJobs = res.data.filter(j => j.my_status === 'APPLIED')
        setJobs(appliedJobs)
      } catch (err) {
        console.error("Failed to fetch applied jobs", err)
      } finally {
        setLoading(false)
      }
      return
    }

    setLoading(true)
    try {
      const params = {}
      if (searchId && searchId !== 'all') {
        params.search_id = searchId
      }
      const res = await api.get('/jobs', { params })
      const visibleJobs = res.data.filter(j => j.my_status !== 'HIDDEN')
      setJobs(visibleJobs)
      setAllJobs(visibleJobs) // Store all jobs for counts
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
        job_type: currentFilters.jobType,
        experience: currentFilters.experience,
        salary: currentFilters.salaryMin ? parseInt(currentFilters.salaryMin) : null,
        exact_match_location: currentFilters.exactMatchLocation || false,
        exact_match_title: currentFilters.exactMatchTitle || false,
        foreign_only: currentFilters.foreignOnly || false,
        visa_sponsorship: currentFilters.visaSponsorship || false,
        remote_anywhere: currentFilters.remoteAnywhere || false,
        clear_before_scrape: false
      })

      addToSearchHistory(currentFilters)
      alert("Scraping started! New jobs will load shortly.")

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

  const addToSearchHistory = (currentFilters) => {
    const newHistoryItem = {
      id: Date.now(),
      timestamp: Date.now(),
      isSaved: false,
      filters: { ...currentFilters }
    }
    const updatedHistory = [newHistoryItem, ...searchHistory].slice(0, 50)
    setSearchHistory(updatedHistory)
    localStorage.setItem('searchHistory', JSON.stringify(updatedHistory))
  }

  const handleToggleSavedHistory = (id) => {
    const updatedHistory = searchHistory.map(item =>
      item.id === id ? { ...item, isSaved: !item.isSaved } : item
    )
    setSearchHistory(updatedHistory)
    localStorage.setItem('searchHistory', JSON.stringify(updatedHistory))
  }

  const handleSelectHistory = (historicalFilters) => {
    setFilters({ ...historicalFilters })
  }

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear all search history?')) {
      setSearchHistory([])
      localStorage.removeItem('searchHistory')
    }
  }

  const handleFilteredData = (filteredJobs) => {
    const urls = filteredJobs.map(j => j.job_url)
    setFilteredJobUrls(urls)
  }

  const handleExport = async (searchId = activeSearchId) => {
    try {
      const isFiltered = filteredJobUrls && jobs.length > 0 && filteredJobUrls.length !== jobs.length
      const isVirtualTab = searchId === 'saved' || searchId === 'applied'

      let response
      if (isFiltered || (filteredJobUrls && filteredJobUrls.length === 0) || isVirtualTab) {
        // Determine URLs to export
        let urlsToExport = filteredJobUrls
        if (!urlsToExport && isVirtualTab) {
          // If on saved/applied tab and no specific filter, export all visible jobs
          urlsToExport = jobs.map(j => j.job_url)
        }

        response = await api.post('/export', {
          search_id: (searchId !== 'all' && !isVirtualTab) ? searchId : null,
          job_urls: urlsToExport
        }, { responseType: 'blob' })
      } else {
        const params = {}
        if (searchId && searchId !== 'all') {
          params.search_id = searchId
        }
        response = await api.get('/export', { params, responseType: 'blob' })
      }

      // Determine filename based on active tab
      let filenamePrefix = 'jobs_export'
      if (searchId === 'all') {
        filenamePrefix = 'all_jobs'
      } else if (searchId === 'saved') {
        filenamePrefix = 'saved_jobs'
      } else if (searchId === 'applied') {
        filenamePrefix = 'applied_jobs'
      } else {
        // Try to find custom label first, then search query
        const smartTab = smartTabIds.find(t => t.id === searchId)
        if (smartTab?.label) {
          filenamePrefix = smartTab.label
        } else {
          const search = searches.find(s => s.search_id === searchId)
          if (search) {
            filenamePrefix = search.search_query
          }
        }
      }

      // Sanitize filename
      const safeFilename = filenamePrefix.replace(/[^a-z0-9]/gi, '_').toLowerCase()
      const dateStr = new Date().toISOString().slice(0, 10)

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${safeFilename}_${dateStr}.xlsx`)
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
        await api.post('/jobs/clear-dashboard', {
          preserve_saved: true,
          exception_search_ids: smartTabIds.map(t => t.id)
        })

        // Refresh everything to reflect state
        await fetchJobs(activeSearchId)
        await fetchSearches()

        // Optimistically update local state if we want to avoid flicker, 
        // but fetching is safer to ensure sync with backend logic.
        // For 'all' tab, we might still see saved jobs and smart tab jobs, which is correct.

        alert('Dashboard jobs cleared successfully! Saved jobs and Smart Tabs are preserved.')
      } catch (err) {
        alert('Failed to clear jobs: ' + err.message)
      }
    }
  }

  const handleTabClick = (searchId) => {
    setActiveSearchId(searchId)
    setSelectedJobUrls([])
  }

  const handleDeleteSearch = async (e, searchId) => {
    e.stopPropagation()
    if (window.confirm('Are you sure you want to close this tab? Jobs in this search will be removed.')) {
      try {
        await api.delete(`/searches/${searchId}`)
        const newSearches = searches.filter(s => s.search_id !== searchId)
        setSearches(newSearches)
        if (activeSearchId === searchId) {
          setActiveSearchId('all')
        } else {
          if (activeSearchId === 'all') {
            fetchJobs('all')
          }
        }
        fetchSearches()
      } catch (err) {
        alert('Failed to delete search: ' + err.message)
      }
    }
  }

  const handleJobUpdate = (updatedJob) => {
    if (updatedJob.my_status === 'HIDDEN') {
      setJobs(prev => prev.filter(j => j.job_url !== updatedJob.job_url))
      setAllJobs(prev => prev.filter(j => j.job_url !== updatedJob.job_url))
    } else {
      setJobs(prevJobs => prevJobs.map(j => j.job_url === updatedJob.job_url ? { ...j, ...updatedJob } : j))
      setAllJobs(prevAllJobs => prevAllJobs.map(j => j.job_url === updatedJob.job_url ? { ...j, ...updatedJob } : j))
    }
  }

  const handleToggleSaveJob = (job) => {
    const isSaved = savedJobs.some(j => j.job_url === job.job_url)
    let newSavedJobs
    if (isSaved) {
      newSavedJobs = savedJobs.filter(j => j.job_url !== job.job_url)
    } else {
      newSavedJobs = [...savedJobs, { ...job, date_saved: new Date().toISOString() }]
    }
    setSavedJobs(newSavedJobs)
    localStorage.setItem('savedJobs', JSON.stringify(newSavedJobs))

    if (activeSearchId === 'saved') {
      setJobs(newSavedJobs)
    }
  }

  const handleDeleteJob = async (job) => {
    if (window.confirm('Are you sure you want to delete this job?')) {
      try {
        // Use encodeURIComponent for the URL parameter
        await api.delete(`/jobs/detail?url=${encodeURIComponent(job.job_url)}`)

        // Update local state
        const newJobs = jobs.filter(j => j.job_url !== job.job_url)
        setJobs(newJobs)
        setAllJobs(prev => prev.filter(j => j.job_url !== job.job_url))

        // If it was in saved jobs, remove it there too
        if (savedJobs.some(j => j.job_url === job.job_url)) {
          const newSaved = savedJobs.filter(j => j.job_url !== job.job_url)
          setSavedJobs(newSaved)
          localStorage.setItem('savedJobs', JSON.stringify(newSaved))
        }

      } catch (err) {
        alert('Failed to delete job: ' + err.message)
      }
    }
  }

  const handleDeleteAllImported = async () => {
    if (window.confirm('Are you sure you want to delete ALL jobs in this import tab? This cannot be undone.')) {
      try {
        await api.delete(`/searches/${activeSearchId}`)
        // Remove the tab and switch to 'all'
        const newSearches = searches.filter(s => s.search_id !== activeSearchId)
        setSearches(newSearches)
        setActiveSearchId('all')
        fetchSearches() // Refresh counts
        alert('Imported jobs deleted successfully.')
      } catch (err) {
        alert('Failed to delete imported jobs: ' + err.message)
      }
    }
  }

  const handleDeleteAllSaved = async () => {
    if (window.confirm('Are you sure you want to delete ALL saved jobs? This cannot be undone.')) {
      try {
        const urls = savedJobs.map(j => j.job_url)
        // We delete them from backend too if they are just saved? 
        // Wait, "Saved" jobs might also be in "All Jobs". 
        // If we "Delete" from Saved tab, do we just "Unsave" them or "Delete" them from DB?
        // The user request says "saved job also have the delete and delete all ... just like import tab functionality"
        // Import tab functionality deletes from DB.
        // So we should probably delete from DB.

        await api.post('/jobs/delete-list', { urls })

        setSavedJobs([])
        localStorage.setItem('savedJobs', JSON.stringify([]))

        // Update main job list if we are viewing it
        if (activeSearchId === 'saved') {
          setJobs([])
        }

        // Remove from allJobs/jobs
        setAllJobs(prev => prev.filter(j => !urls.includes(j.job_url)))
        setJobs(prev => prev.filter(j => !urls.includes(j.job_url)))

        alert('All saved jobs deleted successfully.')
      } catch (err) {
        alert('Failed to delete saved jobs: ' + err.message)
      }
    }
  }

  const handleDeleteSelected = async () => {
    if (window.confirm(`Are you sure you want to delete ${selectedJobUrls.length} selected job(s)?`)) {
      try {
        await api.post('/jobs/delete-list', { urls: selectedJobUrls })

        // Update local state
        const newJobs = jobs.filter(j => !selectedJobUrls.includes(j.job_url))
        setJobs(newJobs)
        setAllJobs(prev => prev.filter(j => !selectedJobUrls.includes(j.job_url)))

        // Remove from saved jobs if present
        const newSaved = savedJobs.filter(j => !selectedJobUrls.includes(j.job_url))
        if (newSaved.length !== savedJobs.length) {
          setSavedJobs(newSaved)
          localStorage.setItem('savedJobs', JSON.stringify(newSaved))
        }

        setSelectedJobUrls([])
        alert(`Successfully deleted ${selectedJobUrls.length} jobs.`)
      } catch (err) {
        alert('Failed to delete jobs: ' + err.message)
      }
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result
        const wb = XLSX.read(bstr, { type: 'binary' })
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        const data = XLSX.utils.sheet_to_json(ws)

        if (data.length === 0) {
          alert("No data found in the file.")
          return
        }

        // Transform data
        const searchId = `import_${Date.now()}`
        const timestamp = new Date().toISOString()

        const jobsToImport = data.map((row, index) => {
          // Normalize keys to lowercase for mapping
          const normalized = {}
          Object.keys(row).forEach(key => {
            normalized[key.toLowerCase()] = row[key]
          })

          return {
            job_url: normalized['job_url'] || normalized['url'] || `import://${Date.now()}-${index}`, // Fallback if no URL
            title: normalized['title'] || 'Untitled Job',
            company: normalized['company'] || 'Unknown Company',
            location: normalized['location'] || normalized['city'] || 'Unknown Location',
            date_posted: normalized['date_posted'] || normalized['posted'] || 'Recently',
            min_amount: normalized['min_amount'],
            max_amount: normalized['max_amount'],
            currency: normalized['currency'],
            job_type: normalized['job_type'],
            description: normalized['description'] || '',

            // System fields
            search_id: searchId,
            search_query: `Imported: ${file.name}`,
            search_location: 'File Upload',
            search_timestamp: timestamp,
            search_sites: normalized['site'] || 'Imported',
            my_status: 'NEW', // Default status
            added_date: timestamp
          }
        })

        await api.post('/jobs/import', { jobs: jobsToImport })

        alert(`Successfully imported ${jobsToImport.length} jobs!`)
        await fetchSearches()
        setActiveSearchId(searchId) // Switch to the new tab

      } catch (err) {
        console.error("Import error:", err)
        alert("Failed to import file: " + err.message)
      } finally {
        // Reset file input
        e.target.value = ''
      }
    }
    reader.readAsBinaryString(file)
  }

  const handleSmartTabSave = (selectedIds) => {
    setSmartTabIds(prev => {
      // Create new list preserving objects for existing IDs and adding new objects for new IDs
      const newSmartTabs = selectedIds.map(id => {
        const existing = prev.find(t => t.id === id)
        return existing || { id, label: null }
      })
      localStorage.setItem('smartTabIds', JSON.stringify(newSmartTabs))
      return newSmartTabs
    })
  }

  const handleRenameSmartTab = (id, newName) => {
    setSmartTabIds(prev => {
      const updated = prev.map(tab =>
        tab.id === id ? { ...tab, label: newName } : tab
      )
      localStorage.setItem('smartTabIds', JSON.stringify(updated))
      return updated
    })
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
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
            onClick={() => {
              window.location.hash = 'smart-tabs'
              setShowSmartTabView(true)
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-fuchsia-600 to-pink-600 border border-transparent rounded-md hover:from-fuchsia-700 hover:to-pink-700 transition-colors shadow-sm"
          >
            <Sparkles size={16} fill="currentColor" className="text-white/20" />
            Smart Tab
          </button>

          {selectedJobUrls.length > 0 && (
            <button
              onClick={() => {
                selectedJobUrls.forEach(url => window.open(url, '_blank'))
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-indigo-700 rounded-md hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <ExternalLink size={16} />
              Open Selected ({selectedJobUrls.length})
            </button>
          )}
          <button
            onClick={() => {
              window.location.hash = 'applied-jobs'
              setShowAppliedJobsView(true)
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors shadow-sm"
          >
            Applied Jobs
          </button>
          <label className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors cursor-pointer select-none">
            <Upload size={16} />
            Import
            <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} className="hidden" />
          </label>
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
          >
            <Settings size={16} />
            Settings
          </button>
          <button
            onClick={handleClearAllJobs}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-red-700 rounded-md hover:bg-red-700 transition-colors"
          >
            <Trash2 size={16} />
            Clear All
          </button>
          <button
            onClick={() => {
              fetchJobs(activeSearchId)
              fetchSearches()
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </header>

      <main className="p-6 mx-auto space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <FilterBar
              onScrape={handleScrape}
              onExport={handleExport}
              isScraping={scrapping}
              filters={filters}
              onFiltersChange={setFilters}
            />
          </div>

          <div className="lg:col-span-4">
            <SearchHistory
              history={searchHistory}
              onSelectHistory={handleSelectHistory}
              onClearHistory={handleClearHistory}
              onToggleSaved={handleToggleSavedHistory}
            />
          </div>
        </div>

        {(searches.length > 0 || savedJobs.length > 0 || allJobs.filter(j => j.my_status === 'APPLIED').length > 0) && (
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

              {savedJobs.length > 0 && (
                <button
                  onClick={() => handleTabClick('saved')}
                  className={`
                  px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 
                  ${activeSearchId === 'saved'
                      ? 'border-blue-600 text-blue-600 bg-white'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }
                `}
                >
                  Saved Jobs ({savedJobs.length})
                </button>
              )}

              {allJobs.filter(j => j.my_status === 'APPLIED').length > 0 && (
                <button
                  onClick={() => handleTabClick('applied')}
                  className={`
                  px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 
                  ${activeSearchId === 'applied'
                      ? 'border-blue-600 text-blue-600 bg-white'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }
                `}
                >
                  Applied Jobs ({allJobs.filter(j => j.my_status === 'APPLIED').length})
                </button>
              )}

              {searches.map((search) => {
                const smartTab = smartTabIds.find(t => t.id === search.search_id)
                const displayName = smartTab?.label || search.search_query
                return (
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
                    <span className="whitespace-nowrap max-w-[150px] truncate" title={displayName}>{displayName}</span>
                    <span className="text-xs opacity-70 whitespace-nowrap">
                      {search.search_location} • {search.job_count} jobs
                    </span>

                    <div
                      onClick={(e) => handleDeleteSearch(e, search.search_id)}
                      className="absolute right-1 top-2 p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <X size={14} />
                    </div>
                  </button>
                )
              })}
            </nav>
          </div>
        )
        }

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
          <button
            onClick={() => handleTabClick('applied')}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer text-left w-full"
          >
            <div className="text-slate-500 text-sm font-medium">Applied</div>
            <div className="text-2xl font-bold mt-1 text-blue-600">
              {allJobs.filter(j => j.my_status === 'APPLIED').length}
            </div>
          </button>
          <div className="h-full flex gap-2">
            {selectedJobUrls.length > 0 && (
              <button
                onClick={async () => {
                  if (window.confirm(`Mark ${selectedJobUrls.length} selected job(s) as APPLIED?`)) {
                    try {
                      // Mark each selected job as APPLIED
                      for (const url of selectedJobUrls) {
                        await api.post('/jobs/update', {
                          url: url,
                          status: 'APPLIED'
                        })
                      }
                      // Refresh the jobs list
                      await fetchJobs(activeSearchId)
                      // Clear selection
                      setSelectedJobUrls([])
                      alert(`Successfully marked ${selectedJobUrls.length} job(s) as APPLIED!`)
                    } catch (err) {
                      console.error('Failed to mark jobs as applied:', err)
                      alert('Failed to update some jobs. Please try again.')
                    }
                  }
                }}
                className="flex-1 min-h-[80px] flex flex-col items-center justify-center gap-2 bg-blue-50 border-2 border-blue-500 rounded-xl text-blue-700 font-bold hover:bg-blue-100 transition-colors shadow-md hover:shadow-lg"
                title={`Mark ${selectedJobUrls.length} selected job(s) as APPLIED`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <span>Apply Jobs ({selectedJobUrls.length})</span>
              </button>
            )}
            <button
              onClick={() => handleExport()}
              className={`${selectedJobUrls.length > 0 ? 'flex-1' : 'w-full'} h-full min-h-[80px] flex flex-col items-center justify-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-700 font-medium hover:bg-indigo-100 transition-colors shadow-sm`}
              title="Export jobs for current tab to Excel"
            >
              <Download size={24} />
              <span>Export {activeSearchId === 'all' ? 'All' : 'Tab'} Data</span>
            </button>
            {(activeSearchId.startsWith('import_') || activeSearchId === 'saved') && (
              <button
                onClick={selectedJobUrls.length > 0 ? handleDeleteSelected : (activeSearchId === 'saved' ? handleDeleteAllSaved : handleDeleteAllImported)}
                className={`w-1/3 h-full min-h-[80px] flex flex-col items-center justify-center gap-2 bg-red-50 border border-red-200 rounded-xl text-red-700 font-medium hover:bg-red-100 transition-colors shadow-sm`}
                title={selectedJobUrls.length > 0 ? "Delete selected jobs" : "Delete all jobs in this list"}
              >
                <Trash2 size={24} />
                <span>{selectedJobUrls.length > 0 ? `Delete Selected (${selectedJobUrls.length})` : 'Delete All'}</span>
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
          <JobTable
            jobs={jobs}
            onJobUpdate={handleJobUpdate}
            savedJobs={savedJobs}
            onToggleSave={handleToggleSaveJob}
            onFilteredData={handleFilteredData}
            selectedJobUrls={selectedJobUrls}
            onSelectionChange={setSelectedJobUrls}
            onDeleteJob={activeSearchId.startsWith('import_') || activeSearchId === 'saved' ? handleDeleteJob : null}
          />
        </div>
      </main >

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}


      {showRejectedJobsView && (
        <RejectedJobsView
          onClose={() => {
            window.location.hash = ''
            setShowRejectedJobsView(false)
          }}
          savedJobs={savedJobs}
          onToggleSave={handleToggleSaveJob}
          onJobUpdate={handleJobUpdate}
        />
      )}

      {showAppliedJobsView && (
        <AppliedJobsView
          onClose={() => {
            window.location.hash = ''
            setShowAppliedJobsView(false)
          }}
          savedJobs={savedJobs}
          onToggleSave={handleToggleSaveJob}
          onJobUpdate={(updatedJob) => {
            handleJobUpdate(updatedJob)
            // Refresh jobs to update counts
            fetchJobs(activeSearchId)
          }}
        />
      )}

      {showSmartTabView && (
        <SmartTabView
          onClose={() => {
            window.location.hash = ''
            setShowSmartTabView(false)
          }}
          smartTabs={smartTabIds}
          onManageTabs={() => setShowSmartTabModal(true)}
          savedJobs={savedJobs}
          onToggleSave={handleToggleSaveJob}
          onSave={handleSmartTabSave}
          onRenameTab={handleRenameSmartTab}
        />
      )}

      {showSmartTabModal && (
        <SmartTabModal
          isOpen={showSmartTabModal}
          onClose={() => setShowSmartTabModal(false)}
          allSearches={searches}
          savedSmartTabIds={smartTabIds.map(t => t.id)}
          onSave={handleSmartTabSave}
        />
      )}
    </div >
  )
}

export default App
