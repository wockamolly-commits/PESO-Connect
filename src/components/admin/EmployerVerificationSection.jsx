import { Clock, CheckCircle, XCircle, Building2, Users, AlertTriangle, Loader2 } from 'lucide-react'
import { StatusTabs } from './StatusTabs'
import { SearchAndFilters } from './SearchAndFilters'
import { EmployerCard } from './EmployerCard'

const EmployerVerificationSection = ({
    filteredEmployers,
    totalCount,
    hasMore,
    isFetching,
    isLoadingMore,
    onLoadMore,
    employerCounts,
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
        { id: 'pending', label: 'Pending', count: employerCounts.pending, icon: Clock, activeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
        { id: 'approved', label: 'Approved', count: employerCounts.approved, icon: CheckCircle, activeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
        { id: 'expired', label: 'Expired', count: employerCounts.expired, icon: AlertTriangle, activeClass: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
        { id: 'rejected', label: 'Rejected', count: employerCounts.rejected, icon: XCircle, activeClass: 'bg-red-500/15 text-red-400 border-red-500/30' },
        { id: 'all', label: 'All', count: employerCounts.total, icon: Building2, activeClass: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30' },
    ]

    return (
        <div className="animate-fade-in">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-1">Employer Verification</h2>
                <p className="text-slate-400 text-sm">Review and manage employer registration requests</p>
            </div>

            <StatusTabs tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />

            <SearchAndFilters
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                searchPlaceholder="Search by company, representative, or email..."
                showFilters={showFilters}
                setShowFilters={setShowFilters}
                filters={filters}
                setFilters={setFilters}
                sortOrder={sortOrder}
                setSortOrder={setSortOrder}
                filterType="employer"
            />

            <div className="mb-4 flex items-center justify-between text-xs text-slate-500">
                <p>Showing {filteredEmployers.length} of {totalCount} employers</p>
                <p>Sorted by Created Date {sortOrder === 'desc' ? '(latest first)' : '(oldest first)'}</p>
            </div>

            {/* Employer cards */}
            <div className="space-y-3">
                {!isLoadingMore && isFetching && filteredEmployers.length === 0 ? (
                    <div className="text-center py-16 text-slate-500">Loading employers...</div>
                ) : filteredEmployers.length === 0 ? (
                    <div className="text-center py-16">
                        <Users className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">No {activeTab !== 'all' ? activeTab : ''} employers found.</p>
                    </div>
                ) : (
                    filteredEmployers.map(employer => (
                        <EmployerCard
                            key={employer.id}
                            employer={employer}
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
                        {isLoadingMore ? 'Loading more...' : 'Load more employers'}
                    </button>
                </div>
            )}
        </div>
    )
}

export { EmployerVerificationSection }
export default EmployerVerificationSection
