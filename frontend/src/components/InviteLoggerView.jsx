import { useState, useEffect } from 'react'
import axios from 'axios'
import { Calendar, RefreshCw, Check, X, ExternalLink, Mail, Clock, Copy } from 'lucide-react'

// Configure Axios
const api = axios.create({
    baseURL: 'http://localhost:8000/api'
})

export const InviteLoggerView = () => {
    const [invites, setInvites] = useState([])
    const [loading, setLoading] = useState(false)
    const [scanning, setScanning] = useState(false)
    const [scanDays, setScanDays] = useState(1)

    // Search & Pagination State
    const [searchTerm, setSearchTerm] = useState("")
    const [currentPage, setCurrentPage] = useState(1)
    const ITEMS_PER_PAGE = 10

    // Filter Logic
    // Filter Logic
    const filteredInvites = invites.filter(invite => {
        const searchLower = searchTerm.toLowerCase()
        const formattedDate = new Date(invite.detection_timestamp).toLocaleString().toLowerCase()

        return (
            invite.subject.toLowerCase().includes(searchLower) ||
            invite.sender.toLowerCase().includes(searchLower) ||
            invite.status.toLowerCase().includes(searchLower) ||
            formattedDate.includes(searchLower)
        )
    })

    // Pagination Logic
    const totalPages = Math.ceil(filteredInvites.length / ITEMS_PER_PAGE)
    const currentInvites = filteredInvites.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    )

    // Reset page when search changes
    useEffect(() => {
        setCurrentPage(1)
    }, [searchTerm])

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
            const res = await api.post('/invites/scan', { days: parseInt(scanDays) })
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
            case 'ADDED': return 'bg-green-100 text-green-800'
            case 'IGNORED': return 'bg-gray-100 text-gray-800'
            case 'PENDING': return 'bg-blue-100 text-blue-800'
            default: return 'bg-slate-100 text-slate-800'
        }
    }

    return (
        <div className="space-y-6">
            {/* Header / Controls */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Mail className="text-blue-600" />
                        Invite Logger
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">Scan emails for meeting invites and add them to your calendar.</p>

                    {/* Search Bar */}
                    <div className="mt-4">
                        <input
                            type="text"
                            placeholder="Search invites..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full md:w-64 px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                        Scan last
                        <select
                            value={scanDays}
                            onChange={(e) => setScanDays(e.target.value)}
                            className="border-slate-300 rounded-md text-sm py-1 px-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="1">24 Hours</option>
                            <option value="2">2 Days</option>
                            <option value="3">3 Days</option>
                            <option value="5">5 Days</option>
                        </select>
                    </label>

                    <button
                        onClick={handleScan}
                        disabled={scanning}
                        className={`
              flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-md transition-colors shadow-sm
              ${scanning ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}
            `}
                    >
                        <RefreshCw size={16} className={scanning ? "animate-spin" : ""} />
                        {scanning ? "Scanning..." : "Scan Emails"}
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
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-slate-500">Loading invites...</div>
                ) : invites.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">
                        <Mail size={48} className="mx-auto text-slate-300 mb-4" />
                        <p>No invites found. Try scanning your emails.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                                <tr>
                                    <th className="px-3 py-3 font-medium">Subject</th>
                                    <th className="px-3 py-3 font-medium">Sender</th>
                                    <th className="px-3 py-3 font-medium">Meeting Link</th>
                                    <th className="px-3 py-3 font-medium">Method</th>
                                    <th className="px-3 py-3 font-medium">Schedule Time</th>
                                    <th className="px-3 py-3 font-medium">Received</th>
                                    <th className="px-3 py-3 font-medium">Status</th>
                                    <th className="px-3 py-3 font-medium">Email Reference</th>
                                    <th className="px-3 py-3 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {currentInvites.map((invite) => (
                                    <tr key={invite.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-3 py-4 font-medium text-slate-900 max-w-[200px] truncate" title={invite.subject}>
                                            {invite.subject}
                                        </td>
                                        <td className="px-3 py-4 text-slate-600 max-w-[120px]">
                                            <div className="flex items-center gap-2">
                                                <span className="truncate" title={invite.sender}>
                                                    {invite.sender.split('<')[0].trim()}...
                                                </span>
                                                <button
                                                    onClick={() => navigator.clipboard.writeText(invite.sender)}
                                                    className="text-slate-400 hover:text-blue-600 transition-colors"
                                                    title="Copy Sender"
                                                >
                                                    <Copy size={14} />
                                                </button>
                                            </div>
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
                                                <span className="flex items-center gap-1 text-blue-600 font-medium">
                                                    <Calendar size={14} />
                                                    {new Date(invite.meeting_time).toLocaleString()}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 text-xs italic">Not Detected</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-4 text-slate-500 whitespace-nowrap">
                                            <span className="flex items-center gap-1">
                                                <Clock size={14} />
                                                {new Date(invite.detection_timestamp).toLocaleString()}
                                            </span>
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
                <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Previous
                    </button>
                    <span className="text-sm text-slate-600">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    )
}
