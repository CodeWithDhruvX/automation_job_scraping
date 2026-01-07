import { useState, useEffect } from 'react'
import axios from 'axios'
import { X, Layout, ChevronRight, Settings } from 'lucide-react'
import { JobTable } from './JobTable'

const api = axios.create({
    baseURL: 'http://localhost:8000/api'
})

export function SmartTabView({ onClose, smartTabIds, onManageTabs, savedJobs, onToggleSave, onSave }) {
    const [searches, setSearches] = useState([])
    const [activeTabId, setActiveTabId] = useState(null)
    const [activeJobs, setActiveJobs] = useState([])
    const [loading, setLoading] = useState(false)
    const [selectedJobUrls, setSelectedJobUrls] = useState([])
    const [selectedSidebarIds, setSelectedSidebarIds] = useState([])

    // 1. Fetch search metadata for sidebar
    useEffect(() => {
        const fetchSearches = async () => {
            try {
                const res = await api.get('/searches')
                // Filter only the ones selected in "Smart Tabs"
                const relevantSearches = res.data.filter(s => smartTabIds.includes(s.search_id))
                setSearches(relevantSearches)

                // Set first tab as active if none selected yet, or if current selection is invalid
                if (relevantSearches.length > 0 && (!activeTabId || !relevantSearches.find(s => s.search_id === activeTabId))) {
                    setActiveTabId(relevantSearches[0].search_id)
                }
            } catch (err) {
                console.error("Failed to fetch searches in Smart Tab View", err)
            }
        }

        fetchSearches()
    }, [smartTabIds]) // Re-fetch when the ID list changes

    // 2. Fetch jobs when active tab changes
    useEffect(() => {
        if (!activeTabId) {
            setActiveJobs([])
            return
        }

        const fetchTabJobs = async () => {
            // Safety: Clear old data immediately to prevent ghosting
            setActiveJobs([])
            setLoading(true)

            try {
                const res = await api.get('/jobs', { params: { search_id: activeTabId } })
                setActiveJobs(res.data)
            } catch (err) {
                console.error(`Failed to fetch jobs for tab ${activeTabId}`, err)
            } finally {
                setLoading(false)
            }
        }

        fetchTabJobs()
        setSelectedJobUrls([]) // Reset selection on tab switch
    }, [activeTabId])

    const activeSearchMeta = searches.find(s => s.search_id === activeTabId)

    const handleSidebarSelect = (id) => {
        setSelectedSidebarIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        )
    }

    const handleSelectAllSidebar = () => {
        if (selectedSidebarIds.length === searches.length) {
            setSelectedSidebarIds([])
        } else {
            setSelectedSidebarIds(searches.map(s => s.search_id))
        }
    }

    const handleRemoveSelectedTabs = () => {
        if (window.confirm(`Remove ${selectedSidebarIds.length} tab(s) from Smart View?`)) {
            const newIds = smartTabIds.filter(id => !selectedSidebarIds.includes(id))
            onSave(newIds)
            setSelectedSidebarIds([])
            // Handle case where active tab is removed
            if (selectedSidebarIds.includes(activeTabId)) {
                setActiveTabId(null)
            }
        }
    }

    return (
        <div className="fixed inset-0 z-40 bg-slate-50 flex flex-col animate-in slide-in-from-right-10 duration-200">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="bg-fuchsia-600 p-2 rounded-lg text-white shadow-md shadow-fuchsia-200">
                        <Layout size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            Smart Tabs
                            <span className="px-2 py-0.5 rounded-full bg-fuchsia-100 text-fuchsia-700 text-xs font-bold border border-fuchsia-200 uppercase tracking-wide">Beta</span>
                        </h1>
                        <p className="text-xs text-slate-500 font-medium">Focused View</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={onManageTabs}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                        <Settings size={16} />
                        Manage Tabs
                    </button>
                    <div className="h-6 w-px bg-slate-200 mx-1"></div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>
            </div>

            {/* Main Layout */}
            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar */}
                <div className="w-72 bg-white border-r border-slate-200 flex flex-col overflow-y-auto">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                className="rounded border-slate-300 text-fuchsia-600 focus:ring-fuchsia-500"
                                checked={searches.length > 0 && selectedSidebarIds.length === searches.length}
                                onChange={handleSelectAllSidebar}
                                disabled={searches.length === 0}
                            />
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">My Tabs</h3>
                        </div>
                        {selectedSidebarIds.length > 0 && (
                            <button
                                onClick={handleRemoveSelectedTabs}
                                className="text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded font-medium transition-colors"
                            >
                                Remove ({selectedSidebarIds.length})
                            </button>
                        )}
                    </div>

                    <div className="p-2 space-y-1">
                        {searches.length === 0 && (
                            <div className="text-sm text-slate-500 italic p-4 text-center">
                                No tabs selected.<br />Click "Manage Tabs" to add.
                            </div>
                        )}
                        {searches.map(search => (
                            <div
                                key={search.search_id}
                                className={`
                                    w-full flex items-center gap-2 p-2 rounded-lg transition-all group relative
                                    ${activeTabId === search.search_id
                                        ? 'bg-fuchsia-50 border border-fuchsia-100 shadow-sm'
                                        : 'hover:bg-slate-50 border border-transparent'
                                    }
                                `}
                            >
                                <input
                                    type="checkbox"
                                    className="rounded border-slate-300 text-fuchsia-600 focus:ring-fuchsia-500 ml-1"
                                    checked={selectedSidebarIds.includes(search.search_id)}
                                    onChange={(e) => {
                                        e.stopPropagation()
                                        handleSidebarSelect(search.search_id)
                                    }}
                                />
                                <button
                                    onClick={() => setActiveTabId(search.search_id)}
                                    className="flex-1 text-left min-w-0 flex items-center justify-between"
                                >
                                    <div className="truncate pr-2">
                                        <div className={`truncate text-sm font-medium ${activeTabId === search.search_id ? 'text-fuchsia-700' : 'text-slate-700'}`}>
                                            {search.search_query}
                                        </div>
                                        <div className="text-xs opacity-70 truncate text-slate-500">{search.search_location}</div>
                                    </div>
                                </button>

                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            if (window.confirm(`Remove "${search.search_query}" from Smart View?`)) {
                                                const newIds = smartTabIds.filter(id => id !== search.search_id)
                                                onSave(newIds)
                                                // Handle active
                                                if (activeTabId === search.search_id) {
                                                    setActiveTabId(null)
                                                }
                                                // Handle selection
                                                if (selectedSidebarIds.includes(search.search_id)) {
                                                    setSelectedSidebarIds(prev => prev.filter(id => id !== search.search_id))
                                                }
                                            }
                                        }}
                                        className="p-1.5 rounded hover:bg-slate-200 text-slate-400 hover:text-red-600 transition-colors"
                                        title="Remove from View"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>

                                {activeTabId === search.search_id && (
                                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-fuchsia-600 rounded-l"></div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden flex flex-col bg-slate-50/50">
                    {activeTabId ? (
                        <>
                            <div className="p-6 pb-2">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-800">
                                            {activeSearchMeta?.search_query || 'Loading...'}
                                        </h2>
                                        <div className="flex items-center gap-2 text-sm text-slate-500">
                                            <span>{activeSearchMeta?.search_location}</span>
                                            <span>•</span>
                                            <span>{activeJobs.length} Jobs</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto px-6 pb-6">
                                {loading ? (
                                    <div className="flex items-center justify-center h-64">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fuchsia-600"></div>
                                    </div>
                                ) : (
                                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                        <JobTable
                                            jobs={activeJobs}
                                            savedJobs={savedJobs}
                                            onToggleSave={onToggleSave}
                                            selectedJobUrls={selectedJobUrls}
                                            onSelectionChange={setSelectedJobUrls}
                                            // Pass any update handlers you need, or dummy ones if read-only logic differs
                                            onJobUpdate={(updatedJob) => {
                                                // Optimistic update for local list
                                                setActiveJobs(prev => prev.map(j => j.job_url === updatedJob.job_url ? updatedJob : j))
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                            <Layout size={48} className="mb-4 opacity-20" />
                            <p className="font-medium">Select a tab from the sidebar to view jobs</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
