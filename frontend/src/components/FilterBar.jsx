import { Filter, Play, Download, TrendingUp, DollarSign, Briefcase } from 'lucide-react'

export function FilterBar({ onScrape, onExport, isScraping, filters, onFiltersChange }) {
    const handleChange = (e) => {
        const { name, value } = e.target
        onFiltersChange(prev => ({ ...prev, [name]: value }))
    }

    const handleSiteChange = (site) => {
        onFiltersChange(prev => ({
            ...prev,
            sites: { ...prev.sites, [site]: !prev.sites[site] }
        }))
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        onScrape(filters)
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 relative overflow-hidden">
            <div className="flex items-center gap-2 mb-4 text-slate-700 font-semibold border-b border-slate-100 pb-2">
                <Filter size={18} />
                Search Filters
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Row 1: Title & Location */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Job Title / Keywords</label>
                        <input
                            type="text"
                            name="title"
                            value={filters.title}
                            onChange={handleChange}
                            placeholder="e.g. Software Engineer"
                            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 text-sm"
                            required
                        />
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-600 mt-1.5">
                            <input
                                type="checkbox"
                                name="exactMatchTitle"
                                checked={filters.exactMatchTitle || false}
                                onChange={(e) => onFiltersChange(prev => ({ ...prev, exactMatchTitle: e.target.checked }))}
                                className="rounded text-blue-600 focus:ring-blue-400"
                            />
                            <span>Exact match only</span>
                        </label>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Location</label>
                        <input
                            type="text"
                            name="location"
                            value={filters.location}
                            onChange={handleChange}
                            placeholder="e.g. Remote, NY"
                            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 text-sm"
                        />
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-600 mt-1.5">
                            <input
                                type="checkbox"
                                name="exactMatchLocation"
                                checked={filters.exactMatchLocation || false}
                                onChange={(e) => onFiltersChange(prev => ({ ...prev, exactMatchLocation: e.target.checked }))}
                                className="rounded text-blue-600 focus:ring-blue-400"
                            />
                            <span>Exact match only</span>
                        </label>
                    </div>
                </div>

                {/* Row 2: Experience & Date */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Experience</label>
                        <select
                            name="experience"
                            value={filters.experience}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white"
                        >
                            <option value="">Any</option>
                            <option value="Internship">Internship</option>
                            <option value="Entry Level">Entry Level</option>
                            <option value="Associate">Associate</option>
                            <option value="Mid-Senior">Mid-Senior</option>
                            <option value="Director">Director</option>
                            <option value="Executive">Executive</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Date Posted</label>
                        <select
                            name="datePosted"
                            value={filters.datePosted}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white"
                        >
                            <option value="24">Last 24h</option>
                            <option value="72">Last 3 Days</option>
                            <option value="168">Last 7 Days</option>
                            <option value="720">Last 30 Days</option>
                        </select>
                    </div>

                    {/* Row 2.5: Salary */}
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Min Salary</label>
                        <input
                            type="number"
                            name="salaryMin"
                            value={filters.salaryMin}
                            onChange={handleChange}
                            placeholder="0"
                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Max Salary</label>
                        <input
                            type="number"
                            name="salaryMax"
                            value={filters.salaryMax}
                            onChange={handleChange}
                            placeholder="0"
                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                        />
                    </div>
                </div>

                {/* Row 3: Smart Filters for High-Paying Jobs */}
                <div className="border-t border-slate-100 pt-3 pb-2">
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                            <TrendingUp size={14} />
                            Smart Filters:
                        </span>

                        {/* Quick Salary Filters */}
                        <button
                            type="button"
                            onClick={() => onFiltersChange(prev => ({ ...prev, salaryMin: '100000', salaryMax: '' }))}
                            className="px-3 py-1.5 text-xs font-medium rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors flex items-center gap-1.5 border border-emerald-200"
                        >
                            <DollarSign size={12} />
                            $100k+ Only
                        </button>
                        <button
                            type="button"
                            onClick={() => onFiltersChange(prev => ({ ...prev, salaryMin: '150000', salaryMax: '' }))}
                            className="px-3 py-1.5 text-xs font-medium rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors flex items-center gap-1.5 border border-emerald-200"
                        >
                            <DollarSign size={12} />
                            $150k+ Only
                        </button>
                        <button
                            type="button"
                            onClick={() => onFiltersChange(prev => ({ ...prev, salaryMin: '200000', salaryMax: '' }))}
                            className="px-3 py-1.5 text-xs font-medium rounded-md bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors flex items-center gap-1.5 border border-purple-200"
                        >
                            <DollarSign size={12} />
                            $200k+ Premium
                        </button>

                        {/* Senior Positions Filter */}
                        <button
                            type="button"
                            onClick={() => onFiltersChange(prev => ({ ...prev, experience: 'Mid-Senior' }))}
                            className="px-3 py-1.5 text-xs font-medium rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors flex items-center gap-1.5 border border-blue-200"
                        >
                            <Briefcase size={12} />
                            Senior+ Roles
                        </button>

                        {/* Hide jobs with no salary */}
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-700 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200 hover:bg-slate-100 transition-colors">
                            <input
                                type="checkbox"
                                name="hideNoSalary"
                                checked={filters.hideNoSalary || false}
                                onChange={(e) => onFiltersChange(prev => ({ ...prev, hideNoSalary: e.target.checked }))}
                                className="rounded text-blue-600 focus:ring-blue-400"
                            />
                            <span>Hide No Salary</span>
                        </label>
                    </div>
                </div>

                {/* Row 4: Sites & Actions */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-2">
                    {/* Sites */}
                    <div className="space-y-1">
                        <span className="text-xs font-medium text-slate-500">Sites</span>
                        <div className="flex gap-3">
                            {Object.keys(filters.sites).map(site => (
                                <label key={site} className="flex items-center gap-1.5 cursor-pointer text-sm text-slate-700">
                                    <input
                                        type="checkbox"
                                        checked={filters.sites[site]}
                                        onChange={() => handleSiteChange(site)}
                                        className="rounded text-blue-600 focus:ring-blue-400"
                                    />
                                    <span className="capitalize">{site.replace('_', ' ')}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onExport}
                            className="px-4 py-2 text-slate-600 bg-white border border-slate-300 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors flex items-center gap-2"
                        >
                            <Download size={16} />
                            Export
                        </button>
                        <button
                            type="submit"
                            disabled={isScraping}
                            className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-75 disabled:cursor-not-allowed"
                        >
                            <Play size={16} />
                            {isScraping ? 'Scraping...' : 'Start Scraper'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    )
}
