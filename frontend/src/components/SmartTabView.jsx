import { useState, useEffect } from 'react'
import axios from 'axios'
import { X, Layout, ChevronRight, Settings, ChevronLeft, PanelLeftClose, PanelLeftOpen, Pencil } from 'lucide-react'
import { JobTable } from './JobTable'

const api = axios.create({
    baseURL: 'http://localhost:8000/api'
})

export function SmartTabView({ onClose, smartTabs, onManageTabs, savedJobs, onToggleSave, onSave, onRenameTab }) {
    const [searches, setSearches] = useState([])
    const [activeTabId, setActiveTabId] = useState(null)
    const [activeJobs, setActiveJobs] = useState([])
    const [loading, setLoading] = useState(false)
    const [selectedJobUrls, setSelectedJobUrls] = useState([])
    const [selectedSidebarIds, setSelectedSidebarIds] = useState([])
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(true)

    // Renaming state
    const [editingTabId, setEditingTabId] = useState(null)
    const [tempName, setTempName] = useState('')

    // 1. Fetch search metadata for sidebar
    useEffect(() => {
        const fetchSearches = async () => {
            try {
                const res = await api.get('/searches')
                // Filter only the ones selected in "Smart Tabs"
                const relevantSearches = res.data.filter(s => smartTabs.find(t => t.id === s.search_id))
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
    }, [smartTabs]) // Re-fetch when the list changes

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
                // Filter out hidden jobs
                const visibleJobs = res.data.filter(j => j.my_status !== 'HIDDEN')
                setActiveJobs(visibleJobs)
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
            // Filter out removing IDs from the object list
            const newSmartTabs = smartTabs.filter(t => !selectedSidebarIds.includes(t.id))
            onSave(newSmartTabs)
            setSelectedSidebarIds([])
            // Handle case where active tab is removed
            if (selectedSidebarIds.includes(activeTabId)) {
                setActiveTabId(null)
            }
        }
    }

    const handleDeleteJob = async (job) => {
        if (window.confirm('Are you sure you want to delete this job?')) {
            try {
                // Use encodeURIComponent for the URL parameter
                await api.delete(`/jobs/detail?url=${encodeURIComponent(job.job_url)}`)

                // Update local state by removing the job
                setActiveJobs(prev => prev.filter(j => j.job_url !== job.job_url))

                // If it was in saved jobs, remove it there too (optional, but good for consistency)
                if (savedJobs.some(j => j.job_url === job.job_url)) {
                    onToggleSave(job)
                }

            } catch (err) {
                console.error('Failed to delete job:', err)
                alert('Failed to delete job: ' + err.message)
            }
        }
    }

    // Helper to get display label
    const getTabLabel = (search) => {
        const tab = smartTabs.find(t => t.id === search.search_id)
        return tab?.label || search.search_query
    }

    const startRenaming = (e, search) => {
        e.stopPropagation()
        setEditingTabId(search.search_id)
        setTempName(getTabLabel(search))
    }

    const saveRename = () => {
        if (editingTabId) {
            // Save even if empty? Prefer falling back to default if empty or just trim
            // But user might want to persist "empty" to mean default. 
            // Let's say if empty, we revert to null (default)
            const finalName = tempName.trim() || null
            onRenameTab(editingTabId, finalName)
        }
        setEditingTabId(null)
        setTempName('')
    }

    const cancelRename = () => {
        setEditingTabId(null)
        setTempName('')
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
                <div
                    className={`
                        bg-white border-r border-slate-200 flex flex-col overflow-y-auto transition-all duration-300 ease-in-out
                        ${isSidebarExpanded ? 'w-72' : 'w-14 items-center'}
                    `}
                >
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10 w-full">
                        {isSidebarExpanded ? (
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
                        ) : (
                            <div className="flex justify-center w-full">
                                <Layout size={16} className="text-slate-400" />
                            </div>
                        )}

                        {isSidebarExpanded && selectedSidebarIds.length > 0 && (
                            <button
                                onClick={handleRemoveSelectedTabs}
                                className="text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded font-medium transition-colors"
                            >
                                Remove ({selectedSidebarIds.length})
                            </button>
                        )}

                        <button
                            onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
                            className={`
                                text-slate-400 hover:text-slate-600 transition-colors p-1 rounded hover:bg-slate-100
                                ${!isSidebarExpanded && 'mt-2'}
                            `}
                            title={isSidebarExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
                        >
                            {isSidebarExpanded ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
                        </button>
                    </div>

                    <div className={`p-2 space-y-1 w-full ${!isSidebarExpanded && 'flex flex-col items-center'}`}>
                        {searches.length === 0 && isSidebarExpanded && (
                            <div className="text-sm text-slate-500 italic p-4 text-center">
                                No tabs selected.<br />Click "Manage Tabs" to add.
                            </div>
                        )}
                        {searches.map(search => (
                            <div
                                key={search.search_id}
                                className={`
                                    flex items-center gap-2 p-2 rounded-lg transition-all group relative cursor-pointer
                                    ${activeTabId === search.search_id
                                        ? 'bg-fuchsia-50 border border-fuchsia-100 shadow-sm'
                                        : 'hover:bg-slate-50 border border-transparent'
                                    }
                                    ${isSidebarExpanded ? 'w-full' : 'justify-center w-10 h-10'}
                                `}
                                onClick={() => setActiveTabId(search.search_id)}
                                title={!isSidebarExpanded ? getTabLabel(search) : ''}
                            >
                                {isSidebarExpanded && (
                                    <input
                                        type="checkbox"
                                        className="rounded border-slate-300 text-fuchsia-600 focus:ring-fuchsia-500 ml-1"
                                        checked={selectedSidebarIds.includes(search.search_id)}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) => {
                                            handleSidebarSelect(search.search_id)
                                        }}
                                    />
                                )}

                                {isSidebarExpanded ? (
                                    <div className="flex-1 text-left min-w-0">
                                        {editingTabId === search.search_id ? (
                                            <input
                                                type="text"
                                                value={tempName}
                                                onChange={(e) => setTempName(e.target.value)}
                                                onBlur={saveRename}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') saveRename()
                                                    if (e.key === 'Escape') cancelRename()
                                                }}
                                                autoFocus
                                                onClick={(e) => e.stopPropagation()}
                                                className="w-full px-2 py-1 text-sm bg-white border border-fuchsia-300 rounded focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
                                            />
                                        ) : (
                                            <div className="truncate pr-2 group/label">
                                                <div className={`truncate text-sm font-medium ${activeTabId === search.search_id ? 'text-fuchsia-700' : 'text-slate-700'}`}>
                                                    {getTabLabel(search)}
                                                </div>
                                                <div className="text-xs opacity-70 truncate text-slate-500">{search.search_location}</div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <span className={`text-lg font-bold select-none ${activeTabId === search.search_id ? 'text-fuchsia-700' : 'text-slate-500'}`}>
                                        {getTabLabel(search).charAt(0).toUpperCase()}
                                    </span>
                                )}

                                {isSidebarExpanded && !editingTabId && (
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => startRenaming(e, search)}
                                            className="p-1.5 rounded hover:bg-slate-200 text-slate-400 hover:text-fuchsia-600 transition-colors"
                                            title="Rename Tab"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                if (window.confirm(`Remove "${getTabLabel(search)}" from Smart View?`)) {
                                                    const newSmartTabs = smartTabs.filter(t => t.id !== search.search_id)
                                                    onSave(newSmartTabs)
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
                                )}

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
                                        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                                            {activeSearchMeta && getTabLabel(activeSearchMeta)}
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
                                            onJobUpdate={(updatedJob) => {
                                                if (updatedJob.my_status === 'HIDDEN') {
                                                    setActiveJobs(prev => prev.filter(j => j.job_url !== updatedJob.job_url))
                                                } else {
                                                    // Optimistic update for local list
                                                    setActiveJobs(prev => prev.map(j => j.job_url === updatedJob.job_url ? updatedJob : j))
                                                }
                                            }}
                                            onDeleteJob={handleDeleteJob}
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
