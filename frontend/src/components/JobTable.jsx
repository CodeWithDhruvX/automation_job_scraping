import { ExternalLink, CheckCircle, XCircle, EyeOff, TrendingUp, Award, ArrowUpDown } from 'lucide-react'
import { useState, useMemo } from 'react'

export function JobTable({ jobs }) {
    const [sortBy, setSortBy] = useState('salary-desc') // Default: highest salary first

    // Helper to extract numeric salary for sorting
    const getSalaryValue = (job) => {
        if (job.max_amount) return parseInt(job.max_amount)
        if (job.min_amount) return parseInt(job.min_amount)
        return 0
    }

    // Helper to determine if it's a high-paying job
    const isHighPaying = (job) => {
        const maxSalary = job.max_amount ? parseInt(job.max_amount) : 0
        return maxSalary >= 150000
    }

    const isPremiumPaying = (job) => {
        const maxSalary = job.max_amount ? parseInt(job.max_amount) : 0
        return maxSalary >= 200000
    }

    // Sort jobs
    const sortedJobs = useMemo(() => {
        const jobsCopy = [...jobs]

        if (sortBy === 'salary-desc') {
            return jobsCopy.sort((a, b) => getSalaryValue(b) - getSalaryValue(a))
        } else if (sortBy === 'salary-asc') {
            return jobsCopy.sort((a, b) => getSalaryValue(a) - getSalaryValue(b))
        } else if (sortBy === 'date') {
            return jobsCopy // Keep original order (usually newest first)
        }

        return jobsCopy
    }, [jobs, sortBy])

    // Format salary with badges
    const formatSalary = (job) => {
        const hasData = job.min_amount && job.max_amount
        if (!hasData) return 'N/A'

        const minFormatted = parseInt(job.min_amount).toLocaleString()
        const maxFormatted = parseInt(job.max_amount).toLocaleString()

        return (
            <div className="flex items-center gap-2">
                <span className="font-medium text-slate-700">${minFormatted} - ${maxFormatted}</span>
                {isPremiumPaying(job) && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                        <Award size={10} />
                        Premium
                    </span>
                )}
                {isHighPaying(job) && !isPremiumPaying(job) && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
                        <TrendingUp size={10} />
                        High Pay
                    </span>
                )}
            </div>
        )
    }

    if (!jobs.length) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <p>No jobs found. Start a scrape!</p>
            </div>
        )
    }

    // Calculate stats
    const jobsWithSalary = jobs.filter(j => j.min_amount && j.max_amount)
    const avgSalary = jobsWithSalary.length > 0
        ? Math.round(jobsWithSalary.reduce((sum, j) => sum + getSalaryValue(j), 0) / jobsWithSalary.length)
        : 0
    const maxSalary = jobsWithSalary.length > 0
        ? Math.max(...jobsWithSalary.map(getSalaryValue))
        : 0

    return (
        <div className="space-y-3">
            {/* Stats Bar */}
            <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg px-4 py-3 border border-blue-100">
                <div className="flex items-center gap-6 text-sm">
                    <div>
                        <span className="text-slate-500">Total Jobs: </span>
                        <span className="font-semibold text-slate-900">{jobs.length}</span>
                    </div>
                    <div>
                        <span className="text-slate-500">With Salary: </span>
                        <span className="font-semibold text-slate-900">{jobsWithSalary.length}</span>
                    </div>
                    {avgSalary > 0 && (
                        <>
                            <div>
                                <span className="text-slate-500">Avg Max: </span>
                                <span className="font-semibold text-emerald-700">${avgSalary.toLocaleString()}</span>
                            </div>
                            <div>
                                <span className="text-slate-500">Highest: </span>
                                <span className="font-semibold text-purple-700">${maxSalary.toLocaleString()}</span>
                            </div>
                        </>
                    )}
                </div>

                {/* Sort Control */}
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Sort by:</span>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="px-3 py-1.5 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                        <option value="salary-desc">💰 Highest Salary</option>
                        <option value="salary-asc">💸 Lowest Salary</option>
                        <option value="date">📅 Most Recent</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-slate-900 font-medium border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4">Title</th>
                            <th className="px-6 py-4">Company</th>
                            <th className="px-6 py-4">Location</th>
                            <th className="px-6 py-4">
                                <div className="flex items-center gap-1">
                                    Salary
                                    <ArrowUpDown size={14} className="text-slate-400" />
                                </div>
                            </th>
                            <th className="px-6 py-4">Posted</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {sortedJobs.map((job, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-6 py-4 font-medium text-slate-900 max-w-md truncate">
                                    <div className="truncate" title={job.title}>{job.title || 'N/A'}</div>
                                </td>
                                <td className="px-6 py-4">{job.company || 'N/A'}</td>
                                <td className="px-6 py-4">{job.location || job.city || 'N/A'}</td>
                                <td className="px-6 py-4">
                                    {formatSalary(job)}
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
                                            onClick={() => window.open(job.job_url, '_blank')}
                                        >
                                            <ExternalLink size={16} />
                                        </button>
                                        <button title="Mark Applied" className="p-1 hover:bg-slate-200 rounded text-green-600">
                                            <CheckCircle size={16} />
                                        </button>
                                        <button title="Hide" className="p-1 hover:bg-slate-200 rounded text-slate-400">
                                            <EyeOff size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
