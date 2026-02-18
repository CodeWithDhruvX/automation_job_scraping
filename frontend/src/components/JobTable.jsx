import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { ExternalLink, CheckCircle, EyeOff, X, Loader2, Bookmark, Copy, Check, Bell, Link, FileText, XCircle, Trash2, Search, Ban, UserCheck, MessageSquare, ArrowDown, ArrowUp } from 'lucide-react'
import { ReminderModal } from './ReminderModal'

import { ManualAddJobModal } from './ManualAddJobModal'

const api = axios.create({
    baseURL: 'http://localhost:8000/api'
})

export function JobTable({ jobs, onJobUpdate, savedJobs = [], onToggleSave, onFilteredData, selectedJobUrls = [], onSelectionChange, onDeleteJob }) {
    const [selectedJob, setSelectedJob] = useState(null)
    const [reminderJob, setReminderJob] = useState(null)
    const [isAddJobOpen, setIsAddJobOpen] = useState(false)
    const [copied, setCopied] = useState(false)
    const [linkCopied, setLinkCopied] = useState(false)
    const [mdCopied, setMdCopied] = useState(false)
    const [promptCopied, setPromptCopied] = useState(false)
    const [loadingDesc, setLoadingDesc] = useState(false)
    const [filters, setFilters] = useState({})
    const [activeFilterColumn, setActiveFilterColumn] = useState(null)
    const [globalSearchTerm, setGlobalSearchTerm] = useState('')
    const [sortColumn, setSortColumn] = useState(null)
    const [sortDirection, setSortDirection] = useState('asc') // 'asc' or 'desc'

    // Column Definitions for consistency between display and filtering
    // Column Definitions for consistency between display and filtering
    const COLUMN_DEFS = useMemo(() => [
        {
            key: 'select',
            label: '',
            getValue: j => j.job_url,
            className: "w-10 text-center px-2",
            isSelect: true,
            sortable: false
        },
        { key: 'title', label: 'Title', getValue: j => j.title || 'N/A', className: "font-semibold text-slate-900 dark:text-slate-100 max-w-md truncate", sortable: true },
        { key: 'company', label: 'Company', getValue: j => j.company || 'N/A', className: "text-slate-600 dark:text-slate-400", sortable: true },
        { key: 'location', label: 'Location', getValue: j => j.location || j.city || 'N/A', className: "text-slate-500 dark:text-slate-400", sortable: true },
        { key: 'salary', label: 'Salary', getValue: j => (j.min_amount && j.max_amount ? `$${j.min_amount} - $${j.max_amount}` : 'N/A'), getRawValue: j => j.min_amount || 0, className: "text-slate-500 dark:text-slate-400", sortable: true },
        { key: 'date_posted', label: 'Posted', getValue: j => j.date_posted || 'Recently', className: "text-slate-500 dark:text-slate-400", sortable: true },
        { key: 'date_modified', label: 'Modified', getValue: j => j.status_updated_at ? new Date(j.status_updated_at).toLocaleDateString() : 'N/A', getRawValue: j => j.status_updated_at || j.added_date || '', className: "text-slate-500 dark:text-slate-400", sortable: true },
        { key: 'status', label: 'Status', getValue: j => j.my_status || 'NEW', sortable: true },
    ], [])

    const isJobSaved = (job) => {
        return savedJobs.some(s => s.job_url === job.job_url)
    }

    // Close modal on escape key
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') setSelectedJob(null)
        }
        window.addEventListener('keydown', handleEsc)
        return () => window.removeEventListener('keydown', handleEsc)
    }, [])

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

    const handleCopyInterviewPrompt = async () => {
        if (!selectedJob) return
        const preamble = "Here is a job description. Please help me prepare for an interview for this role, focusing on key skills and potential questions.\n\n"
        const text = `${preamble}Title: ${selectedJob.title}\nCompany: ${selectedJob.company}\n\n${selectedJob.description || ''}`
        try {
            await navigator.clipboard.writeText(text)
            setPromptCopied(true)
            setTimeout(() => setPromptCopied(false), 2000)
        } catch (err) {
            console.error('Failed to copy interview prompt:', err)
        }
    }

    const fetchDescription = async (job) => {
        setLoadingDesc(true)
        try {
            const res = await api.post('/jobs/fetch_desc', { url: job.job_url })
            const desc = res.data.description

            // Update local selected job
            const updated = { ...job, description: desc }
            setSelectedJob(updated)

            // Update parent list so we don't fetch again
            if (onJobUpdate) {
                onJobUpdate(updated)
            }
        } catch (err) {
            console.error("Failed to fetch description", err)
            // Optional: Mark as "failed" so we don't retry?
            // setSelectedJob({ ...job, description: "Failed to load description." })
        } finally {
            setLoadingDesc(false)
        }
    }

    // Apply filters
    // Apply filters
    // Apply filters
    const filteredJobs = useMemo(() => {
        let result = jobs.filter(job => {
            // Global Search Filter
            if (globalSearchTerm) {
                const term = globalSearchTerm.toLowerCase()

                // Fields to search in
                const searchableFields = [
                    job.title,
                    job.company,
                    job.location,
                    job.site,
                    job.job_type,
                    job.my_status,
                    job.description // Optional: Search description too? Might be slow if large text, but useful.
                ]

                const matchesSearch = searchableFields.some(field =>
                    field && String(field).toLowerCase().includes(term)
                )

                if (!matchesSearch) return false
            }

            // Column Filters
            return COLUMN_DEFS.every(col => {
                const selectedValues = filters[col.key]
                if (selectedValues === undefined) return true
                if (selectedValues.length === 0) return false
                const value = col.getValue(job)
                return selectedValues.includes(value)
            })
        })

        // Apply sorting
        if (sortColumn) {
            const column = COLUMN_DEFS.find(col => col.key === sortColumn)
            if (column) {
                result = [...result].sort((a, b) => {
                    // Use getRawValue if available, otherwise getValue
                    const aVal = column.getRawValue ? column.getRawValue(a) : column.getValue(a)
                    const bVal = column.getRawValue ? column.getRawValue(b) : column.getValue(b)

                    // Handle N/A and empty values
                    if (aVal === 'N/A' && bVal !== 'N/A') return 1
                    if (aVal !== 'N/A' && bVal === 'N/A') return -1
                    if (aVal === 'N/A' && bVal === 'N/A') return 0

                    // For dates and numbers
                    if (column.key === 'date_modified' || column.key === 'salary') {
                        const aNum = column.key === 'date_modified' ? new Date(aVal).getTime() : parseFloat(aVal) || 0
                        const bNum = column.key === 'date_modified' ? new Date(bVal).getTime() : parseFloat(bVal) || 0
                        return sortDirection === 'asc' ? aNum - bNum : bNum - aNum
                    }

                    // For strings
                    const comparison = String(aVal).localeCompare(String(bVal))
                    return sortDirection === 'asc' ? comparison : -comparison
                })
            }
        }

        return result
    }, [jobs, filters, COLUMN_DEFS, globalSearchTerm, sortColumn, sortDirection])

    // Notify parent of filtered data
    useEffect(() => {
        if (onFilteredData) {
            onFilteredData(filteredJobs)
        }
    }, [filteredJobs, onFilteredData])

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

    if (!jobs.length) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <p>No jobs found. Start a scrape!</p>
                <button
                    onClick={() => setIsAddJobOpen(true)}
                    className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-100"
                >
                    + Add Job Manually
                </button>
                {isAddJobOpen && (
                    <ManualAddJobModal
                        onClose={() => setIsAddJobOpen(false)}
                        onJobAdded={() => {
                            // Ideally, we trigger a refresh here. Since 'jobs' prop is passed down,
                            // we rely on the parent or we could have a callback 'onRefreshRequest'
                            // For now, let's just close it. The user might need to refresh manually 
                            // unless onJobUpdate handles adding?
                            // Actually, adding requires refetching the whole list typically.
                            window.location.reload()
                        }}
                    />
                )}
            </div>
        )
    }

    return (
        <>
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center gap-4 transition-colors">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={20} />
                    <input
                        type="text"
                        placeholder="Search jobs..."
                        className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 transition-all outline-none"
                        value={globalSearchTerm}
                        onChange={(e) => setGlobalSearchTerm(e.target.value)}
                    />
                    {globalSearchTerm && (
                        <button
                            onClick={() => setGlobalSearchTerm('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
                <button
                    onClick={() => setReminderJob({ isCustom: true })}
                    className="ml-auto mr-2 px-3 py-2.5 text-sm font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl transition-all shadow-sm flex items-center gap-2"
                    title="Set Custom Reminder"
                >
                    <Bell size={18} />
                </button>
                <button
                    onClick={() => setIsAddJobOpen(true)}
                    className="px-4 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl transition-all shadow-md shadow-blue-600/20 flex items-center gap-2"
                >
                    <span className="text-lg leading-none">+</span> Add Job
                </button>
            </div>

            <div className="overflow-x-auto min-h-[400px]">
                <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300 relative">
                    <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 font-medium border-b border-slate-200 dark:border-slate-700">
                        <tr>
                            {COLUMN_DEFS.map((col) => {
                                if (col.key === 'select') {
                                    const allVisibleSelected = filteredJobs.length > 0 && filteredJobs.every(j => selectedJobUrls.includes(j.job_url))
                                    const isIndeterminate = filteredJobs.some(j => selectedJobUrls.includes(j.job_url)) && !allVisibleSelected

                                    return (
                                        <th key={col.key} className="px-6 py-4 w-10">
                                            <input
                                                type="checkbox"
                                                className="rounded border-slate-300 dark:border-slate-600 dark:bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                                                checked={allVisibleSelected}
                                                ref={input => { if (input) input.indeterminate = isIndeterminate }}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        // Select all visible
                                                        const visibleUrls = filteredJobs.map(j => j.job_url)
                                                        // Merge with existing selection to not lose others (or just set to visible? user might want cumulative?)
                                                        // If we are filtering, usually "Select All" means "Select all filtered matches"
                                                        // Let's merge unique
                                                        const newSelection = [...new Set([...selectedJobUrls, ...visibleUrls])]
                                                        onSelectionChange(newSelection)
                                                    } else {
                                                        // Deselect all visible
                                                        const visibleUrls = filteredJobs.map(j => j.job_url)
                                                        const newSelection = selectedJobUrls.filter(url => !visibleUrls.includes(url))
                                                        onSelectionChange(newSelection)
                                                    }
                                                }}
                                            />
                                        </th>
                                    )
                                }

                                const isFiltering = !!filters[col.key]
                                const isSorting = sortColumn === col.key
                                const isSortable = col.sortable !== false

                                return (
                                    <th key={col.key} className="px-6 py-4 relative group">
                                        <div className="flex items-center justify-between gap-2">
                                            <div
                                                className={`flex items-center gap-1.5 ${isSortable ? 'cursor-pointer hover:text-blue-600' : ''}`}
                                                onClick={() => {
                                                    if (isSortable) {
                                                        if (sortColumn === col.key) {
                                                            // Toggle direction
                                                            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
                                                        } else {
                                                            // Set new column
                                                            setSortColumn(col.key)
                                                            setSortDirection('asc')
                                                        }
                                                    }
                                                }}
                                            >
                                                <span>{col.label}</span>
                                                {isSortable && (
                                                    <div className="flex flex-col">
                                                        {isSorting ? (
                                                            sortDirection === 'asc' ? (
                                                                <ArrowUp size={14} className="text-blue-600" />
                                                            ) : (
                                                                <ArrowDown size={14} className="text-blue-600" />
                                                            )
                                                        ) : (
                                                            <div className="opacity-0 group-hover:opacity-40 transition-opacity">
                                                                <ArrowUp size={14} />
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="relative column-filter-container">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setActiveFilterColumn(activeFilterColumn === col.key ? null : col.key)
                                                    }}
                                                    className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ${activeFilterColumn === col.key || isFiltering
                                                        ? 'text-blue-600 bg-slate-100 dark:bg-slate-800'
                                                        : 'text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100'
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
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {filteredJobs.length === 0 ? (
                            <tr>
                                <td colSpan={COLUMN_DEFS.length + 1} className="text-center py-12 text-slate-400 dark:text-slate-500">
                                    No jobs match your filters.
                                </td>
                            </tr>
                        ) : (
                            filteredJobs.map((job, idx) => (
                                <tr
                                    key={idx}
                                    onClick={() => setSelectedJob(job)}
                                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer"
                                >
                                    {COLUMN_DEFS.map((col) => {
                                        const rawVal = col.getValue(job)
                                        return (
                                            <td key={col.key} className={`px-6 py-4 ${col.className || ''}`}>
                                                {col.key === 'select' ? (
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-slate-300 dark:border-slate-600 dark:bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                                                        checked={selectedJobUrls.includes(job.job_url)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                onSelectionChange([...selectedJobUrls, job.job_url])
                                                            } else {
                                                                onSelectionChange(selectedJobUrls.filter(url => url !== job.job_url))
                                                            }
                                                        }}
                                                    />
                                                ) : col.key === 'title' ? (
                                                    <div className="truncate" title={job.title}>{rawVal}</div>
                                                ) : col.key === 'status' ? (
                                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                                                        ${job.my_status === 'NEW' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : ''}
                                                        ${job.my_status === 'APPLIED' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : ''}
                                                        ${!job.my_status ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300' : ''}
                                                    `}>
                                                        {rawVal}
                                                    </span>
                                                ) : (
                                                    rawVal
                                                )}
                                            </td>
                                        )
                                    })}
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 transition-opacity">
                                            <button
                                                title={isJobSaved(job) ? "Unsave Job" : "Save Job"}
                                                className={`p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded ${isJobSaved(job) ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}
                                                onClick={(e) => { e.stopPropagation(); onToggleSave && onToggleSave(job) }}
                                            >
                                                <Bookmark size={16} fill={isJobSaved(job) ? "currentColor" : "none"} />
                                            </button>
                                            <button
                                                title="Open Link"
                                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-blue-600 dark:text-blue-400"
                                                onClick={(e) => { e.stopPropagation(); window.open(job.job_url, '_blank') }}
                                            >
                                                <ExternalLink size={16} />
                                            </button>
                                            <button
                                                title="Remind Me"
                                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-amber-500 dark:text-amber-400"
                                                onClick={(e) => { e.stopPropagation(); setReminderJob(job) }}
                                            >
                                                <Bell size={16} />
                                            </button>
                                            {job.my_status === 'APPLIED' ? (
                                                <button
                                                    title="Unapply Job"
                                                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-red-600 dark:text-red-400"
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        if (window.confirm('Mark this job as NOT applied?')) {
                                                            try {
                                                                await api.post('/jobs/update', {
                                                                    url: job.job_url,
                                                                    status: 'NEW'
                                                                })
                                                                if (onJobUpdate) {
                                                                    onJobUpdate({ ...job, my_status: 'NEW' })
                                                                }
                                                            } catch (err) {
                                                                console.error('Failed to unapply job:', err)
                                                            }
                                                        }
                                                    }}
                                                >
                                                    <XCircle size={16} />
                                                </button>
                                            ) : (
                                                <button
                                                    title="Mark Applied"
                                                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-green-600 dark:text-green-400"
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        try {
                                                            await api.post('/jobs/update', {
                                                                url: job.job_url,
                                                                status: 'APPLIED'
                                                            })
                                                            if (onJobUpdate) {
                                                                onJobUpdate({ ...job, my_status: 'APPLIED' })
                                                            }
                                                        } catch (err) {
                                                            console.error('Failed to mark as applied:', err)
                                                        }
                                                    }}
                                                >
                                                    <CheckCircle size={16} />
                                                </button>
                                            )}
                                            <button
                                                title="Hide"
                                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    try {
                                                        await api.post('/jobs/update', {
                                                            url: job.job_url,
                                                            status: 'HIDDEN'
                                                        })
                                                        if (onJobUpdate) {
                                                            // Optimistic ID removal or status update
                                                            // Ideally, valid statuses are NEW, APPLIED, REJECTED, HIDDEN
                                                            onJobUpdate({ ...job, my_status: 'HIDDEN' })
                                                        }
                                                    } catch (err) {
                                                        console.error('Failed to hide job:', err)
                                                    }
                                                }}
                                            >
                                                <EyeOff size={16} />
                                            </button>
                                            {onDeleteJob && (
                                                <button
                                                    title="Delete Job"
                                                    className="p-1 hover:bg-red-50 rounded text-red-500 hover:text-red-700"
                                                    onClick={(e) => { e.stopPropagation(); onDeleteJob(job) }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                            {job.my_status !== 'REJECTED' && (
                                                <button
                                                    title="Reject Job"
                                                    className="p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-600"
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        if (window.confirm('Mark this job as REJECTED?')) {
                                                            try {
                                                                await api.post('/jobs/update', {
                                                                    url: job.job_url,
                                                                    status: 'REJECTED'
                                                                })
                                                                if (onJobUpdate) {
                                                                    onJobUpdate({ ...job, my_status: 'REJECTED' })
                                                                }
                                                            } catch (err) {
                                                                console.error('Failed to reject job:', err)
                                                            }
                                                        }
                                                    }}
                                                >
                                                    <Ban size={16} />
                                                </button>
                                            )}
                                            {job.my_status !== 'INTERVIEW' && (
                                                <button
                                                    title="Mark as Interview"
                                                    className="p-1 hover:bg-indigo-50 rounded text-slate-400 hover:text-indigo-600"
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        if (window.confirm('Mark this job as INTERVIEW?')) {
                                                            try {
                                                                await api.post('/jobs/update', {
                                                                    url: job.job_url,
                                                                    status: 'INTERVIEW'
                                                                })
                                                                if (onJobUpdate) {
                                                                    onJobUpdate({ ...job, my_status: 'INTERVIEW' })
                                                                }
                                                            } catch (err) {
                                                                console.error('Failed to mark as interview:', err)
                                                            }
                                                        }
                                                    }}
                                                >
                                                    <UserCheck size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Job Details Modal */}
            {selectedJob && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                    <div
                        className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm transition-opacity"
                        onClick={() => setSelectedJob(null)}
                    />
                    <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-700">
                        {/* Header */}
                        <div className="flex items-start justify-between p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                            <div className="pr-12">
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 leading-tight">{selectedJob.title}</h2>
                                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-600 dark:text-slate-400">
                                    <span className="font-medium text-slate-900 dark:text-slate-200 text-base">{selectedJob.company}</span>
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
                                className="absolute right-4 top-4 p-2 rounded-full bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-400 dark:text-slate-300 transition-colors border border-slate-200 dark:border-slate-600 shadow-sm"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 text-slate-700 dark:text-slate-300 leading-relaxed scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent">
                            {/* Tags */}
                            <div className="flex flex-wrap gap-2 mb-8">
                                {selectedJob.job_type && (
                                    <span className="px-3 py-1 text-xs font-semibold bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-full border border-blue-100 dark:border-blue-800">
                                        {selectedJob.job_type}
                                    </span>
                                )}
                                {(selectedJob.min_amount || selectedJob.max_amount) && (
                                    <span className="px-3 py-1 text-xs font-semibold bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full border border-green-100 dark:border-green-800">
                                        {selectedJob.min_amount ? `$${selectedJob.min_amount}` : ''}
                                        {selectedJob.min_amount && selectedJob.max_amount ? ' - ' : ''}
                                        {selectedJob.max_amount ? `$${selectedJob.max_amount}` : ''}
                                    </span>
                                )}
                                <span className="px-3 py-1 text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full capitalize border border-slate-200 dark:border-slate-600">
                                    {selectedJob.site || 'Unknown Source'}
                                </span>
                            </div>

                            <div className="prose prose-slate max-w-none">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm uppercase tracking-wider font-bold text-slate-400 m-0">Description</h3>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleCopyLink}
                                            className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all font-medium"
                                            title="Copy Job URL"
                                        >
                                            {linkCopied ? <Check size={14} className="text-green-600" /> : <Link size={14} />}
                                            {linkCopied ? <span className="text-green-600">Copied</span> : "Link"}
                                        </button>
                                        <button
                                            onClick={handleCopyMarkdown}
                                            className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all font-medium"
                                            title="Copy Markdown Link"
                                        >
                                            {mdCopied ? <Check size={14} className="text-green-600" /> : <FileText size={14} />}
                                            {mdCopied ? <span className="text-green-600">Copied</span> : "Markdown"}
                                        </button>
                                        <button
                                            onClick={handleCopyInterviewPrompt}
                                            className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:border-purple-200 dark:hover:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all font-medium"
                                            title="Copy Interview Prep Prompt"
                                        >
                                            {promptCopied ? <Check size={14} className="text-green-600" /> : <MessageSquare size={14} />}
                                            {promptCopied ? <span className="text-green-600">Copied</span> : "Interview Prompt"}
                                        </button>
                                        <button
                                            onClick={handleCopy}
                                            className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all font-medium"
                                            title="Copy Title & Description"
                                        >
                                            {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                                            {copied ? <span className="text-green-600">Copied</span> : "Copy Info"}
                                        </button>
                                    </div>
                                </div>
                                <div className="whitespace-pre-wrap font-sans text-base text-slate-800 dark:text-slate-200">
                                    {loadingDesc ? (
                                        <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                                            <Loader2 size={32} className="animate-spin text-blue-500" />
                                            <p>Fetching detailed description...</p>
                                        </div>
                                    ) : (
                                        selectedJob.description || (
                                            <div className="py-8 text-center text-slate-400 dark:text-slate-500 italic bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
                                                No detailed description available for this job.
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 sm:p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80 flex flex-col xl:flex-row justify-between items-center gap-4">
                            <div className="flex items-center gap-4 w-full xl:w-auto justify-between xl:justify-start">
                                <div className="text-xs text-slate-400 font-medium">
                                    Job ID: {selectedJob.id || 'N/A'} • Found {selectedJob.date_found ? new Date(selectedJob.date_found).toLocaleDateString() : 'Recently'}
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        title="Hide Job"
                                        onClick={async () => {
                                            try {
                                                await api.post('/jobs/update', { url: selectedJob.job_url, status: 'HIDDEN' })
                                                const updated = { ...selectedJob, my_status: 'HIDDEN' }
                                                setSelectedJob(updated)
                                                if (onJobUpdate) onJobUpdate(updated)
                                                // Close modal when hiding
                                                setSelectedJob(null)
                                            } catch (err) { console.error('Failed to hide:', err) }
                                        }}
                                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                                    >
                                        <EyeOff size={18} />
                                    </button>
                                    {onDeleteJob && (
                                        <button
                                            title="Delete Job"
                                            onClick={() => {
                                                if (window.confirm('Are you sure you want to delete this job?')) {
                                                    onDeleteJob(selectedJob)
                                                    setSelectedJob(null)
                                                }
                                            }}
                                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-end gap-2 w-full xl:w-auto">
                                {/* Status Actions */}
                                {selectedJob.my_status !== 'REJECTED' && (
                                    <button
                                        onClick={async () => {
                                            if (window.confirm('Mark this job as REJECTED?')) {
                                                try {
                                                    await api.post('/jobs/update', { url: selectedJob.job_url, status: 'REJECTED' })
                                                    const updated = { ...selectedJob, my_status: 'REJECTED' }
                                                    setSelectedJob(updated)
                                                    if (onJobUpdate) onJobUpdate(updated)
                                                } catch (err) { console.error('Failed to reject:', err) }
                                            }
                                        }}
                                        className="px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors shadow-sm flex items-center gap-1.5"
                                    >
                                        <Ban size={16} /> <span className="hidden sm:inline">Reject</span>
                                    </button>
                                )}
                                {selectedJob.my_status !== 'INTERVIEW' && (
                                    <button
                                        onClick={async () => {
                                            if (window.confirm('Mark this job as INTERVIEW?')) {
                                                try {
                                                    await api.post('/jobs/update', { url: selectedJob.job_url, status: 'INTERVIEW' })
                                                    const updated = { ...selectedJob, my_status: 'INTERVIEW' }
                                                    setSelectedJob(updated)
                                                    if (onJobUpdate) onJobUpdate(updated)
                                                } catch (err) { console.error('Failed to mark interview:', err) }
                                            }
                                        }}
                                        className="px-3 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors shadow-sm flex items-center gap-1.5"
                                    >
                                        <UserCheck size={16} /> <span className="hidden sm:inline">Interview</span>
                                    </button>
                                )}

                                {selectedJob.my_status === 'APPLIED' ? (
                                    <button
                                        onClick={async () => {
                                            if (window.confirm('Mark this job as NOT applied?')) {
                                                try {
                                                    await api.post('/jobs/update', { url: selectedJob.job_url, status: 'NEW' })
                                                    const updated = { ...selectedJob, my_status: 'NEW' }
                                                    setSelectedJob(updated)
                                                    if (onJobUpdate) onJobUpdate(updated)
                                                } catch (err) { console.error('Failed to unapply:', err) }
                                            }
                                        }}
                                        className="px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors shadow-sm flex items-center gap-1.5"
                                    >
                                        <XCircle size={16} /> <span className="hidden sm:inline">Unapply</span>
                                    </button>
                                ) : (
                                    <button
                                        onClick={async () => {
                                            try {
                                                await api.post('/jobs/update', { url: selectedJob.job_url, status: 'APPLIED' })
                                                const updated = { ...selectedJob, my_status: 'APPLIED' }
                                                setSelectedJob(updated)
                                                if (onJobUpdate) onJobUpdate(updated)
                                            } catch (err) { console.error('Failed to mark applied:', err) }
                                        }}
                                        className="px-3 py-2 text-sm font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border border-green-100 dark:border-green-800 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors shadow-sm flex items-center gap-1.5"
                                    >
                                        <CheckCircle size={16} /> <span className="hidden sm:inline">Applied</span>
                                    </button>
                                )}

                                <div className="w-px h-6 bg-slate-300 mx-1 hidden sm:block"></div>

                                {/* Tools */}
                                <button
                                    onClick={() => setReminderJob(selectedJob)}
                                    className="p-2.5 text-sm font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border border-amber-100 dark:border-amber-800 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors shadow-sm"
                                    title="Remind Me"
                                >
                                    <Bell size={18} />
                                </button>
                                <button
                                    onClick={() => onToggleSave && onToggleSave(selectedJob)}
                                    className={`
                                        p-2.5 text-sm font-medium border rounded-xl transition-colors shadow-sm
                                        ${isJobSaved(selectedJob)
                                            ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50'
                                            : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
                                        }
                                    `}
                                    title={isJobSaved(selectedJob) ? 'Unsave' : 'Save'}
                                >
                                    <Bookmark size={18} fill={isJobSaved(selectedJob) ? "currentColor" : "none"} />
                                </button>

                                <a
                                    href={selectedJob.job_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg shadow-blue-600/20"
                                >
                                    Apply Now <ExternalLink size={16} />
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {reminderJob && (
                <ReminderModal job={reminderJob} onClose={() => setReminderJob(null)} />
            )}
            {isAddJobOpen && (
                <ManualAddJobModal
                    onClose={() => setIsAddJobOpen(false)}
                    onJobAdded={() => {
                        // Reload to fetch the new job.
                        // Ideally we would optimistically add it, but for simplicity reloading ensures sync with backend
                        window.location.reload()
                    }}
                />
            )}
        </>
    )
}

const ColumnFilter = ({ column, jobs, initialFilter, onApply, onClear, onClose }) => {
    // Memoize unique values to calculate only when jobs/column change
    const uniqueValues = useMemo(() => Array.from(new Set(jobs.map(j => column.getValue(j)))).sort(), [jobs, column])
    const [searchTerm, setSearchTerm] = useState('')

    // Local state for deferred filtering
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
            // Transition from "All" to "All minus one"
            const allOthers = uniqueValues.filter(v => v !== val)
            setTempFilter(allOthers)
        } else {
            // Toggle in local array
            const current = tempFilter || []
            const updated = current.includes(val)
                ? current.filter(v => v !== val)
                : [...current, val]
            setTempFilter(updated)
        }
    }

    const handleSelectAll = (select) => {
        if (select) {
            setTempFilter(undefined) // Select All
        } else {
            setTempFilter([]) // Select None
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
        <div className="absolute top-full mt-2 left-0 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-[100] flex flex-col text-sm animate-in fade-in zoom-in-95 duration-100 transition-colors">
            <div className="p-3 border-b border-slate-100 dark:border-slate-700">
                <input
                    type="text"
                    placeholder="Search..."
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    autoFocus
                />
            </div>

            <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                <label className="flex items-center px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 rounded cursor-pointer transition-colors">
                    <input
                        type="checkbox"
                        className="rounded border-slate-300 dark:border-slate-600 dark:bg-slate-900 text-blue-600 focus:ring-blue-500 mr-2"
                        checked={areAllVisibleSelected}
                        ref={input => { if (input) input.indeterminate = isIndeterminate }}
                        onChange={(e) => {
                            if (searchTerm) {
                                const visibleValues = displayValues
                                if (e.target.checked) {
                                    // Add visible to local selection
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
                                    // Remove visible from local selection
                                    let base = isAllSelected ? [...uniqueValues] : (tempFilter ? [...tempFilter] : [])
                                    base = base.filter(v => !visibleValues.includes(v))
                                    setTempFilter(base)
                                }
                            } else {
                                handleSelectAll(e.target.checked)
                            }
                        }}
                    />
                    <span className="text-slate-900 dark:text-slate-100 font-medium">(Select All)</span>
                </label>

                {displayValues.map((val, idx) => (
                    <label key={idx} className="flex items-center px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 rounded cursor-pointer transition-colors">
                        <input
                            type="checkbox"
                            className="rounded border-slate-300 dark:border-slate-600 dark:bg-slate-900 text-blue-600 focus:ring-blue-500 mr-2"
                            checked={isSelected(val)}
                            onChange={() => handleCheckboxChange(val)}
                        />
                        <span className="text-slate-700 dark:text-slate-300 truncate block" title={val}>{val}</span>
                    </label>
                ))}

                {displayValues.length === 0 && (
                    <div className="px-2 py-4 text-center text-slate-400 dark:text-slate-500 italic">No matches</div>
                )}
            </div>

            <div className="p-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80 rounded-b-lg">
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
