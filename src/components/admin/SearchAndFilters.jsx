import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import { ArrowDownAZ, ArrowUpZA, Calendar, Check, ChevronDown, Filter, Search } from 'lucide-react'

const EMPTY_FILTERS = {
    education: '',
    skill: '',
    location: '',
    dateFrom: '',
    dateTo: '',
    verificationStatus: 'all',
    role: 'all',
}

const AdminFilterSelect = ({ label, value, options, onChange }) => {
    const [isOpen, setIsOpen] = useState(false)
    const [dropdownStyle, setDropdownStyle] = useState(null)
    const containerRef = useRef(null)
    const triggerRef = useRef(null)
    const dropdownRef = useRef(null)
    const selectedOption = options.find((option) => option.value === value) || options[0]

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    useEffect(() => {
        if (!isOpen) {
            setDropdownStyle(null)
            return
        }

        const updateDropdownPosition = () => {
            const triggerRect = triggerRef.current?.getBoundingClientRect()
            const dropdownHeight = dropdownRef.current?.offsetHeight || 280
            if (!triggerRect) return

            const spaceBelow = window.innerHeight - triggerRect.bottom
            const spaceAbove = triggerRect.top
            const shouldOpenUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow
            const top = shouldOpenUpward
                ? Math.max(12, triggerRect.top - dropdownHeight - 8)
                : Math.min(window.innerHeight - dropdownHeight - 12, triggerRect.bottom + 8)

            setDropdownStyle({
                top,
                left: triggerRect.left,
                width: triggerRect.width,
            })
        }

        updateDropdownPosition()
        window.addEventListener('resize', updateDropdownPosition)
        window.addEventListener('scroll', updateDropdownPosition, true)

        return () => {
            window.removeEventListener('resize', updateDropdownPosition)
            window.removeEventListener('scroll', updateDropdownPosition, true)
        }
    }, [isOpen, options.length])

    return (
        <div className="relative" ref={containerRef}>
            <label className="text-xs text-slate-400 mb-1.5 block">{label}</label>
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setIsOpen(prev => !prev)}
                className={`w-full flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition-all ${
                    isOpen
                        ? 'border-indigo-500/60 bg-slate-800 shadow-[0_0_0_3px_rgba(99,102,241,0.12)]'
                        : 'border-slate-700 bg-slate-800/95 hover:border-slate-600'
                }`}
            >
                <div className="min-w-0">
                    <span className="block text-sm font-medium text-slate-100">{selectedOption?.label}</span>
                    <span className="block text-xs text-slate-400 truncate mt-0.5">{label}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && dropdownStyle && createPortal(
                <div
                    ref={dropdownRef}
                    className="fixed z-[1200] overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/60"
                    style={dropdownStyle}
                >
                    <div className="border-b border-slate-800 bg-slate-900 px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
                    </div>
                    <div
                        className="p-2 bg-slate-900"
                        style={{
                            maxHeight: options.length > 6 ? '18rem' : 'none',
                            overflowY: options.length > 6 ? 'auto' : 'visible',
                            scrollbarWidth: 'thin',
                            scrollbarColor: '#475569 #0f172a',
                        }}
                    >
                        {options.map((option) => {
                            const isSelected = option.value === value

                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                        onChange(option.value)
                                        setIsOpen(false)
                                    }}
                                    className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                                        isSelected
                                            ? 'bg-indigo-500/15 text-indigo-100 ring-1 ring-inset ring-indigo-500/30'
                                            : 'text-slate-200 hover:bg-slate-800/90'
                                    }`}
                                >
                                    <div className="min-w-0">
                                        <span className="block text-sm font-medium">{option.label}</span>
                                        {option.description && (
                                            <span className="block text-xs text-slate-400 truncate mt-0.5">{option.description}</span>
                                        )}
                                    </div>
                                    {isSelected && <Check className="w-4 h-4 text-indigo-400 flex-shrink-0" />}
                                </button>
                            )
                        })}
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}

const SearchAndFilters = ({
    searchQuery,
    setSearchQuery,
    searchPlaceholder,
    showFilters,
    setShowFilters,
    filters,
    setFilters,
    filterType = 'employer',
    sortOrder = 'desc',
    setSortOrder,
    showRoleFilter = false,
    showVerificationFilter = true,
}) => {
    const activeFilterCount = Object.values(filters).filter(v => v && v !== 'all').length
    const sortLabel = sortOrder === 'asc' ? 'Oldest -> Latest' : 'Latest -> Oldest'

    return (
        <div className="mb-6 space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row">
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
                <div className="flex gap-3">
                    {setSortOrder && (
                        <button
                            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-800 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 transition-all whitespace-nowrap"
                        >
                            {sortOrder === 'asc'
                                ? <ArrowDownAZ className="w-4 h-4" />
                                : <ArrowUpZA className="w-4 h-4" />
                            }
                            {sortLabel}
                        </button>
                    )}
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
            </div>

            {/* Advanced Filters Panel */}
            {showFilters && (
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 animate-fade-in">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {showVerificationFilter && (
                            <AdminFilterSelect
                                label="Verification Status"
                                value={filters.verificationStatus}
                                onChange={(nextValue) => setFilters(prev => ({ ...prev, verificationStatus: nextValue }))}
                                options={[
                                    { value: 'all', label: 'All Statuses', description: 'See every verification state in one list' },
                                    { value: 'pending', label: 'Pending', description: 'Focus on accounts waiting for review' },
                                    { value: 'approved', label: 'Approved', description: 'Show accounts already cleared by admins' },
                                    { value: 'rejected', label: 'Rejected', description: 'Review denied registrations and reasons' },
                                    { value: 'expired', label: 'Expired', description: 'Find users needing renewed verification' },
                                ]}
                            />
                        )}

                        {showRoleFilter && (
                            <AdminFilterSelect
                                label="Role"
                                value={filters.role}
                                onChange={(nextValue) => setFilters(prev => ({ ...prev, role: nextValue }))}
                                options={[
                                    { value: 'all', label: 'All Roles', description: 'Search across employers and jobseekers' },
                                    { value: 'employer', label: 'Employer', description: 'Limit results to hiring organizations' },
                                    { value: 'jobseeker', label: 'Jobseeker', description: 'Focus on candidate registrations' },
                                ]}
                            />
                        )}

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
