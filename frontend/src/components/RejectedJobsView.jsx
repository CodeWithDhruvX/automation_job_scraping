import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { ExternalLink, X, Loader2, Bookmark, Bell, XCircle, ArrowLeft, RotateCcw } from 'lucide-react'
import { ReminderModal } from './ReminderModal'

const api = axios.create({
    baseURL: 'http://localhost:8000/api'
})

export function RejectedJobsView({ onClose, savedJobs = [], onToggleSave, onJobUpdate }) {
    const [jobs, setJobs] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedJob, setSelectedJob] = useState(null)
    const [reminderJob, setReminderJob] = useState(null)
    const [selectedJobUrls, setSelectedJobUrls] = useState([])
    const [filters, setFilters] = useState({})
    const [activeFilterColumn, setActiveFilterColumn] = useState(null)

    // Column Definitions
    const COLUMN_DEFS = useMemo(() => [
        {
            key: 'select',
            label: '',
            getValue: j => j.job_url,
            className: "w-10 text-center px-2",
            isSelect: true
        },
        { key: 'title', label: 'Title', getValue: j => j.title || 'N/A', className: "font-medium text-slate-900 max-w-md truncate" },
        { key: 'company', label: 'Company', getValue: j => j.company || 'N/A' },
        { key: 'location', label: 'Location', getValue: j => j.location || j.city || 'N/A' },
        { key: 'salary', label: 'Salary', getValue: j => (j.min_amount && j.max_amount ? `$${j.min_amount} - $${j.max_amount}` : 'N/A'), className: "text-slate-500" },
        { key: 'date_posted', label: 'Posted', getValue: j => j.date_posted || 'Recently', className: "text-slate-500" },
    ], [])

    const isJobSaved = (job) => {
        return savedJobs.some(s => s.job_url === job.job_url)
    }

    // Fetch rejected jobs
    useEffect(() => {
        fetchRejectedJobs()
    }, [])

    const fetchRejectedJobs = async () => {
        setLoading(true)
        try {
            const res = await api.get('/jobs')
            const rejectedJobs = res.data.filter(j => j.my_status === 'REJECTED')
            setJobs(rejectedJobs)
        } catch (err) {
            console.error("Failed to fetch rejected jobs", err)
        } finally {
            setLoading(false)
        }
    }

    // Close modal on escape key
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                if (selectedJob) {
                    setSelectedJob(null)
                } else {
                    onClose()
                }
            }
        }
        window.addEventListener('keydown', handleEsc)
        return () => window.removeEventListener('keydown', handleEsc)
    }, [selectedJob, onClose])

    const handleRestoreJob = async (job) => {
        try {
            // Restore to NEW
            await api.post('/jobs/update', {
                url: job.job_url,
                status: 'NEW'
            })
            // Remove from local list
            setJobs(jobs.filter(j => j.job_url !== job.job_url))
            if (onJobUpdate) {
                onJobUpdate({ ...job, my_status: 'NEW' })
            }
        } catch (err) {
            console.error('Failed to restore job:', err)
        }
    }

    const handleRestoreSelected = async () => {
        if (!window.confirm(`Are you sure you want to restore ${selectedJobUrls.length} jobs to the active list?`)) return

        try {
            await Promise.all(selectedJobUrls.map(async (url) => {
                await api.post('/jobs/update', {
                    url: url,
                    status: 'NEW'
                })
                // Find existing job to notify parent
                const job = jobs.find(j => j.job_url === url)
                if (job && onJobUpdate) {
                    onJobUpdate({ ...job, my_status: 'NEW' })
                }
            }))

            // Remove from local list
            setJobs(jobs.filter(j => !selectedJobUrls.includes(j.job_url)))
            setSelectedJobUrls([])
            alert(`Successfully restored ${selectedJobUrls.length} jobs.`)

        } catch (err) {
            console.error('Failed to restore selected jobs:', err)
            alert('Failed to restore some jobs. Please try again.')
        }
    }

    // Apply filters
    const filteredJobs = useMemo(() => {
        return jobs.filter(job => {
            return COLUMN_DEFS.every(col => {
                const selectedValues = filters[col.key]
                if (selectedValues === undefined) return true
                if (selectedValues.length === 0) return false
                const value = col.getValue(job)
                return selectedValues.includes(value)
            })
        })
    }, [jobs, filters, COLUMN_DEFS])

    const setColumnFilter = (columnKey, values) => {
        setFilters(prev => ({ ...prev, [columnKey]: values }))
    }

    const clearColumnFilter = (columnKey) => {
        setFilters(prev => {
            const { [columnKey]: _, ...rest } = prev
            return rest
        })
    }

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (activeFilterColumn && !e.target.closest('.column-filter-container')) {
                setActiveFilterColumn(null)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [activeFilterColumn])

    if (loading) {
        return (
            <div className="fixed inset-0 z-50 bg-slate-50">
                <div className="flex items-center justify-center h-screen">
                    <Loader2 size={48} className="animate-spin text-red-600" />
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 z-50 bg-slate-50 overflow-y-auto">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                        title="Back"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        Rejected Jobs <span className="text-slate-400 font-normal">({jobs.length})</span>
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    {selectedJobUrls.length > 0 && (
                        <button
                            onClick={handleRestoreSelected}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 border border-green-700 rounded-md hover:bg-green-700 transition-colors shadow-sm"
                        >
                            <RotateCcw size={16} />
                            Restore Selected ({selectedJobUrls.length})
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
            </header>

            <main className="p-6 max-w-[1600px] mx-auto">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    {jobs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                            <XCircle size={48} className="mb-4 opacity-20" />
                            <p>No rejected jobs found.</p>
                        </div>
                    ) : (
                        <div className="overflow-visible min-h-[400px]">
                            <table className="w-full text-left text-sm text-slate-600 relative">
                                <thead className="bg-slate-50 text-slate-900 font-medium border-b border-slate-200">
                                    <tr>
                                        {COLUMN_DEFS.map((col) => {
                                            if (col.key === 'select') {
                                                const allVisibleSelected = filteredJobs.length > 0 && filteredJobs.every(j => selectedJobUrls.includes(j.job_url))
                                                const isIndeterminate = filteredJobs.some(j => selectedJobUrls.includes(j.job_url)) && !allVisibleSelected

                                                return (
                                                    <th key={col.key} className="px-6 py-4 w-10">
                                                        <input
                                                            type="checkbox"
                                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                            checked={allVisibleSelected}
                                                            ref={input => { if (input) input.indeterminate = isIndeterminate }}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    const visibleUrls = filteredJobs.map(j => j.job_url)
                                                                    const newSelection = [...new Set([...selectedJobUrls, ...visibleUrls])]
                                                                    setSelectedJobUrls(newSelection)
                                                                } else {
                                                                    const visibleUrls = filteredJobs.map(j => j.job_url)
                                                                    const newSelection = selectedJobUrls.filter(url => !visibleUrls.includes(url))
                                                                    setSelectedJobUrls(newSelection)
                                                                }
                                                            }}
                                                        />
                                                    </th>
                                                )
                                            }

                                            return (
                                                <th key={col.key} className="px-6 py-4 relative group">
                                                    <span>{col.label}</span>
                                                </th>
                                            )
                                        })}
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredJobs.length === 0 ? (
                                        <tr>
                                            <td colSpan={COLUMN_DEFS.length + 1} className="text-center py-12 text-slate-400">
                                                No jobs match your filters.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredJobs.map((job, idx) => (
                                            <tr
                                                key={idx}
                                                className="hover:bg-slate-50 transition-colors group"
                                            >
                                                {COLUMN_DEFS.map((col) => {
                                                    const rawVal = col.getValue(job)
                                                    return (
                                                        <td key={col.key} className={`px-6 py-4 ${col.className || ''}`}>
                                                            {col.key === 'select' ? (
                                                                <input
                                                                    type="checkbox"
                                                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                                    checked={selectedJobUrls.includes(job.job_url)}
                                                                    onChange={(e) => {
                                                                        if (e.target.checked) {
                                                                            setSelectedJobUrls([...selectedJobUrls, job.job_url])
                                                                        } else {
                                                                            setSelectedJobUrls(selectedJobUrls.filter(url => url !== job.job_url))
                                                                        }
                                                                    }}
                                                                />
                                                            ) : (
                                                                rawVal
                                                            )}
                                                        </td>
                                                    )
                                                })}
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            title="Restore Job"
                                                            className="p-1 hover:bg-slate-200 rounded text-green-600"
                                                            onClick={() => handleRestoreJob(job)}
                                                        >
                                                            <RotateCcw size={16} />
                                                        </button>
                                                        <button
                                                            title="Open Link"
                                                            className="p-1 hover:bg-slate-200 rounded text-blue-600"
                                                            onClick={() => window.open(job.job_url, '_blank')}
                                                        >
                                                            <ExternalLink size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
