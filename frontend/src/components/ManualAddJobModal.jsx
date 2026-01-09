import { useState, useEffect } from 'react'
import { X, Sparkles, Loader2, Save, Link as LinkIcon } from 'lucide-react'
import axios from 'axios'

const api = axios.create({
    baseURL: 'http://localhost:8000/api'
})

export function ManualAddJobModal({ onClose, onJobAdded }) {
    const [url, setUrl] = useState('')
    const [loading, setLoading] = useState(false)
    const [magicLoading, setMagicLoading] = useState(false)

    const [formData, setFormData] = useState({
        title: '',
        company: '',
        location: '',
        site: 'Manual',
        job_type: '',
        description: '',
        min_amount: '',
        max_amount: ''
    })

    // Magic Paste Logic
    const handleMagicPaste = async (pastedUrl) => {
        if (!pastedUrl) return

        // Basic URL validation
        try {
            new URL(pastedUrl)
        } catch (e) {
            return // Not a valid URL yet
        }

        setMagicLoading(true)
        try {
            const res = await api.post('/utils/fetch-metadata', { url: pastedUrl })
            const { title, company, description, site } = res.data

            setFormData(prev => ({
                ...prev,
                title: title || prev.title,
                company: company || prev.company,
                description: description || prev.description,
                site: site || prev.site
            }))
        } catch (err) {
            console.error("Magic paste failed", err)
        } finally {
            setMagicLoading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!url) return

        setLoading(true)
        try {
            const jobPayload = {
                job_url: url,
                title: formData.title || 'Untitled Job',
                company: formData.company || 'Unknown Company',
                location: formData.location || 'Remote',
                site: formData.site,
                job_type: formData.job_type,
                description: formData.description,
                min_amount: formData.min_amount ? Number(formData.min_amount) : null,
                max_amount: formData.max_amount ? Number(formData.max_amount) : null,
                date_posted: new Date().toISOString().split('T')[0],
                found_at: new Date().toISOString()
            }

            await api.post('/jobs/import', { jobs: [jobPayload] })

            if (onJobAdded) onJobAdded()
            onClose()
        } catch (err) {
            console.error("Failed to add job", err)
            alert("Failed to save job. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <Sparkles className="text-amber-500" size={24} />
                            Add Job Manually
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">Paste a URL to auto-fill details, or enter them manually.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar">

                    {/* Magic Input */}
                    <div className="mb-8 relative">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Job Link (Magic Paste) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="url"
                                required
                                value={url}
                                onChange={(e) => {
                                    setUrl(e.target.value)
                                    // Debounce magic paste? Or just on blur?
                                    // Let's do on blur to avoid spamming while typing
                                }}
                                onBlur={(e) => handleMagicPaste(e.target.value)}
                                placeholder="https://nakuri.com/jobs/..."
                                className="w-full pl-10 pr-12 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm"
                            />
                            {magicLoading && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <Loader2 className="animate-spin text-amber-500" size={20} />
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 mt-2 ml-1">
                            Paste a link and click away to attempt auto-fill.
                        </p>
                    </div>

                    <form id="add-job-form" onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Job Title</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                                    placeholder="e.g. Senior Product Designer"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Company</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.company}
                                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                                    placeholder="e.g. Acme Corp"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                                    placeholder="e.g. New York, NY"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Site / Source</label>
                                <input
                                    type="text"
                                    value={formData.site}
                                    onChange={(e) => setFormData({ ...formData, site: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Job Type</label>
                                <select
                                    value={formData.job_type}
                                    onChange={(e) => setFormData({ ...formData, job_type: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 outline-none bg-white"
                                >
                                    <option value="">Select...</option>
                                    <option value="Full-time">Full-time</option>
                                    <option value="Part-time">Part-time</option>
                                    <option value="Contract">Contract</option>
                                    <option value="Internship">Internship</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Min Salary</label>
                                <input
                                    type="number"
                                    value={formData.min_amount}
                                    onChange={(e) => setFormData({ ...formData, min_amount: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 outline-none"
                                    placeholder="0"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Max Salary</label>
                                <input
                                    type="number"
                                    value={formData.max_amount}
                                    onChange={(e) => setFormData({ ...formData, max_amount: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 outline-none"
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={4}
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors resize-none"
                                placeholder="Paste or type job description here..."
                            />
                        </div>

                    </form>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="add-job-form"
                        disabled={loading || !url}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        Save Job
                    </button>
                </div>
            </div>
        </div>
    )
}
