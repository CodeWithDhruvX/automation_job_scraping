import { useState, useEffect } from 'react'
import axios from 'axios'
import { ExternalLink, CheckCircle, XCircle, EyeOff, X, Loader2 } from 'lucide-react'

const api = axios.create({
    baseURL: 'http://localhost:8000/api'
})

export function JobTable({ jobs, onJobUpdate }) {
    const [selectedJob, setSelectedJob] = useState(null)
    const [loadingDesc, setLoadingDesc] = useState(false)

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
    }, [selectedJob])

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

    if (!jobs.length) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <p>No jobs found. Start a scrape!</p>
            </div>
        )
    }

    return (
        <>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-slate-900 font-medium border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4">Title</th>
                            <th className="px-6 py-4">Company</th>
                            <th className="px-6 py-4">Location</th>
                            <th className="px-6 py-4">Salary</th>
                            <th className="px-6 py-4">Posted</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {jobs.map((job, idx) => (
                            <tr
                                key={idx}
                                onClick={() => setSelectedJob(job)}
                                className="hover:bg-slate-50 transition-colors group cursor-pointer"
                            >
                                <td className="px-6 py-4 font-medium text-slate-900 max-w-md truncate">
                                    <div className="truncate" title={job.title}>{job.title || 'N/A'}</div>
                                </td>
                                <td className="px-6 py-4">{job.company || 'N/A'}</td>
                                <td className="px-6 py-4">{job.location || job.city || 'N/A'}</td>
                                <td className="px-6 py-4 text-slate-500">
                                    {job.min_amount && job.max_amount ? `$${job.min_amount} - $${job.max_amount}` : 'N/A'}
                                </td>
                                <td className="px-6 py-4 text-slate-500">{job.date_posted || 'Recently'}</td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                  ${job.my_status === 'NEW' ? 'bg-green-100 text-green-700' : ''}
                  ${job.my_status === 'APPLIED' ? 'bg-blue-100 text-blue-700' : ''}
                  ${!job.my_status ? 'bg-slate-100 text-slate-600' : ''}
                `}>
                                        {job.my_status || 'NEW'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            title="Open Link"
                                            className="p-1 hover:bg-slate-200 rounded text-blue-600"
                                            onClick={(e) => { e.stopPropagation(); window.open(job.job_url, '_blank') }}
                                        >
                                            <ExternalLink size={16} />
                                        </button>
                                        <button
                                            title="Mark Applied"
                                            className="p-1 hover:bg-slate-200 rounded text-green-600"
                                            onClick={(e) => { e.stopPropagation(); /* TODO: Implement apply logic */ }}
                                        >
                                            <CheckCircle size={16} />
                                        </button>
                                        <button
                                            title="Hide"
                                            className="p-1 hover:bg-slate-200 rounded text-slate-400"
                                            onClick={(e) => { e.stopPropagation(); /* TODO: Implement hide logic */ }}
                                        >
                                            <EyeOff size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

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
                                <span className="px-3 py-1 text-xs font-semibold bg-slate-100 text-slate-600 rounded-full capitalize border border-slate-200">
                                    {selectedJob.site || 'Unknown Source'}
                                </span>
                            </div>

                            <div className="prose prose-slate max-w-none">
                                <h3 className="text-sm uppercase tracking-wider font-bold text-slate-400 mb-4">Description</h3>
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
                                Job ID: {selectedJob.id || 'N/A'} • Found {selectedJob.date_found ? new Date(selectedJob.date_found).toLocaleDateString() : 'Recently'}
                            </div>
                            <div className="flex gap-3 ml-auto">
                                <button
                                    onClick={() => setSelectedJob(null)}
                                    className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                                >
                                    Close
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
        </>
    )
}
