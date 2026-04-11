import { Clock, CheckCircle, XCircle, Building2, Users } from 'lucide-react'
import { StatusTabs } from './StatusTabs'
import { SearchAndFilters } from './SearchAndFilters'
import { EmployerCard } from './EmployerCard'

const EmployerVerificationSection = ({
    filteredEmployers,
    employerCounts,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    showFilters,
    setShowFilters,
    filters,
    setFilters,
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
                filterType="employer"
            />

            {/* Employer cards */}
            <div className="space-y-3">
                {filteredEmployers.length === 0 ? (
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
        </div>
    )
}

export { EmployerVerificationSection }
export default EmployerVerificationSection
