import { useState, useEffect } from 'react'
import axios from 'axios'
import { JobTable } from './components/JobTable'
import { FilterBar } from './components/FilterBar'
import { LayoutDashboard, RefreshCw } from 'lucide-react'

// Configure Axios base URL
const api = axios.create({
  baseURL: 'http://localhost:8000/api'
})

function App() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(false)
  const [scrapping, setScrapping] = useState(false)

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

  const handleScrape = async (filters) => {
    setScrapping(true)
    try {
      const activeSites = Object.entries(filters.sites)
        .filter(([_, active]) => active)
        .map(([site]) => site)

      if (activeSites.length === 0) {
        alert("Please select at least one site.")
        setScrapping(false)
        return
      }

      await api.post('/scrape', {
        title: filters.title,
        location: filters.location,
        sites: activeSites,
        results_wanted: 5,
        hours_old: parseInt(filters.datePosted),
        experience: filters.experience,
        salary: filters.salaryMin ? parseInt(filters.salaryMin) : null
      })
      alert("Scraping started! Check logs or refresh in a moment.")
    } catch (err) {
      alert("Failed to start scrape: " + err.message)
    } finally {
      setScrapping(false)
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
        <button
          onClick={fetchJobs}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </header>

      {/* Main Content */}
      <main className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Filters */}
        <FilterBar onScrape={handleScrape} onExport={handleExport} isScraping={scrapping} />

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
