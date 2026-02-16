import { Search, Filter, Calendar } from 'lucide-react'

const EMPTY_FILTERS = { education: '', skill: '', location: '', dateFrom: '', dateTo: '' }

const SearchAndFilters = ({
    searchQuery,
    setSearchQuery,
    searchPlaceholder,
    showFilters,
    setShowFilters,
    filters,
    setFilters,
    filterType = 'employer'
}) => {
    const activeFilterCount = Object.values(filters).filter(v => v).length

    return (
        <div className="mb-6 space-y-4">
            <div className="flex gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder={searchPlaceholder}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-slate-900/80 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-sm"
                    />
                </div>
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                        showFilters || activeFilterCount > 0
                            ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
                            : 'border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                >
                    <Filter className="w-4 h-4" />
                    Filters
                    {activeFilterCount > 0 && (
                        <span className="bg-indigo-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                            {activeFilterCount}
                        </span>
                    )}
                </button>
            </div>

            {/* Advanced Filters Panel */}
            {showFilters && (
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 animate-fade-in">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filterType === 'jobseeker' && (
                            <>
                                <div>
                                    <label className="text-xs text-slate-400 mb-1.5 block">Education Level</label>
                                    <select
                                        value={filters.education}
                                        onChange={(e) => setFilters(prev => ({ ...prev, education: e.target.value }))}
                                        className="input-select-dark"
                                    >
                                        <option value="">All Levels</option>
                                        <option value="Elementary Graduate">Elementary Graduate</option>
                                        <option value="High School Graduate">High School Graduate</option>
                                        <option value="Senior High School Graduate">Senior High School Graduate</option>
                                        <option value="Vocational/Technical Graduate">Vocational/Technical</option>
                                        <option value="College Undergraduate">College Undergraduate</option>
                                        <option value="College Graduate">College Graduate</option>
                                        <option value="Masteral Degree">Masteral Degree</option>
                                        <option value="Doctoral Degree">Doctoral Degree</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs text-slate-400 mb-1.5 block">Skill</label>
                                    <input
                                        type="text"
                                        value={filters.skill}
                                        onChange={(e) => setFilters(prev => ({ ...prev, skill: e.target.value }))}
                                        placeholder="e.g. Microsoft Excel"
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 text-sm focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                    />
                                </div>
                            </>
                        )}

                        <div>
                            <label className="text-xs text-slate-400 mb-1.5 block">Location</label>
                            <input
                                type="text"
                                value={filters.location}
                                onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                                placeholder={filterType === 'employer' ? 'City, Province, or Address' : 'City or Province'}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 text-sm focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                            />
                        </div>

                        <div>
                            <label className="text-xs text-slate-400 mb-1.5 block flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Registered From
                            </label>
                            <input
                                type="date"
                                value={filters.dateFrom}
                                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                            />
                        </div>

                        <div>
                            <label className="text-xs text-slate-400 mb-1.5 block flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Registered To
                            </label>
                            <input
                                type="date"
                                value={filters.dateTo}
                                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                            />
                        </div>

                        <div className="flex items-end">
                            <button
                                onClick={() => setFilters(EMPTY_FILTERS)}
                                className="w-full px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 text-sm font-medium transition-colors"
                            >
                                Clear Filters
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export { SearchAndFilters, EMPTY_FILTERS }
export default SearchAndFilters
