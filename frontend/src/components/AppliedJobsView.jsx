import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { ExternalLink, X, Loader2, Bookmark, Copy, Check, Bell, Link, FileText, XCircle, ArrowLeft, Upload, Ban, EyeOff } from 'lucide-react'
import { ReminderModal } from './ReminderModal'

const api = axios.create({
    baseURL: 'http://localhost:8000/api'
})

export function AppliedJobsView({ onClose, savedJobs = [], onToggleSave, onJobUpdate }) {
    const [jobs, setJobs] = useState([])
    const [rejectedCount, setRejectedCount] = useState(0)
    const [loading, setLoading] = useState(true)
    const [selectedJob, setSelectedJob] = useState(null)
    const [reminderJob, setReminderJob] = useState(null)
    const [copied, setCopied] = useState(false)
    const [linkCopied, setLinkCopied] = useState(false)
    const [mdCopied, setMdCopied] = useState(false)
    const [loadingDesc, setLoadingDesc] = useState(false)
    const [selectedJobUrls, setSelectedJobUrls] = useState([])
    const [filters, setFilters] = useState({})
    const [activeFilterColumn, setActiveFilterColumn] = useState(null)
    const [showImportModal, setShowImportModal] = useState(false)
    const [importing, setImporting] = useState(false)
    const [importProgress, setImportProgress] = useState({ current: 0, total: 0, message: '' })

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

    // Fetch applied jobs
    useEffect(() => {
        fetchAppliedJobs()
    }, [])

    const fetchAppliedJobs = async () => {
        setLoading(true)
        try {
            const res = await api.get('/jobs')
            const appliedJobs = res.data.filter(j => j.my_status === 'APPLIED')
            const rejected = res.data.filter(j => j.my_status === 'REJECTED')
            setJobs(appliedJobs)
            setRejectedCount(rejected.length)
        } catch (err) {
            console.error("Failed to fetch applied jobs", err)
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

    // Fetch description if missing
    useEffect(() => {
        if (selectedJob && !selectedJob.description && !loadingDesc) {
            fetchDescription(selectedJob)
        }
        setCopied(false)
    }, [selectedJob])

    const handleCopy = async () => {
        if (!selectedJob) return
        const text = `${selectedJob.title}\n\n${selectedJob.description || ''}`
        try {
            await navigator.clipboard.writeText(text)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error('Failed to copy:', err)
        }
    }

    const handleCopyLink = async () => {
        if (!selectedJob) return
        try {
            await navigator.clipboard.writeText(selectedJob.job_url)
            setLinkCopied(true)
            setTimeout(() => setLinkCopied(false), 2000)
        } catch (err) {
            console.error('Failed to copy link:', err)
        }
    }

    const handleCopyMarkdown = async () => {
        if (!selectedJob) return
        const text = `[${selectedJob.title}](${selectedJob.job_url})`
        try {
            await navigator.clipboard.writeText(text)
            setMdCopied(true)
            setTimeout(() => setMdCopied(false), 2000)
        } catch (err) {
            console.error('Failed to copy markdown:', err)
        }
    }

    const fetchDescription = async (job) => {
        setLoadingDesc(true)
        try {
            const res = await api.post('/jobs/fetch_desc', { url: job.job_url })
            const desc = res.data.description
            const updated = { ...job, description: desc }
            setSelectedJob(updated)

            // Update local list
            setJobs(jobs.map(j => j.job_url === job.job_url ? updated : j))

            if (onJobUpdate) {
                onJobUpdate(updated)
            }
        } catch (err) {
            console.error("Failed to fetch description", err)
        } finally {
            setLoadingDesc(false)
        }
    }

    const handleUnapplyJob = async (job) => {
        try {
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
            console.error('Failed to unapply job:', err)
        }
    }

    const handleUnapplySelected = async () => {
        if (!window.confirm(`Are you sure you want to remove ${selectedJobUrls.length} jobs from the Applied list?`)) return

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

        } catch (err) {
            console.error('Failed to unapply selected jobs:', err)
            alert('Failed to unapply some jobs. Please try again.')
        }
    }

    const handleRejectJob = async (job) => {
        try {
            await api.post('/jobs/update', {
                url: job.job_url,
                status: 'REJECTED'
            })
            // Remove from local list
            setJobs(jobs.filter(j => j.job_url !== job.job_url))
            setRejectedCount(prev => prev + 1)
            if (onJobUpdate) {
                onJobUpdate({ ...job, my_status: 'REJECTED' })
            }
        } catch (err) {
            console.error('Failed to reject job:', err)
        }
    }

    const handleRejectSelected = async () => {
        if (!window.confirm(`Are you sure you want to reject ${selectedJobUrls.length} jobs?`)) return

        try {
            await Promise.all(selectedJobUrls.map(async (url) => {
                await api.post('/jobs/update', {
                    url: url,
                    status: 'REJECTED'
                })
                // Find existing job to notify parent
                const job = jobs.find(j => j.job_url === url)
                if (job && onJobUpdate) {
                    onJobUpdate({ ...job, my_status: 'REJECTED' })
                }
            }))

            // Remove from local list
            setJobs(jobs.filter(j => !selectedJobUrls.includes(j.job_url)))
            setRejectedCount(prev => prev + selectedJobUrls.length)
            setSelectedJobUrls([])
            alert(`Successfully rejected ${selectedJobUrls.length} jobs.`)

        } catch (err) {
            console.error('Failed to reject selected jobs:', err)
            alert('Failed to reject some jobs. Please try again.')
        }
    }

    const handleImportExcel = async (file) => {
        if (!file) return

        setImporting(true)
        setImportProgress({ current: 0, total: 0, message: 'Reading file...' })

        try {
            // Dynamically import xlsx
            const XLSX = await import('xlsx')

            // Read the file
            const data = await file.arrayBuffer()
            const workbook = XLSX.read(data, { type: 'array' })

            // Get first sheet
            const sheetName = workbook.SheetNames[0]
            const worksheet = workbook.Sheets[sheetName]

            // Convert to JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet)

            if (jsonData.length === 0) {
                alert('No data found in Excel file')
                setImporting(false)
                return
            }

            setImportProgress({ current: 0, total: jsonData.length, message: `Importing ${jsonData.length} jobs...` })

            // Transform Excel data to job format and import
            let successCount = 0
            let failCount = 0

            for (let i = 0; i < jsonData.length; i++) {
                const row = jsonData[i]

                try {
                    // Map Excel columns to job object
                    const jobData = {
                        site: row.Site || row.site || 'imported',
                        title: row.Title || row.title || 'N/A',
                        company: row.Company || row.company || 'N/A',
                        location: row.Location || row.location || '',
                        city: row.City || row.city || '',
                        state: row.State || row.state || '',
                        job_type: row['Job Type'] || row.job_type || '',
                        interval: row.Interval || row.interval || '',
                        min_amount: row['Min Salary'] || row.min_amount || null,
                        max_amount: row['Max Salary'] || row.max_amount || null,
                        job_url: row['Job URL'] || row.job_url || row.URL || `imported_${Date.now()}_${i}`,
                        description: row.Description || row.description || '',
                        date_posted: row['Date Posted'] || row.date_posted || new Date().toISOString().split('T')[0],
                        source: 'Imported from Excel',
                        my_status: 'APPLIED',
                        added_date: new Date().toISOString()
                    }

                    // Import to backend
                    await api.post('/jobs/import', { jobs: [jobData] })
                    successCount++

                } catch (err) {
                    console.error(`Failed to import row ${i + 1}:`, err)
                    failCount++
                }

                setImportProgress({
                    current: i + 1,
                    total: jsonData.length,
                    message: `Imported ${successCount} of ${jsonData.length} jobs...`
                })
            }

            // Refresh the jobs list
            await fetchAppliedJobs()

            // Show summary
            alert(`Import complete!\n\nSuccessfully imported: ${successCount}\nFailed: ${failCount}`)
            setShowImportModal(false)

        } catch (err) {
            console.error('Failed to import Excel:', err)
            alert('Failed to import Excel file. Please check the file format and try again.')
        } finally {
            setImporting(false)
            setImportProgress({ current: 0, total: 0, message: '' })
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

    const toggleFilter = (columnKey, value) => {
        setFilters(prev => {
            const current = prev[columnKey]
            const safeCurrent = current || []
            const updated = safeCurrent.includes(value)
                ? safeCurrent.filter(v => v !== value)
                : [...safeCurrent, value]
            return { ...prev, [columnKey]: updated }
        })
    }

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
                    <Loader2 size={48} className="animate-spin text-blue-600" />
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
                        title="Back to Dashboard"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-xl font-bold text-slate-900">
                        Applied Jobs ({jobs.length})
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    {selectedJobUrls.length > 0 && (
                        <>
                            <button
                                onClick={handleUnapplySelected}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-red-700 rounded-md hover:bg-red-700 transition-colors shadow-sm"
                            >
                                <XCircle size={16} />
                                Unapply Selected ({selectedJobUrls.length})
                            </button>
                            <button
                                onClick={handleRejectSelected}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-red-700 rounded-md hover:bg-red-700 transition-colors shadow-sm"
                            >
                                <Ban size={16} />
                                Reject Selected ({selectedJobUrls.length})
                            </button>
                            <button
                                onClick={() => {
                                    selectedJobUrls.forEach(url => window.open(url, '_blank'))
                                }}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-indigo-700 rounded-md hover:bg-indigo-700 transition-colors shadow-sm"
                            >
                                <ExternalLink size={16} />
                                Open Selected ({selectedJobUrls.length})
                            </button>
                        </>
                    )}
                    <button
                        onClick={() => setShowImportModal(true)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-600 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 transition-colors shadow-sm"
                        title="Import jobs from Excel file"
                    >
                        <Upload size={16} />
                        Import Excel
                    </button>
                    <button
                        onClick={() => window.location.hash = 'rejected-jobs'}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100 transition-colors shadow-sm"
                        title="View Rejected Jobs"
                    >
                        <Ban size={16} className="text-red-500" />
                        Rejected Jobs
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
            </header>

            <main className="p-6 max-w-[1600px] mx-auto">
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="text-slate-500 text-sm font-medium">Total Applied</div>
                        <div className="text-2xl font-bold mt-1 text-blue-600">{jobs.length}</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="text-slate-500 text-sm font-medium">Selected</div>
                        <div className="text-2xl font-bold mt-1 text-indigo-600">{selectedJobUrls.length}</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="text-slate-500 text-sm font-medium">Rejected</div>
                        <div className="text-2xl font-bold mt-1 text-red-600">{rejectedCount}</div>
                    </div>
                </div>

                {/* Jobs Table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    {jobs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                            <p>No applied jobs yet.</p>
                            <p className="text-sm mt-2">Mark jobs as applied to see them here.</p>
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

                                            const isFiltering = !!filters[col.key]
                                            return (
                                                <th key={col.key} className="px-6 py-4 relative group">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span>{col.label}</span>
                                                        <div className="relative column-filter-container">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    setActiveFilterColumn(activeFilterColumn === col.key ? null : col.key)
                                                                }}
                                                                className={`p-1 rounded hover:bg-slate-200 transition-colors ${activeFilterColumn === col.key || isFiltering
                                                                    ? 'text-blue-600 bg-slate-100'
                                                                    : 'text-slate-300 opacity-0 group-hover:opacity-100'
                                                                    }`}
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                                                            </button>

                                                            {activeFilterColumn === col.key && (
                                                                <ColumnFilter
                                                                    column={col}
                                                                    jobs={jobs}
                                                                    initialFilter={filters[col.key]}
                                                                    onApply={(val) => setColumnFilter(col.key, val)}
                                                                    onClear={() => clearColumnFilter(col.key)}
                                                                    onClose={() => setActiveFilterColumn(null)}
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
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
                                                onClick={() => setSelectedJob(job)}
                                                className="hover:bg-slate-50 transition-colors group cursor-pointer"
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
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    onChange={(e) => {
                                                                        if (e.target.checked) {
                                                                            setSelectedJobUrls([...selectedJobUrls, job.job_url])
                                                                        } else {
                                                                            setSelectedJobUrls(selectedJobUrls.filter(url => url !== job.job_url))
                                                                        }
                                                                    }}
                                                                />
                                                            ) : col.key === 'title' ? (
                                                                <div className="truncate" title={job.title}>{rawVal}</div>
                                                            ) : (
                                                                rawVal
                                                            )}
                                                        </td>
                                                    )
                                                })}
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            title={isJobSaved(job) ? "Unsave Job" : "Save Job"}
                                                            className={`p-1 hover:bg-slate-200 rounded ${isJobSaved(job) ? 'text-indigo-600' : 'text-slate-400'}`}
                                                            onClick={(e) => { e.stopPropagation(); onToggleSave && onToggleSave(job) }}
                                                        >
                                                            <Bookmark size={16} fill={isJobSaved(job) ? "currentColor" : "none"} />
                                                        </button>
                                                        <button
                                                            title="Open Link"
                                                            className="p-1 hover:bg-slate-200 rounded text-blue-600"
                                                            onClick={(e) => { e.stopPropagation(); window.open(job.job_url, '_blank') }}
                                                        >
                                                            <ExternalLink size={16} />
                                                        </button>
                                                        <button
                                                            title="Remind Me"
                                                            className="p-1 hover:bg-slate-200 rounded text-amber-500"
                                                            onClick={(e) => { e.stopPropagation(); setReminderJob(job) }}
                                                        >
                                                            <Bell size={16} />
                                                        </button>
                                                        <button
                                                            title="Unapply Job"
                                                            className="p-1 hover:bg-slate-200 rounded text-red-600"
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                if (window.confirm('Remove this job from Applied list?')) {
                                                                    handleUnapplyJob(job)
                                                                }
                                                            }}
                                                        >
                                                            <XCircle size={16} />
                                                        </button>
                                                        <button
                                                            title="Reject Job"
                                                            className="p-1 hover:bg-slate-200 rounded text-red-600"
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                if (window.confirm('Mark this job as REJECTED?')) {
                                                                    handleRejectJob(job)
                                                                }
                                                            }}
                                                        >
                                                            <Ban size={16} />
                                                        </button>
                                                        <button
                                                            title="Hide"
                                                            className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600"
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                try {
                                                                    await api.post('/jobs/update', {
                                                                        url: job.job_url,
                                                                        status: 'HIDDEN'
                                                                    })
                                                                    // Remove from local list
                                                                    setJobs(jobs.filter(j => j.job_url !== job.job_url))
                                                                    if (onJobUpdate) {
                                                                        onJobUpdate({ ...job, my_status: 'HIDDEN' })
                                                                    }
                                                                } catch (err) {
                                                                    console.error('Failed to hide job:', err)
                                                                }
                                                            }}
                                                        >
                                                            <EyeOff size={16} />
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

            {/* Job Details Modal */}
            {selectedJob && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                    <div
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                        onClick={() => setSelectedJob(null)}
                    />
                    <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="flex items-start justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                            <div className="pr-12">
                                <h2 className="text-2xl font-bold text-slate-900 leading-tight">{selectedJob.title}</h2>
                                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-600">
                                    <span className="font-medium text-slate-900 text-base">{selectedJob.company}</span>
                                    <span>•</span>
                                    <span>{selectedJob.location || selectedJob.city}</span>
                                    {selectedJob.date_posted && (
                                        <>
                                            <span>•</span>
                                            <span>{selectedJob.date_posted}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedJob(null)}
                                className="absolute right-4 top-4 p-2 rounded-full bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors border border-slate-200 shadow-sm"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 text-slate-700 leading-relaxed scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                            {/* Tags */}
                            <div className="flex flex-wrap gap-2 mb-8">
                                {selectedJob.job_type && (
                                    <span className="px-3 py-1 text-xs font-semibold bg-blue-50 text-blue-700 rounded-full border border-blue-100">
                                        {selectedJob.job_type}
                                    </span>
                                )}
                                {(selectedJob.min_amount || selectedJob.max_amount) && (
                                    <span className="px-3 py-1 text-xs font-semibold bg-green-50 text-green-700 rounded-full border border-green-100">
                                        {selectedJob.min_amount ? `$${selectedJob.min_amount}` : ''}
                                        {selectedJob.min_amount && selectedJob.max_amount ? ' - ' : ''}
                                        {selectedJob.max_amount ? `$${selectedJob.max_amount}` : ''}
                                    </span>
                                )}
                                <span className="px-3 py-1 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full capitalize border border-blue-200">
                                    APPLIED
                                </span>
                            </div>

                            <div className="prose prose-slate max-w-none">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm uppercase tracking-wider font-bold text-slate-400 m-0">Description</h3>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleCopyLink}
                                            className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all font-medium"
                                            title="Copy Job URL"
                                        >
                                            {linkCopied ? <Check size={14} className="text-green-600" /> : <Link size={14} />}
                                            {linkCopied ? <span className="text-green-600">Copied</span> : "Link"}
                                        </button>
                                        <button
                                            onClick={handleCopyMarkdown}
                                            className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all font-medium"
                                            title="Copy Markdown Link"
                                        >
                                            {mdCopied ? <Check size={14} className="text-green-600" /> : <FileText size={14} />}
                                            {mdCopied ? <span className="text-green-600">Copied</span> : "Markdown"}
                                        </button>
                                        <button
                                            onClick={handleCopy}
                                            className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all font-medium"
                                            title="Copy Title & Description"
                                        >
                                            {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                                            {copied ? <span className="text-green-600">Copied</span> : "Copy Info"}
                                        </button>
                                    </div>
                                </div>
                                <div className="whitespace-pre-wrap font-sans text-base text-slate-800">
                                    {loadingDesc ? (
                                        <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                                            <Loader2 size={32} className="animate-spin text-blue-500" />
                                            <p>Fetching detailed description...</p>
                                        </div>
                                    ) : (
                                        selectedJob.description || (
                                            <div className="py-8 text-center text-slate-400 italic bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                                No detailed description available for this job.
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50/80 flex justify-between items-center gap-4">
                            <div className="text-xs text-slate-400 font-medium hidden sm:block">
                                Job ID: {selectedJob.id || 'N/A'} • Applied
                            </div>
                            <div className="flex gap-3 ml-auto">
                                <button
                                    onClick={() => setSelectedJob(null)}
                                    className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                                >
                                    Close
                                </button>
                                <button
                                    onClick={() => setReminderJob(selectedJob)}
                                    className="px-5 py-2.5 text-sm font-medium text-amber-600 bg-amber-50 border border-amber-100 rounded-xl hover:bg-amber-100 transition-colors shadow-sm flex items-center gap-2"
                                >
                                    <Bell size={16} />
                                    Remind Me
                                </button>
                                <button
                                    onClick={async () => {
                                        if (window.confirm('Remove this job from Applied list?')) {
                                            await handleUnapplyJob(selectedJob)
                                            setSelectedJob(null)
                                        }
                                    }}
                                    className="px-5 py-2.5 text-sm font-medium text-white bg-red-600 border border-transparent rounded-xl hover:bg-red-700 transition-colors flex items-center gap-2 shadow-lg shadow-red-600/20"
                                >
                                    <XCircle size={16} />
                                    Unapply Job
                                </button>
                                <a
                                    href={selectedJob.job_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg shadow-blue-600/20"
                                >
                                    View Original <ExternalLink size={16} />
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {reminderJob && (
                <ReminderModal job={reminderJob} onClose={() => setReminderJob(null)} />
            )}

            {/* Import Excel Modal */}
            {showImportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        onClick={() => !importing && setShowImportModal(false)}
                    />
                    <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-green-50/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-100 rounded-lg">
                                    <Upload size={24} className="text-green-600" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900">Import Jobs from Excel</h2>
                                    <p className="text-sm text-slate-600 mt-1">Upload an Excel file to import jobs</p>
                                </div>
                            </div>
                            {!importing && (
                                <button
                                    onClick={() => setShowImportModal(false)}
                                    className="p-2 rounded-lg hover:bg-slate-200 text-slate-600"
                                >
                                    <X size={20} />
                                </button>
                            )}
                        </div>

                        {/* Content */}
                        <div className="p-6">
                            {importing ? (
                                // Progress View
                                <div className="py-12 text-center">
                                    <Loader2 size={48} className="animate-spin text-green-600 mx-auto mb-4" />
                                    <p className="text-lg font-medium text-slate-900 mb-2">{importProgress.message}</p>
                                    {importProgress.total > 0 && (
                                        <>
                                            <div className="w-full max-w-md mx-auto bg-slate-200 rounded-full h-3 overflow-hidden mt-4">
                                                <div
                                                    className="bg-green-600 h-full transition-all duration-300 rounded-full"
                                                    style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                                                />
                                            </div>
                                            <p className="text-sm text-slate-600 mt-2">
                                                {importProgress.current} of {importProgress.total} jobs processed
                                            </p>
                                        </>
                                    )}
                                </div>
                            ) : (
                                // Upload View
                                <>
                                    <div className="mb-6">
                                        <label
                                            htmlFor="excel-upload"
                                            className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-slate-300 rounded-xl hover:border-green-500 hover:bg-green-50 transition-colors cursor-pointer group"
                                        >
                                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                <Upload size={48} className="text-slate-400 group-hover:text-green-600 mb-3 transition-colors" />
                                                <p className="mb-2 text-sm text-slate-600">
                                                    <span className="font-semibold">Click to upload</span> or drag and drop
                                                </p>
                                                <p className="text-xs text-slate-500">Excel files (.xlsx, .xls)</p>
                                            </div>
                                            <input
                                                id="excel-upload"
                                                type="file"
                                                className="hidden"
                                                accept=".xlsx,.xls"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0]
                                                    if (file) {
                                                        handleImportExcel(file)
                                                    }
                                                }}
                                            />
                                        </label>
                                    </div>

                                    {/* Instructions */}
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <h3 className="text-sm font-semibold text-blue-900 mb-2">📋 Excel Format Requirements:</h3>
                                        <ul className="text-xs text-blue-800 space-y-1 ml-4">
                                            <li>• <strong>Required columns:</strong> Title, Company, Job URL</li>
                                            <li>• <strong>Optional columns:</strong> Location, City, State, Job Type, Min Salary, Max Salary, Date Posted, Description</li>
                                            <li>• Column names are case-insensitive</li>
                                            <li>• All imported jobs will be marked as "APPLIED"</li>
                                        </ul>
                                    </div>

                                    {/* Example */}
                                    <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-4">
                                        <h3 className="text-sm font-semibold text-slate-900 mb-2">📊 Example Excel Structure:</h3>
                                        <div className="overflow-x-auto">
                                            <table className="text-xs w-full border-collapse">
                                                <thead>
                                                    <tr className="bg-slate-200">
                                                        <th className="border border-slate-300 px-2 py-1">Title</th>
                                                        <th className="border border-slate-300 px-2 py-1">Company</th>
                                                        <th className="border border-slate-300 px-2 py-1">Location</th>
                                                        <th className="border border-slate-300 px-2 py-1">Job URL</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr>
                                                        <td className="border border-slate-300 px-2 py-1">Software Engineer</td>
                                                        <td className="border border-slate-300 px-2 py-1">Tech Corp</td>
                                                        <td className="border border-slate-300 px-2 py-1">New York, NY</td>
                                                        <td className="border border-slate-300 px-2 py-1">https://example.com/job1</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Footer */}
                        {!importing && (
                            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
                                <button
                                    onClick={() => setShowImportModal(false)}
                                    className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

const ColumnFilter = ({ column, jobs, initialFilter, onApply, onClear, onClose }) => {
    const uniqueValues = useMemo(() => Array.from(new Set(jobs.map(j => column.getValue(j)))).sort(), [jobs, column])
    const [searchTerm, setSearchTerm] = useState('')
    const [tempFilter, setTempFilter] = useState(initialFilter)

    const displayValues = uniqueValues.filter(v =>
        String(v).toLowerCase().includes(searchTerm.toLowerCase())
    )

    const isAllSelected = tempFilter === undefined

    const isSelected = (val) => {
        if (isAllSelected) return true
        return tempFilter && tempFilter.includes(val)
    }

    const handleCheckboxChange = (val) => {
        if (isAllSelected) {
            const allOthers = uniqueValues.filter(v => v !== val)
            setTempFilter(allOthers)
        } else {
            const current = tempFilter || []
            const updated = current.includes(val)
                ? current.filter(v => v !== val)
                : [...current, val]
            setTempFilter(updated)
        }
    }

    const handleSelectAll = (select) => {
        if (select) {
            setTempFilter(undefined)
        } else {
            setTempFilter([])
        }
    }

    const areAllVisibleSelected = displayValues.every(val => isSelected(val))
    const isIndeterminate = !areAllVisibleSelected && displayValues.some(val => isSelected(val))

    const applyFilter = () => {
        onApply(tempFilter)
        onClose()
    }

    const clearFilter = () => {
        onClear()
        onClose()
    }

    return (
        <div className="absolute top-full mt-2 left-0 w-64 bg-white rounded-lg shadow-xl border border-slate-200 z-[100] flex flex-col text-sm animate-in fade-in zoom-in-95 duration-100">
            <div className="p-3 border-b border-slate-100">
                <input
                    type="text"
                    placeholder="Search..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-700"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    autoFocus
                />
            </div>

            <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                <label className="flex items-center px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer">
                    <input
                        type="checkbox"
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 mr-2"
                        checked={areAllVisibleSelected}
                        ref={input => { if (input) input.indeterminate = isIndeterminate }}
                        onChange={(e) => {
                            if (searchTerm) {
                                const visibleValues = displayValues
                                if (e.target.checked) {
                                    let base = isAllSelected ? [...uniqueValues] : (tempFilter ? [...tempFilter] : [])
                                    visibleValues.forEach(v => {
                                        if (!base.includes(v)) base.push(v)
                                    })
                                    if (base.length === uniqueValues.length) {
                                        setTempFilter(undefined)
                                    } else {
                                        setTempFilter(base)
                                    }
                                } else {
                                    let base = isAllSelected ? [...uniqueValues] : (tempFilter ? [...tempFilter] : [])
                                    base = base.filter(v => !visibleValues.includes(v))
                                    setTempFilter(base)
                                }
                            } else {
                                handleSelectAll(e.target.checked)
                            }
                        }}
                    />
                    <span className="text-slate-900 font-medium">(Select All)</span>
                </label>

                {displayValues.map((val, idx) => (
                    <label key={idx} className="flex items-center px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer">
                        <input
                            type="checkbox"
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 mr-2"
                            checked={isSelected(val)}
                            onChange={() => handleCheckboxChange(val)}
                        />
                        <span className="text-slate-700 truncate block" title={val}>{val}</span>
                    </label>
                ))}

                {displayValues.length === 0 && (
                    <div className="px-2 py-4 text-center text-slate-400 italic">No matches</div>
                )}
            </div>

            <div className="p-3 border-t border-slate-100 flex items-center justify-between bg-slate-50 rounded-b-lg">
                <button
                    onClick={clearFilter}
                    className="text-xs text-slate-500 hover:text-slate-800 font-medium px-2 py-1 rounded hover:bg-slate-200 transition-colors"
                >
                    Clear
                </button>
                <button
                    onClick={applyFilter}
                    className="text-xs text-white bg-blue-600 hover:bg-blue-700 font-medium px-4 py-1.5 rounded transition-colors shadow-sm"
                >
                    Apply Filter
                </button>
            </div>
        </div>
    )
}
