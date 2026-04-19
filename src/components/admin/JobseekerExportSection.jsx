import { useState, useMemo } from 'react'
import { Download, Search, Filter, X, AlertTriangle, FileText, Info } from 'lucide-react'
import {
    generateCsv,
    downloadCsv,
    buildExportFilename,
} from '../../utils/jobseekerCsvExport'
import { supabase } from '../../config/supabase'

// Switch to the server-side edge function above this row count to avoid
// serialising a very large dataset in the browser.
const LARGE_EXPORT_THRESHOLD = 5000

const EDUCATION_OPTIONS = [
    'Elementary Graduate',
    'High School Graduate',
    'Senior High School Graduate',
    'Vocational/Technical Graduate',
    'College Undergraduate',
    'College Graduate',
    'Masteral Degree',
    'Doctoral Degree',
]

const VERIFICATION_OPTIONS = [
    { value: 'all',      label: 'All Statuses' },
    { value: 'pending',  label: 'Pending' },
    { value: 'verified', label: 'Verified' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'expired',  label: 'Expired' },
]

const EMPTY_EXPORT_FILTERS = {
    keyword:            '',
    location:           '',
    education:          '',
    verificationStatus: 'all',
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const textIncludes = (field, query) =>
    (field || '').toLowerCase().includes(query)

const matchesKeyword = (jobseeker, query) => {
    if (!query) return true
    const q = query.toLowerCase()

    const buildDisplayName = (js) => {
        const parts = [js.first_name, js.middle_name, js.surname]
            .map(v => (typeof v === 'string' ? v.trim() : ''))
            .filter(Boolean)
            .join(' ')
        return parts || js.display_name || js.full_name || js.name || ''
    }

    if (textIncludes(buildDisplayName(jobseeker), q)) return true
    if (textIncludes(jobseeker.email, q)) return true

    const skills = [
        ...(Array.isArray(jobseeker.predefined_skills) ? jobseeker.predefined_skills : []),
        ...(Array.isArray(jobseeker.skills) ? jobseeker.skills : []),
    ]
    if (skills.some(s => textIncludes(s, q))) return true

    if (textIncludes(jobseeker.course_or_field, q)) return true

    if (Array.isArray(jobseeker.preferred_occupations)) {
        if (jobseeker.preferred_occupations.some(o => textIncludes(o, q))) return true
    }

    return false
}

const matchesLocation = (jobseeker, location) => {
    if (!location) return true
    const loc = location.toLowerCase()
    return (
        textIncludes(jobseeker.city, loc) ||
        textIncludes(jobseeker.province, loc) ||
        textIncludes(jobseeker.barangay, loc)
    )
}

const matchesEducation = (jobseeker, education) => {
    if (!education) return true
    return jobseeker.highest_education === education
}

const matchesVerification = (jobseeker, status) => {
    if (!status || status === 'all') return true
    const actual = jobseeker.jobseeker_status || (jobseeker.is_verified ? 'verified' : 'pending')
    return actual === status
}

const applyExportFilters = (jobseekers, filters) =>
    jobseekers.filter(
        js =>
            matchesKeyword(js, filters.keyword) &&
            matchesLocation(js, filters.location) &&
            matchesEducation(js, filters.education) &&
            matchesVerification(js, filters.verificationStatus)
    )

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const FilterInput = ({ label, placeholder, value, onChange, icon: Icon }) => (
    <div>
        <label className="text-xs text-slate-400 mb-1.5 block">{label}</label>
        <div className="relative">
            {Icon && (
                <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
            )}
            <input
                type="text"
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className={`w-full ${Icon ? 'pl-8' : 'pl-3'} pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 text-sm focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all`}
            />
        </div>
    </div>
)

const JobseekerExportSection = ({ jobseekers = [], adminId }) => {
    const [filters, setFilters] = useState(EMPTY_EXPORT_FILTERS)
    const [showFilters, setShowFilters] = useState(false)
    const [exporting, setExporting] = useState(false)

    const update = (key, value) => setFilters(prev => ({ ...prev, [key]: value }))

    const filtered = useMemo(
        () => applyExportFilters(jobseekers, filters),
        [jobseekers, filters]
    )

    const activeFilterCount = Object.entries(filters).filter(
        ([k, v]) => k !== 'verificationStatus' ? !!v : v !== 'all'
    ).length

    const handleClearFilters = () => setFilters(EMPTY_EXPORT_FILTERS)

    // Whitelist + clamp so a tampered filters object cannot write huge
    // blobs into admin_export_logs.filter_state. The DB trigger
    // trg_admin_export_logs_sanitize_filter_state provides the server-side
    // backstop; this keeps the payload small on the wire.
    const sanitizeFilterStateForAudit = (state) => {
        const clamp = (v, max = 200) =>
            typeof v === 'string' ? v.slice(0, max) : ''
        return {
            keyword: clamp(state?.keyword),
            location: clamp(state?.location),
            education: clamp(state?.education, 100),
            verificationStatus: clamp(state?.verificationStatus, 40) || 'all',
        }
    }

    const writeAuditLog = (rowCount) => {
        if (!adminId) return
        supabase.from('admin_export_logs').insert({
            admin_id: adminId,
            filter_state: sanitizeFilterStateForAudit(filters),
            row_count: rowCount,
        }).then(({ error }) => {
            if (error) console.warn('[export] audit log failed:', error.message)
        })
    }

    // Audit logging for large exports happens inside the edge function
    // (see supabase/functions/export-jobseekers-csv/index.ts) using its
    // service-role client + sanitized filters. Do NOT add a duplicate
    // writeAuditLog call here — the server record is the source of truth
    // for row_count (it reflects the actually-streamed rows).
    const handleExportLarge = async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) throw new Error('Not authenticated')

        const res = await supabase.functions.invoke('export-jobseekers-csv', {
            body: { filter_state: filters },
            headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (res.error) throw res.error

        const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' })
        const filename = buildExportFilename({ keyword: filters.keyword, location: filters.location })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }

    const handleExport = async () => {
        if (filtered.length === 0) return
        setExporting(true)
        try {
            if (filtered.length > LARGE_EXPORT_THRESHOLD) {
                await handleExportLarge()
            } else {
                const csv = generateCsv(filtered)
                const filename = buildExportFilename({
                    keyword: filters.keyword,
                    location: filters.location,
                })
                downloadCsv(csv, filename)
                writeAuditLog(filtered.length)
            }
        } catch (err) {
            console.error('[export] failed:', err)
        } finally {
            setExporting(false)
        }
    }

    return (
        <div className="animate-fade-in">
            {/* Section header */}
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-1">Jobseeker Export</h2>
                <p className="text-slate-400 text-sm">
                    Generate a CSV of filtered jobseeker records for walk-in employers.
                </p>
            </div>

            {/* Data disclaimer */}
            <div className="mb-6 flex items-start gap-3 p-4 bg-amber-500/8 border border-amber-500/20 rounded-xl">
                <Info className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-300/80 leading-relaxed">
                    The exported file contains personal data. Handle it in accordance with the
                    organization's data privacy policy and share only with authorized recipients.
                    Highly sensitive fields such as date of birth, full address, and government IDs
                    are excluded.
                </p>
            </div>

            {/* Search bar + filter toggle */}
            <div className="mb-4 space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search by name, skill, course, or occupation..."
                            value={filters.keyword}
                            onChange={e => update('keyword', e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-slate-900/80 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-sm"
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters(prev => !prev)}
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

                {/* Advanced filter panel */}
                {showFilters && (
                    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 animate-fade-in">
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <FilterInput
                                label="Location"
                                placeholder="City or Province"
                                value={filters.location}
                                onChange={v => update('location', v)}
                            />

                            <div>
                                <label className="text-xs text-slate-400 mb-1.5 block">
                                    Education Level
                                </label>
                                <select
                                    value={filters.education}
                                    onChange={e => update('education', e.target.value)}
                                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                >
                                    <option value="">All Levels</option>
                                    {EDUCATION_OPTIONS.map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs text-slate-400 mb-1.5 block">
                                    Verification Status
                                </label>
                                <select
                                    value={filters.verificationStatus}
                                    onChange={e => update('verificationStatus', e.target.value)}
                                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                >
                                    {VERIFICATION_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-end">
                                <button
                                    onClick={handleClearFilters}
                                    className="flex items-center gap-2 w-full px-3 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 text-sm font-medium transition-colors"
                                >
                                    <X className="w-3.5 h-3.5" />
                                    Clear Filters
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Result count + export button */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-500/15 rounded-xl flex items-center justify-center flex-shrink-0">
                            <FileText className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <p className="text-white font-semibold text-lg">
                                {filtered.length.toLocaleString()}{' '}
                                {filtered.length === 1 ? 'jobseeker' : 'jobseekers'} matched
                            </p>
                            <p className="text-slate-500 text-sm">
                                {jobseekers.length.toLocaleString()} total in database
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleExport}
                        disabled={filtered.length === 0 || exporting}
                        className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all text-sm"
                    >
                        <Download className="w-4 h-4" />
                        {exporting ? 'Generating...' : `Export ${filtered.length.toLocaleString()} to CSV`}
                    </button>
                </div>

                {/* Zero-result warning */}
                {filtered.length === 0 && (jobseekers.length > 0 || activeFilterCount > 0) && (
                    <div className="mt-4 flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                        <p className="text-sm text-amber-300/90">
                            No jobseekers match the current filters. Adjust or clear the filters to
                            include more records.
                        </p>
                    </div>
                )}
            </div>

            {/* Quick-pick occupation shortcuts */}
            <div className="mt-6">
                <p className="text-xs text-slate-500 mb-3 uppercase tracking-wide font-semibold">
                    Quick filters for common walk-in requests
                </p>
                <div className="flex flex-wrap gap-2">
                    {['IT', 'Virtual Assistant', 'Customer Service', 'Accounting', 'Nursing', 'Engineering'].map(tag => (
                        <button
                            key={tag}
                            onClick={() => update('keyword', filters.keyword === tag ? '' : tag)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                filters.keyword === tag
                                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                                    : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-slate-200 hover:bg-slate-800'
                            }`}
                        >
                            {tag}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}

export { JobseekerExportSection }
export default JobseekerExportSection
