import { Clock, CheckCircle, XCircle, Users } from 'lucide-react'
import { StatusTabs } from './StatusTabs'
import { SearchAndFilters } from './SearchAndFilters'
import { JobseekerCard } from './JobseekerCard'

const JobseekerVerificationSection = ({
    jobseekers,
    jobseekerCounts,
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
    onViewDocument
}) => {
    const tabs = [
        { id: 'pending', label: 'Pending', count: jobseekerCounts.pending, icon: Clock, activeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
        { id: 'verified', label: 'Verified', count: jobseekerCounts.verified, icon: CheckCircle, activeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
        { id: 'rejected', label: 'Rejected', count: jobseekerCounts.rejected, icon: XCircle, activeClass: 'bg-red-500/15 text-red-400 border-red-500/30' },
        { id: 'all', label: 'All', count: jobseekerCounts.total, icon: Users, activeClass: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30' },
    ]

    // Apply filtering logic
    const getFilteredJobseekers = () => {
        let filtered = jobseekers
        if (activeTab === 'pending') filtered = jobseekers.filter(j => (j.jobseeker_status || 'pending') === 'pending')
        else if (activeTab === 'verified') filtered = jobseekers.filter(j => j.jobseeker_status === 'verified')
        else if (activeTab === 'rejected') filtered = jobseekers.filter(j => j.jobseeker_status === 'rejected')

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase()
            filtered = filtered.filter(j =>
                (j.display_name || j.full_name || j.name || '').toLowerCase().includes(q) ||
                (j.email || '').toLowerCase().includes(q)
            )
        }

        // Advanced filters
        if (filters.education) {
            filtered = filtered.filter(j => j.highest_education === filters.education)
        }
        if (filters.skill) {
            filtered = filtered.filter(j =>
                j.skills?.some(s => s.toLowerCase().includes(filters.skill.toLowerCase()))
            )
        }
        if (filters.location) {
            const loc = filters.location.toLowerCase()
            filtered = filtered.filter(j =>
                (j.city || '').toLowerCase().includes(loc) ||
                (j.province || '').toLowerCase().includes(loc) ||
                (j.barangay || '').toLowerCase().includes(loc)
            )
        }
        if (filters.dateFrom) {
            filtered = filtered.filter(j => {
                const createdDate = j.created_at ? new Date(j.created_at) : null
                return createdDate && createdDate >= new Date(filters.dateFrom)
            })
        }
        if (filters.dateTo) {
            filtered = filtered.filter(j => {
                const createdDate = j.created_at ? new Date(j.created_at) : null
                return createdDate && createdDate <= new Date(filters.dateTo + 'T23:59:59')
            })
        }

        return filtered
    }

    const filteredJobseekers = getFilteredJobseekers()

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
                filterType="jobseeker"
            />

            {/* Jobseeker cards */}
            <div className="space-y-3">
                {filteredJobseekers.length === 0 ? (
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
                        />
                    ))
                )}
            </div>
        </div>
    )
}

export { JobseekerVerificationSection }
export default JobseekerVerificationSection
