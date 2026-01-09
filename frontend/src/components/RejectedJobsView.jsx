import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { ExternalLink, X, Loader2, Bookmark, Bell, XCircle, ArrowLeft, RotateCcw, Upload, Download } from 'lucide-react'
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
                        my_status: 'REJECTED',
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
            await fetchRejectedJobs()

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

    const handleExportExcel = async () => {
        try {
            const XLSX = await import('xlsx')

            // Prepare data for export
            const exportData = filteredJobs.map(job => ({
                Title: job.title,
                Company: job.company,
                Location: job.location || job.city || '',
                Salary: (job.min_amount && job.max_amount) ? `${job.min_amount} - ${job.max_amount}` : 'N/A',
                Posted: job.date_posted,
                Status: job.my_status,
                URL: job.job_url,
                Description: job.description ? job.description.substring(0, 32000) : ''
            }))

            const worksheet = XLSX.utils.json_to_sheet(exportData)
            const workbook = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(workbook, worksheet, "Rejected Jobs")

            // Generate filename based on date
            const dateStr = new Date().toISOString().split('T')[0]
            XLSX.writeFile(workbook, `rejected_jobs_${dateStr}.xlsx`)

        } catch (err) {
            console.error('Failed to export Excel:', err)
            alert('Failed to export to Excel.')
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
                        onClick={() => setShowImportModal(true)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-600 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 transition-colors shadow-sm"
                        title="Import jobs from Excel file"
                    >
                        <Upload size={16} />
                        Import Excel
                    </button>
                    <button
                        onClick={handleExportExcel}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors shadow-sm"
                        title="Export current jobs to Excel"
                    >
                        <Download size={16} />
                        Export Excel
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

            {/* Import Modal */}
            {showImportModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
                    <div
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                        onClick={() => !importing && setShowImportModal(false)}
                    />
                    <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                        <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Upload size={20} className="text-blue-600" />
                                Import from Excel
                            </h2>
                            {!importing && (
                                <button
                                    onClick={() => setShowImportModal(false)}
                                    className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            )}
                        </div>

                        <div className="p-6 space-y-6">
                            {importing ? (
                                <div className="text-center py-8">
                                    <Loader2 size={48} className="animate-spin text-blue-600 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-slate-900 mb-2">Importing Jobs...</h3>
                                    <p className="text-slate-500 mb-4">{importProgress.message}</p>
                                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                        <div
                                            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                                            style={{ width: `${(importProgress.current / Math.max(importProgress.total, 1)) * 100}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-slate-400 mt-2">
                                        {importProgress.current} / {importProgress.total}
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-8 hover:bg-slate-50 transition-colors group cursor-pointer"
                                        onClick={() => document.getElementById('excel-upload-rejected')?.click()}
                                    >
                                        <label htmlFor="excel-upload-rejected" className="cursor-pointer w-full h-full flex flex-col items-center">
                                            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                                <Upload size={32} />
                                            </div>
                                            <div className="text-center">
                                                <p className="mb-2 text-sm text-slate-600">
                                                    <span className="font-semibold">Click to upload</span> or drag and drop
                                                </p>
                                                <p className="text-xs text-slate-500">Excel files (.xlsx, .xls)</p>
                                            </div>
                                            <input
                                                id="excel-upload-rejected"
                                                type="file"
                                                className="hidden"
                                                accept=".xlsx,.xls"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0]
                                                    if (file) {
                                                        handleImportExcel(file)
                                                        // Reset value to allow re-uploading same file
                                                        e.target.value = ''
                                                    }
                                                }}
                                            />
                                        </label>
                                    </div>

                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <h3 className="text-sm font-semibold text-blue-900 mb-2">📋 Excel Format Requirements:</h3>
                                        <ul className="text-xs text-blue-800 space-y-1 ml-4">
                                            <li>• <strong>Required columns:</strong> Title, Company, Job URL</li>
                                            <li>• <strong>Optional columns:</strong> Location, City, State, Job Type, Min Salary, Max Salary, Date Posted, Description</li>
                                            <li>• All imported jobs will be marked as "REJECTED"</li>
                                        </ul>
                                    </div>
                                </>
                            )}
                        </div>

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
