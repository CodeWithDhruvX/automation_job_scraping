import { useState, useEffect, useMemo, useCallback } from 'react'
import axios from 'axios'
import {
    LayoutDashboard, Mail, Tag, Filter, RefreshCw, Trash2,
    CheckCircle, XCircle, AlertCircle, Clock, Calendar,
    Search, ArrowUp, ArrowDown, ArrowUpDown, MoreVertical,
    Briefcase, Building, Paperclip, Copy, ExternalLink
} from 'lucide-react'
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/airbnb.css";

// Configure Axios
const api = axios.create({
    baseURL: 'http://localhost:8000/api'
})

export const GmailOrganizerView = () => {
    const [emails, setEmails] = useState([])
    const [loading, setLoading] = useState(false)
    const [organizing, setOrganizing] = useState(false)
    const [dateRange, setDateRange] = useState([new Date(new Date().setDate(new Date().getDate() - 1)), new Date()]) // Default 1 day

    // Stats
    const [stats, setStats] = useState({
        total: 0,
        recruiters: 0,
        applications: 0,
        interviews: 0
    })

    // Active View/Filter
    const [activeCategory, setActiveCategory] = useState('all')
    // categories: 'all', 'recruiters', 'high_priority', 'interviews', 'follow_up'

    const fetchEmails = useCallback(async () => {
        setLoading(true)
        try {
            // Format dates for API
            const formatDate = (date) => {
                const d = new Date(date)
                return d.toISOString().split('T')[0]
            }

            // Build query parameters
            const params = new URLSearchParams()
            if (activeCategory !== 'all') {
                params.append('category', activeCategory)
            }
            if (dateRange[0]) {
                params.append('start_date', formatDate(dateRange[0]))
            }
            if (dateRange[1]) {
                params.append('end_date', formatDate(dateRange[1]))
            }

            const queryString = params.toString()
            const url = `/gmail/emails${queryString ? '?' + queryString : ''}`
            const res = await api.get(url)
            setEmails(res.data)
        } catch (err) {
            console.error("Failed to fetch emails", err)
            alert("Failed to load emails. Make sure you have connected a Gmail account in Invite Logger.")
        } finally {
            setLoading(false)
        }
    }, [activeCategory, dateRange])

    const fetchStats = useCallback(async () => {
        try {
            const res = await api.get('/gmail/stats')
            setStats(res.data)
        } catch (err) {
            console.error("Failed to fetch stats", err)
        }
    }, [])

    // Fetch emails when component mounts or filters change
    useEffect(() => {
        fetchEmails()
    }, [fetchEmails])

    // Fetch stats on mount only
    useEffect(() => {
        fetchStats()
    }, [fetchStats])

    const handleOrganize = async () => {
        setOrganizing(true)
        try {
            // Format dates for API
            const formatDate = (date) => {
                const d = new Date(date)
                return d.toISOString().split('T')[0]
            }

            const payload = {
                days: 1,
                start_date: dateRange[0] ? formatDate(dateRange[0]) : null,
                end_date: dateRange[1] ? formatDate(dateRange[1]) : null
            }

            const res = await api.post('/gmail/organize', payload)

            alert(`Organization complete! Scanned ${res.data.scanned} emails.`)
            fetchEmails()
            fetchStats()
        } catch (err) {
            alert("Failed to organize: " + (err.response?.data?.detail || err.message))
        } finally {
            setOrganizing(false)
        }
    }

    const handleCancelOrganize = async () => {
        try {
            await api.post('/gmail/organize/cancel')
            setOrganizing(false)
            alert('Scan cancelled')
        } catch (err) {
            console.error('Failed to cancel scan', err)
            setOrganizing(false) // Reset state even if cancel fails
        }
    }

    const getPriorityColor = (priority) => {
        switch (priority?.toLowerCase()) {
            case 'high': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
            case 'medium': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800'
            case 'low': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
            default: return 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600'
        }
    }

    const getStatusBadge = (status) => {
        switch (status?.toLowerCase()) {
            case 'new': return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-800">New</span>
            case 'interview': return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border border-purple-100 dark:border-purple-800">Interview</span>
            case 'pending': return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border border-orange-100 dark:border-orange-800">Pending</span>
            default: return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">{status}</span>
        }
    }

    return (
        <div className="flex h-[calc(100vh-100px)] gap-6">
            {/* Sidebar Navigation */}
            <div className="w-64 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col overflow-hidden shrink-0 transition-colors">
                <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <Filter size={18} className="text-blue-600 dark:text-blue-400" />
                        Smart Folders
                    </h3>
                </div>
                <nav className="flex-1 overflow-y-auto p-2 space-y-1">
                    <button
                        onClick={() => setActiveCategory('all')}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeCategory === 'all' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                    >
                        <span className="flex items-center gap-2"><LayoutDashboard size={16} /> All Scanned</span>
                        <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded-full text-xs">{stats.total}</span>
                    </button>

                    <div className="pt-4  px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Recruiters</div>
                    <button
                        onClick={() => setActiveCategory('recruiters')}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeCategory === 'recruiters' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                    >
                        <span className="flex items-center gap-2"><Briefcase size={16} /> Recruiters</span>
                        <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded-full text-xs">{stats.recruiters}</span>
                    </button>
                    <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 pl-8">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> LinkedIn
                    </button>
                    <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 pl-8">
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span> Naukri
                    </button>
                    <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 pl-8">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> Indeed
                    </button>

                    <div className="pt-4 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Priority</div>
                    <button
                        onClick={() => setActiveCategory('high_priority')}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeCategory === 'high_priority' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <span className="flex items-center gap-2"><AlertCircle size={16} className="text-red-500" /> High Priority</span>
                        <span className="bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full text-xs">5</span>
                    </button>

                    <div className="pt-4 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</div>
                    <button
                        onClick={() => setActiveCategory('interviews')}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeCategory === 'interviews' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <span className="flex items-center gap-2"><Calendar size={16} className="text-purple-500" /> Interviews</span>
                        <span className="bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded-full text-xs">{stats.interviews}</span>
                    </button>
                    <button
                        onClick={() => setActiveCategory('follow_up')}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeCategory === 'follow_up' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <span className="flex items-center gap-2"><Clock size={16} className="text-orange-500" /> Follow Up</span>
                        <span className="bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded-full text-xs">8</span>
                    </button>
                </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col gap-6 overflow-hidden">
                {/* Top Controls */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 shrink-0 transition-colors">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                <Search size={16} />
                            </span>
                            <input
                                type="text"
                                placeholder="Search emails..."
                                className="pl-9 pr-4 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 w-64 outline-none"
                            />
                        </div>
                        <div className="h-8 w-px bg-slate-200 dark:bg-slate-700"></div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Range:</span>
                            <Flatpickr
                                options={{
                                    mode: "range",
                                    dateFormat: "Y-m-d",
                                    maxDate: "today",
                                }}
                                value={dateRange}
                                onChange={(update) => setDateRange(update)}
                                className="border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 rounded-lg text-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 w-56 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleOrganize}
                        disabled={organizing}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all shadow-sm ${organizing ? 'bg-blue-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'}`}
                    >
                        <RefreshCw size={16} className={organizing ? "animate-spin" : ""} />
                        {organizing ? 'Organizing...' : 'Run Smart Organizer'}
                    </button>

                    {organizing && (
                        <button
                            onClick={handleCancelOrganize}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-all shadow-sm"
                        >
                            <XCircle size={16} />
                            Stop Scan
                        </button>
                    )}
                </div>

                {/* Email Table */}
                <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col transition-colors">
                    {loading ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                            <RefreshCw size={48} className="animate-spin text-blue-200 mb-4" />
                            <p>Loading your inbox...</p>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-left text-sm dark:text-slate-300">
                                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-400">App/Company</th>
                                        <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Subject</th>
                                        <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Source</th>
                                        <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Priority</th>
                                        <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Received</th>
                                        <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Status</th>
                                        <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-400 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {emails.map(email => (
                                        <tr key={email.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                            <td className="px-4 py-4">
                                                <div className="font-semibold text-slate-900 dark:text-slate-100">{email.company}</div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                                    <Mail size={10} /> {email.sender}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 max-w-xs">
                                                <div className="font-medium text-slate-800 dark:text-slate-200 truncate" title={email.subject}>{email.subject}</div>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {email.labels.slice(0, 2).map((label, i) => (
                                                        <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600">
                                                            {label.split('/').pop()}
                                                        </span>
                                                    ))}
                                                    {email.hasAttachment && (
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800 items-center gap-0.5">
                                                            <Paperclip size={8} /> Attachment
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${email.source === 'LinkedIn' ? 'bg-blue-50 text-blue-700' : email.source === 'Naukri' ? 'bg-yellow-50 text-yellow-700' : 'bg-slate-100 text-slate-600'}`}>
                                                    {email.source}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(email.priority)}`}>
                                                    {email.priority}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-slate-500 whitespace-nowrap">
                                                {new Date(email.received).toLocaleDateString()}
                                                <div className="text-xs text-slate-400">{new Date(email.received).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                            </td>
                                            <td className="px-4 py-4">
                                                {getStatusBadge(email.status)}
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => window.open(email.email_url, '_blank')}
                                                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                        title="Open in Gmail"
                                                    >
                                                        <ExternalLink size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => navigator.clipboard.writeText(`${email.subject}\n${email.sender}`)}
                                                        className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                                                        title="Copy Details"
                                                    >
                                                        <Copy size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {emails.length === 0 && (
                                        <tr>
                                            <td colSpan="7" className="px-4 py-12 text-center text-slate-400">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="bg-slate-50 p-4 rounded-full">
                                                        <Mail size={24} className="text-slate-300" />
                                                    </div>
                                                    <p>No emails found for this category.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
