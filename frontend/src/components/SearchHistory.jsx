import { History, Clock, Trash2, MapPin, Tag, DollarSign } from 'lucide-react'

export function SearchHistory({ history, onSelectHistory, onClearHistory }) {
    const formatDate = (timestamp) => {
        const date = new Date(timestamp)
        const now = new Date()
        const diffMs = now - date
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMs / 3600000)
        const diffDays = Math.floor(diffMs / 86400000)

        if (diffMins < 1) return 'Just now'
        if (diffMins < 60) return `${diffMins}m ago`
        if (diffHours < 24) return `${diffHours}h ago`
        if (diffDays === 1) return 'Yesterday'
        if (diffDays < 7) return `${diffDays}d ago`

        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }

    const getActiveSites = (sites) => {
        return Object.entries(sites)
            .filter(([_, active]) => active)
            .map(([site]) => site.replace('_', ' '))
            .join(', ')
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm min-h-[520px] flex flex-col sticky top-24"
            style={{ maxHeight: 'calc(100vh - 8rem)' }}
        >
            {/* Header */}
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-slate-700 font-semibold">
                    <History size={18} />
                    Search History
                </div>
                {history.length > 0 && (
                    <button
                        onClick={onClearHistory}
                        className="text-xs text-slate-500 hover:text-red-600 transition-colors flex items-center gap-1"
                        title="Clear all history"
                    >
                        <Trash2 size={14} />
                        Clear
                    </button>
                )}
            </div>

            {/* History List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12 px-4">
                        <div className="bg-slate-100 p-4 rounded-full mb-3">
                            <History size={32} className="text-slate-400" />
                        </div>
                        <p className="text-sm text-slate-500">No search history yet</p>
                        <p className="text-xs text-slate-400 mt-1">Your searches will appear here</p>
                    </div>
                ) : (
                    history.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => onSelectHistory(item.filters)}
                            className="p-3 border border-slate-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-all group"
                        >
                            {/* Title & Time */}
                            <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-sm text-slate-800 truncate group-hover:text-blue-700">
                                        {item.filters.title || 'Untitled Search'}
                                    </h4>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-slate-400">
                                    <Clock size={12} />
                                    {formatDate(item.timestamp)}
                                </div>
                            </div>

                            {/* Location */}
                            {item.filters.location && (
                                <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-1">
                                    <MapPin size={12} className="text-slate-400" />
                                    <span className="truncate">{item.filters.location}</span>
                                </div>
                            )}

                            {/* Experience */}
                            {item.filters.experience && (
                                <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-1">
                                    <Tag size={12} className="text-slate-400" />
                                    <span>{item.filters.experience}</span>
                                </div>
                            )}

                            {/* Salary Range */}
                            {(item.filters.salaryMin || item.filters.salaryMax) && (
                                <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-2">
                                    <DollarSign size={12} className="text-slate-400" />
                                    <span>
                                        {item.filters.salaryMin && `$${parseInt(item.filters.salaryMin).toLocaleString()}`}
                                        {item.filters.salaryMin && item.filters.salaryMax && ' - '}
                                        {item.filters.salaryMax && `$${parseInt(item.filters.salaryMax).toLocaleString()}`}
                                    </span>
                                </div>
                            )}

                            {/* Sites */}
                            <div className="flex flex-wrap gap-1">
                                {Object.entries(item.filters.sites).map(([site, active]) => (
                                    active && (
                                        <span
                                            key={site}
                                            className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs capitalize group-hover:bg-blue-100 group-hover:text-blue-700"
                                        >
                                            {site.replace('_', ' ')}
                                        </span>
                                    )
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Footer */}
            {history.length > 0 && (
                <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 text-xs text-slate-500 text-center">
                    {history.length} {history.length === 1 ? 'search' : 'searches'} saved
                </div>
            )}
        </div>
    )
}
