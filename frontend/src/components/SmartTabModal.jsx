import { useState, useEffect } from 'react'
import { X, Check } from 'lucide-react'

export function SmartTabModal({ isOpen, onClose, allSearches, savedSmartTabIds, onSave }) {
    const [selectedIds, setSelectedIds] = useState([])

    useEffect(() => {
        if (isOpen) {
            setSelectedIds(savedSmartTabIds || [])
        }
    }, [isOpen, savedSmartTabIds])

    const toggleSelection = (id) => {
        setSelectedIds(prev =>
            prev.includes(id)
                ? prev.filter(i => i !== id)
                : [...prev, id]
        )
    }

    const handleSave = () => {
        onSave(selectedIds)
        onClose()
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-slate-100">
                    <h2 className="text-lg font-bold text-slate-900">Manage Smart Tabs</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 max-h-[60vh] overflow-y-auto">
                    <p className="text-sm text-slate-500 mb-4">
                        Select the tabs you want to see in your Smart Tab view.
                    </p>

                    {allSearches.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-lg">
                            No active search tabs found.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {allSearches.map(search => (
                                <label
                                    key={search.search_id}
                                    className={`
                                        flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all
                                        ${selectedIds.includes(search.search_id)
                                            ? 'bg-blue-50 border-blue-200 shadow-sm'
                                            : 'bg-white border-slate-200 hover:bg-slate-50'
                                        }
                                    `}
                                >
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className={`
                                            w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors
                                            ${selectedIds.includes(search.search_id)
                                                ? 'bg-blue-600 border-blue-600 text-white'
                                                : 'bg-white border-slate-300'
                                            }
                                        `}>
                                            {selectedIds.includes(search.search_id) && <Check size={12} strokeWidth={3} />}
                                        </div>
                                        <div className="truncate">
                                            <div className="font-medium text-slate-700 truncate">{search.search_query}</div>
                                            <div className="text-xs text-slate-500 truncate">{search.search_location} • {search.job_count} jobs</div>
                                        </div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={selectedIds.includes(search.search_id)}
                                        onChange={() => toggleSelection(search.search_id)}
                                    />
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        Save Selection
                    </button>
                </div>
            </div>
        </div>
    )
}
