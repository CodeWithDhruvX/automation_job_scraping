import { ExternalLink, CheckCircle, XCircle, EyeOff } from 'lucide-react'

export function JobTable({ jobs }) {
    if (!jobs.length) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <p>No jobs found. Start a scrape!</p>
            </div>
        )
    }

    return (
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
                        <tr key={idx} className="hover:bg-slate-50 transition-colors group">
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
    )
}
