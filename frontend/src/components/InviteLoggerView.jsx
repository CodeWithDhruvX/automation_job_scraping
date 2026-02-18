import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { Calendar, RefreshCw, Check, X, ExternalLink, Mail, Clock, Copy, ArrowUpDown, ArrowUp, ArrowDown, Filter, Download, Users, Plus, Trash2 } from 'lucide-react'
import * as XLSX from 'xlsx'

// Configure Axios
const api = axios.create({
    baseURL: 'http://localhost:8000/api'
})

import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/airbnb.css"; // Using Airbnb theme for a premium feel

export const InviteLoggerView = () => {
    const [invites, setInvites] = useState([])
    const [loading, setLoading] = useState(false)
    const [scanning, setScanning] = useState(false)
    const [scanDays, setScanDays] = useState(1)
    const [dateRange, setDateRange] = useState([new Date(), new Date()]) // Custom Range State

    // Search & Pagination State
    const [searchTerm, setSearchTerm] = useState("")
    const [currentPage, setCurrentPage] = useState(1)

    // Column Filters State
    const [columnFilters, setColumnFilters] = useState(() => {
        const savedFilters = localStorage.getItem('invite_logger_filters')
        return savedFilters ? JSON.parse(savedFilters) : {
            subject: '',
            sender: '',
            meeting_link: '',
            detection_method: '',
            meeting_time: '',
            detection_timestamp: '',
            status: '',
            email_url: ''
        }
    })

    // Account Management State
    const [accounts, setAccounts] = useState([])
    const [showAccountModal, setShowAccountModal] = useState(false)
    const [addingAccount, setAddingAccount] = useState(false)

    useEffect(() => {
        fetchAccounts()
    }, [])

    const fetchAccounts = async () => {
        try {
            const res = await api.get('/invites/accounts')
            setAccounts(res.data)
        } catch (err) {
            console.error("Failed to fetch accounts", err)
        }
    }

    const handleAddAccount = async () => {
        setAddingAccount(true)
        try {
            // This will open a new window/tab for auth if not handled by browser popup logic
            // Since backend opens specific window, we just wait for response
            const res = await api.post('/invites/accounts')
            if (res.data.status === 'success') {
                alert(`Account ${res.data.email} added successfully!`)
                fetchAccounts()
            }
        } catch (err) {
            alert("Failed to add account: " + (err.response?.data?.detail || err.message))
        } finally {
            setAddingAccount(false)
        }
    }

    const handleRemoveAccount = async (email) => {
        if (!window.confirm(`Are you sure you want to remove ${email}?`)) return
        try {
            await api.delete(`/invites/accounts/${email}`)
            fetchAccounts()
        } catch (err) {
            alert("Failed to remove account")
        }
    }

    useEffect(() => {
        localStorage.setItem('invite_logger_filters', JSON.stringify(columnFilters))
    }, [columnFilters])

    const ITEMS_PER_PAGE = 10
    const [sortConfig, setSortConfig] = useState(() => {
        const saved = localStorage.getItem('invite_logger_sort')
        return saved ? JSON.parse(saved) : { key: 'detection_timestamp', direction: 'desc' }
    })

    useEffect(() => {
        localStorage.setItem('invite_logger_sort', JSON.stringify(sortConfig))
    }, [sortConfig])

    const COLUMNS = useMemo(() => [
        { key: 'subject', label: 'Subject' },
        { key: 'company', label: 'Company' },
        { key: 'sender', label: 'Sender' },
        { key: 'source', label: 'Source' },
        { key: 'meeting_link', label: 'Meeting Link' },
        { key: 'detection_method', label: 'Method' },
        { key: 'meeting_time', label: 'Schedule Time' },
        { key: 'detection_timestamp', label: 'Received' },
        { key: 'status', label: 'Status' },
        { key: 'email_url', label: 'Email Reference' },
    ], [])

    // Filter Logic
    const filteredInvites = invites.filter(invite => {
        const searchLower = searchTerm.toLowerCase()
        const formattedReceived = new Date(invite.detection_timestamp).toLocaleString().toLowerCase()

        // Global Search
        const matchesGlobal = (
            invite.subject?.toLowerCase().includes(searchLower) ||
            invite.sender?.toLowerCase().includes(searchLower) ||
            invite.status?.toLowerCase().includes(searchLower) ||
            formattedReceived?.includes(searchLower)
        )

        if (!matchesGlobal) return false

        // Column Filters
        return COLUMNS.every(col => {
            const filterValue = columnFilters[col.key]?.toLowerCase()
            if (!filterValue) return true

            let cellValue = invite[col.key]

            // Date Formatting for comparison
            if (col.key === 'meeting_time' || col.key === 'detection_timestamp') {
                if (!cellValue) return false
                cellValue = new Date(cellValue).toLocaleString()
            }

            if (cellValue === null || cellValue === undefined) cellValue = ''
            return String(cellValue).toLowerCase().includes(filterValue)
        })
    })

    // Sorting Logic
    const handleSort = (key) => {
        let direction = 'asc'
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc'
        }
        setSortConfig({ key, direction })
    }

    const sortedInvites = [...filteredInvites].sort((a, b) => {
        if (!sortConfig.key) return 0

        let aValue = a[sortConfig.key]
        let bValue = b[sortConfig.key]

        // Handle null/undefined values
        if (aValue === null || aValue === undefined) aValue = ""
        if (bValue === null || bValue === undefined) bValue = ""

        // Date sorting for specific columns
        if (['meeting_time', 'detection_timestamp'].includes(sortConfig.key)) {
            const dateA = new Date(aValue).getTime()
            const dateB = new Date(bValue).getTime()
            // Handle invalid dates (push to bottom)
            if (isNaN(dateA)) return 1
            if (isNaN(dateB)) return -1
            return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA
        }

        // String sorting
        if (typeof aValue === 'string') {
            aValue = aValue.toLowerCase()
            bValue = bValue.toLowerCase()
        }

        if (aValue < bValue) {
            return sortConfig.direction === 'asc' ? -1 : 1
        }
        if (aValue > bValue) {
            return sortConfig.direction === 'asc' ? 1 : -1
        }
        return 0
    })

    // Pagination Logic
    const totalPages = Math.ceil(sortedInvites.length / ITEMS_PER_PAGE)
    const currentInvites = sortedInvites.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    )

    // Reset page when search changes
    useEffect(() => {
        setCurrentPage(1)
    }, [searchTerm, columnFilters])

    useEffect(() => {
        fetchInvites()
    }, [])

    const fetchInvites = async () => {
        setLoading(true)
        try {
            const res = await api.get('/invites')
            setInvites(res.data)
        } catch (err) {
            console.error("Failed to fetch invites", err)
        } finally {
            setLoading(false)
        }
    }

    const handleScan = async () => {
        setScanning(true)
        try {
            let payload = {}

            if (scanDays === 'custom') {
                if (!dateRange || dateRange.length < 2 || !dateRange[0] || !dateRange[1]) {
                    alert("Please select a complete date range (Start & End).")
                    setScanning(false)
                    return
                }

                // Format dates as YYYY-MM-DD to avoid timezone issues
                const formatDate = (date) => {
                    const offset = date.getTimezoneOffset()
                    const d = new Date(date.getTime() - (offset * 60 * 1000))
                    return d.toISOString().split('T')[0]
                }

                payload = {
                    days: 0, // Ignored by backend if dates provided
                    start_date: formatDate(dateRange[0]),
                    end_date: formatDate(dateRange[1])
                }
            } else {
                payload = { days: parseInt(scanDays) }
            }

            const res = await api.post('/invites/scan', payload)
            if (res.data.status === 'cancelled') {
                alert(`Scan cancelled. Found ${res.data.found} invites so far.`)
            } else {
                alert(`Scan complete! Found ${res.data.found} invites (${res.data.new} new).`)
            }
            fetchInvites()
        } catch (err) {
            alert("Scan failed: " + (err.response?.data?.detail || err.message))
        } finally {
            setScanning(false)
        }
    }

    const handleCancel = async () => {
        try {
            await api.post('/invites/scan/cancel')
        } catch (err) {
            console.error("Failed to cancel scan", err)
        }
    }

    const handleAddToCalendar = async (invite) => {
        if (!window.confirm(`Add "${invite.subject}" to Google Calendar?`)) return

        try {
            await api.post(`/invites/${invite.id}/calendar`)
            alert("Event added to calendar!")
            updateLocalStatus(invite.id, 'ADDED')
        } catch (err) {
            alert("Failed to add to calendar: " + (err.response?.data?.detail || err.message))
        }
    }

    const handleIgnore = async (invite) => {
        if (!window.confirm("Mark this invite as ignored?")) return

        try {
            await api.put(`/invites/${invite.id}/status`, { status: 'IGNORED' })
            updateLocalStatus(invite.id, 'IGNORED')
        } catch (err) {
            alert("Failed to update status: " + err.message)
        }
    }

    const updateLocalStatus = (id, status) => {
        setInvites(prev => prev.map(inv => inv.id === id ? { ...inv, status } : inv))
    }

    const getStatusColor = (status) => {
        switch (status) {
            case 'ADDED': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
            case 'IGNORED': return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
            case 'PENDING': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
            default: return 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-300'
        }
    }

    const handleColumnFilterChange = (key, value) => {
        setColumnFilters(prev => ({ ...prev, [key]: value }))
    }

    const handleExportExcel = () => {
        const dataToExport = filteredInvites.map(invite => ({
            Subject: invite.subject,
            Sender: invite.sender,
            'Meeting Link': invite.meeting_link,
            Method: invite.detection_method,
            'Schedule Time': invite.meeting_time ? new Date(invite.meeting_time).toLocaleString() : '',
            Received: new Date(invite.detection_timestamp).toLocaleString(),
            Status: invite.status,
            'Email Reference': invite.email_url
        }))

        const ws = XLSX.utils.json_to_sheet(dataToExport)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Invites")
        XLSX.writeFile(wb, "invites_export.xlsx")
    }

    const handleClearAllFilters = () => {
        setColumnFilters({
            subject: '',
            sender: '',
            meeting_link: '',
            detection_method: '',
            meeting_time: '',
            detection_timestamp: '',
            status: '',
            email_url: ''
        })
    }

    return (
        <div className="space-y-6">
            {/* Header / Controls */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 transition-colors">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Mail className="text-blue-600 dark:text-blue-400" />
                        Invite Logger
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Scan emails for meeting invites and add them to your calendar.</p>

                    {/* Search Bar */}
                    <div className="mt-4">
                        <input
                            type="text"
                            placeholder="Global search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full md:w-64 px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-slate-700 flex-wrap">
                    <button
                        onClick={handleExportExcel}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-green-700 dark:text-green-400 bg-white dark:bg-slate-800 border border-green-200 dark:border-green-800 rounded-md hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors shadow-sm"
                        title="Export to Excel"
                    >
                        <Download size={16} />
                        Export
                    </button>

                    <button
                        onClick={() => setShowAccountModal(true)}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                        title="Manage Accounts"
                    >
                        <Users size={16} />
                        Accounts ({accounts.length})
                    </button>
                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1 hidden md:block"></div>
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            Scan:
                        </label>
                        <select
                            value={scanDays}
                            onChange={(e) => setScanDays(e.target.value)}
                            className="border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 rounded-md text-sm py-1 px-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="1">Last 24 Hours</option>
                            <option value="2">Last 2 Days</option>
                            <option value="3">Last 3 Days</option>
                            <option value="5">Last 5 Days</option>
                            <option value="custom">Custom Range</option>
                        </select>
                    </div>

                    {scanDays === 'custom' && (
                        <div className="relative animate-in fade-in zoom-in duration-200">
                            <Flatpickr
                                options={{
                                    mode: "range",
                                    dateFormat: "Y-m-d",
                                    maxDate: "today",
                                    showMonths: 2
                                }}
                                value={dateRange}
                                onChange={(update) => setDateRange(update)}
                                className="border border-slate-300 rounded-md text-sm py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 w-60 shadow-sm"
                                placeholder="Select Date Range..."
                            />
                        </div>
                    )}

                    <button
                        onClick={handleScan}
                        disabled={scanning}
                        className={`
              flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-md transition-colors shadow-sm
              ${scanning ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}
            `}
                    >
                        <RefreshCw size={16} className={scanning ? "animate-spin" : ""} />
                        {scanning ? "Scanning..." : "Scan"}
                    </button>

                    {scanning && (
                        <button
                            onClick={handleCancel}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors shadow-sm"
                        >
                            <X size={16} />
                            Cancel
                        </button>
                    )}
                </div>
            </div>

            {/* Invites Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-slate-500 dark:text-slate-400">Loading invites...</div>
                ) : invites.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                        <Mail size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                        <p>No invites found. Try scanning your emails.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto overflow-y-visible">
                        <table className="w-full text-left text-sm dark:text-slate-300">
                            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                                <tr>
                                    {COLUMNS.map((col) => (
                                        <th
                                            key={col.key}
                                            className="px-3 py-3 font-medium cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors select-none"
                                            onClick={() => handleSort(col.key)}
                                        >
                                            <div className="flex items-center gap-1">
                                                {col.label}
                                                {sortConfig.key === col.key ? (
                                                    sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                                                ) : (
                                                    <ArrowUpDown size={14} className="text-slate-400 opacity-50" />
                                                )}
                                            </div>
                                        </th>
                                    ))}
                                    <th className="px-3 py-3 font-medium text-right">Actions</th>
                                </tr>
                                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                                    {COLUMNS.map((col) => (
                                        <th key={`filter-${col.key}`} className="px-3 py-2">
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    placeholder={`Filter...`}
                                                    value={columnFilters[col.key] || ''}
                                                    onChange={(e) => handleColumnFilterChange(col.key, e.target.value)}
                                                    className="w-full pl-2 pr-6 py-1 text-xs border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-normal"
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                                {columnFilters[col.key] && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleColumnFilterChange(col.key, '')
                                                        }}
                                                        className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 p-0.5 rounded-full hover:bg-slate-100"
                                                        title="Clear Filter"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                )}
                                            </div>
                                        </th>
                                    ))}
                                    <th className="px-3 py-2 text-right">
                                        {Object.values(columnFilters).some(v => v) && (
                                            <button
                                                onClick={handleClearAllFilters}
                                                className="text-xs text-red-500 hover:text-red-700 font-medium whitespace-nowrap flex items-center justify-end gap-1 ml-auto"
                                                title="Clear All Filters"
                                            >
                                                <X size={12} /> Clear All
                                            </button>
                                        )}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {currentInvites.map((invite) => (
                                    <tr key={invite.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-3 py-4 font-medium text-slate-900 dark:text-slate-100 max-w-[200px] truncate" title={invite.subject}>
                                            {invite.subject}
                                        </td>
                                        <td className="px-3 py-4 font-medium text-slate-700 dark:text-slate-300">
                                            {invite.company || '-'}
                                        </td>
                                        <td className="px-3 py-4 text-slate-600 dark:text-slate-400 max-w-[120px]">
                                            <div className="flex items-center gap-2">
                                                <span className="truncate" title={invite.sender}>
                                                    {invite.sender.split('<')[0].trim()}...
                                                </span>
                                                <button
                                                    onClick={() => navigator.clipboard.writeText(invite.sender)}
                                                    className="text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                                    title="Copy Sender"
                                                >
                                                    <Copy size={14} />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-3 py-4 text-slate-600 dark:text-slate-400">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${invite.source === 'LinkedIn' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                                                invite.source === 'Naukri' ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                                                    'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                                }`}>
                                                {invite.source || 'Email'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-4">
                                            <a
                                                href={invite.meeting_link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:underline flex items-center gap-1 max-w-[200px] truncate"
                                                title={invite.meeting_link}
                                            >
                                                Link <ExternalLink size={12} />
                                            </a>
                                        </td>
                                        <td className="px-3 py-4 text-slate-500 text-xs font-mono">
                                            {invite.detection_method || 'LEGACY'}
                                        </td>
                                        <td className="px-3 py-4 text-slate-500 whitespace-nowrap">
                                            {invite.meeting_time ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="flex items-center gap-1 text-blue-600 font-medium">
                                                        <Calendar size={14} />
                                                        {new Date(invite.meeting_time).toLocaleString()}
                                                    </span>
                                                    <button
                                                        onClick={() => navigator.clipboard.writeText(new Date(invite.meeting_time).toLocaleDateString())}
                                                        className="text-slate-400 hover:text-blue-600 transition-colors"
                                                        title="Copy Date"
                                                    >
                                                        <Copy size={14} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 text-xs italic">Not Detected</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-4 text-slate-500 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <span className="flex items-center gap-1">
                                                    <Clock size={14} />
                                                    {new Date(invite.detection_timestamp).toLocaleString()}
                                                </span>
                                                <button
                                                    onClick={() => navigator.clipboard.writeText(new Date(invite.detection_timestamp).toLocaleDateString())}
                                                    className="text-slate-400 hover:text-blue-600 transition-colors"
                                                    title="Copy Date"
                                                >
                                                    <Copy size={14} />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-3 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(invite.status)}`}>
                                                {invite.status.toLowerCase()}
                                            </span>
                                        </td>
                                        <td className="px-3 py-4">
                                            <a
                                                href={invite.email_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:underline flex items-center gap-1 max-w-[150px] truncate"
                                                title="Open in Gmail"
                                            >
                                                Open Email <ExternalLink size={12} />
                                            </a>
                                        </td>
                                        <td className="px-3 py-4 text-right space-x-2">
                                            {invite.status === 'PENDING' && (
                                                <>
                                                    <button
                                                        onClick={() => handleAddToCalendar(invite)}
                                                        className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded"
                                                        title="Add to Calendar"
                                                    >
                                                        <Calendar size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleIgnore(invite)}
                                                        className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded"
                                                        title="Ignore"
                                                    >
                                                        <X size={18} />
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Pagination Controls */}
            {filteredInvites.length > 0 && (
                <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Previous
                    </button>
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Next
                    </button>
                </div>
            )}


            {/* Account Management Modal */}
            {showAccountModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md p-6 m-4 animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                <Users className="text-blue-600 dark:text-blue-400" />
                                Manage Accounts
                            </h3>
                            <button
                                onClick={() => setShowAccountModal(false)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {accounts.length === 0 ? (
                                <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                                    <p>No accounts connected.</p>
                                    <p className="text-xs mt-1">Add a Gmail account to start scanning.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {accounts.map(email => (
                                        <div key={email} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold">
                                                    {email[0].toUpperCase()}
                                                </div>
                                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{email}</span>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveAccount(email)}
                                                className="text-red-500 hover:text-red-700 px-2 py-1.5 hover:bg-red-50 rounded transition-colors flex items-center gap-1.5"
                                                title="Logout / Remove Account"
                                            >
                                                <Trash2 size={14} />
                                                <span className="text-xs font-medium">Logout</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="mt-6 pt-6 border-t border-slate-100">
                                <button
                                    onClick={handleAddAccount}
                                    disabled={addingAccount}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
                                >
                                    {addingAccount ? (
                                        <RefreshCw size={18} className="animate-spin" />
                                    ) : (
                                        <Plus size={18} />
                                    )}
                                    {addingAccount ? 'Authenticating...' : 'Add New Account'}
                                </button>
                                <p className="text-center text-xs text-slate-500 mt-2">
                                    A browser window will open to authenticate with Google.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
