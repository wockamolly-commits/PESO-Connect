import { Clock, CheckCircle, XCircle, Users, AlertTriangle, Loader2 } from 'lucide-react'
import { StatusTabs } from './StatusTabs'
import { SearchAndFilters } from './SearchAndFilters'
import { JobseekerCard } from './JobseekerCard'

const JobseekerVerificationSection = ({
    jobseekers,
    totalCount,
    hasMore,
    isFetching,
    isLoadingMore,
    onLoadMore,
    jobseekerCounts,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    showFilters,
    setShowFilters,
    filters,
    setFilters,
    sortOrder,
    setSortOrder,
    expandedId,
    setExpandedId,
    actionLoading,
    onApprove,
    onReject,
    onViewDocument,
    canApprove = true,
    canReject = true,
}) => {
    const tabs = [
        { id: 'pending', label: 'Pending', count: jobseekerCounts.pending, icon: Clock, activeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
        { id: 'verified', label: 'Verified', count: jobseekerCounts.verified, icon: CheckCircle, activeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
        { id: 'expired', label: 'Expired', count: jobseekerCounts.expired, icon: AlertTriangle, activeClass: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
        { id: 'rejected', label: 'Rejected', count: jobseekerCounts.rejected, icon: XCircle, activeClass: 'bg-red-500/15 text-red-400 border-red-500/30' },
        { id: 'all', label: 'All', count: jobseekerCounts.total, icon: Users, activeClass: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30' },
    ]

    const filteredJobseekers = jobseekers.filter(j => {
        if (filters.education) {
            if (j.highest_education !== filters.education) return false
        }
        if (filters.skill) {
            const matchesSkill = j.skills?.some(s => s.toLowerCase().includes(filters.skill.toLowerCase()))
            if (!matchesSkill) return false
        }
        if (filters.location) {
            const loc = filters.location.toLowerCase()
            const matchesLocation =
                (j.city || '').toLowerCase().includes(loc) ||
                (j.province || '').toLowerCase().includes(loc) ||
                (j.barangay || '').toLowerCase().includes(loc)
            if (!matchesLocation) return false
        }
        if (filters.dateFrom) {
            const createdDate = j.created_at ? new Date(j.created_at) : null
            if (!(createdDate && createdDate >= new Date(filters.dateFrom))) return false
        }
        if (filters.dateTo) {
            const createdDate = j.created_at ? new Date(j.created_at) : null
            if (!(createdDate && createdDate <= new Date(filters.dateTo + 'T23:59:59'))) return false
        }
        return true
    })

    return (
        <div className="animate-fade-in">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-1">Jobseeker Verification</h2>
                <p className="text-slate-400 text-sm">Review and verify jobseeker registrations</p>
            </div>

            <StatusTabs tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />

            <SearchAndFilters
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                searchPlaceholder="Search by name or email..."
                showFilters={showFilters}
                setShowFilters={setShowFilters}
                filters={filters}
                setFilters={setFilters}
                sortOrder={sortOrder}
                setSortOrder={setSortOrder}
                filterType="jobseeker"
            />

            <div className="mb-4 flex items-center justify-between text-xs text-slate-500">
                <p>Showing {filteredJobseekers.length} of {totalCount} jobseekers</p>
                <p>Sorted by Created Date {sortOrder === 'desc' ? '(latest first)' : '(oldest first)'}</p>
            </div>

            {/* Jobseeker cards */}
            <div className="space-y-3">
                {!isLoadingMore && isFetching && filteredJobseekers.length === 0 ? (
                    <div className="text-center py-16 text-slate-500">Loading jobseekers...</div>
                ) : filteredJobseekers.length === 0 ? (
                    <div className="text-center py-16">
                        <Users className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">No {activeTab !== 'all' ? activeTab : ''} jobseekers found.</p>
                    </div>
                ) : (
                    filteredJobseekers.map(jobseeker => (
                        <JobseekerCard
                            key={jobseeker.id}
                            jobseeker={jobseeker}
                            expandedId={expandedId}
                            setExpandedId={setExpandedId}
                            actionLoading={actionLoading}
                            onApprove={onApprove}
                            onReject={onReject}
                            onViewDocument={onViewDocument}
                            canApprove={canApprove}
                            canReject={canReject}
                        />
                    ))
                )}
            </div>

            {hasMore && (
                <div className="mt-6 flex justify-center">
                    <button
                        onClick={onLoadMore}
                        disabled={isLoadingMore}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900/80 text-slate-300 text-sm font-medium hover:bg-slate-800/60 disabled:opacity-60 transition-colors"
                    >
                        {isLoadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isLoadingMore ? 'Loading more...' : 'Load more jobseekers'}
                    </button>
                </div>
            )}
        </div>
    )
}

export { JobseekerVerificationSection }
export default JobseekerVerificationSection
