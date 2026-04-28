import { useState } from 'react'
import { Building2, User, Trash2 } from 'lucide-react'
import PendingReverificationBadge from '../common/PendingReverificationBadge'
import { DeleteUserModal } from './DeleteUserModal'

/**
 * Flat table view for employers or jobseekers — mirrors the User Management
 * table style, scoped to a single role.
 *
 * @param {'employer'|'jobseeker'} role
 */
const RoleUserTable = ({
    users,
    role = 'jobseeker',
    canDelete = false,
    onDelete,
    searchQuery = '',
}) => {
    const [pendingDelete, setPendingDelete] = useState(null)

    const isEmployer = role === 'employer'

    const getStatusField = (u) =>
        isEmployer
            ? (u.employer_status || 'pending')
            : (u.jobseeker_status || 'pending')

    const getStatusLabel = (status) => {
        if (status === 'verified' || status === 'approved') return 'Verified'
        return status.charAt(0).toUpperCase() + status.slice(1)
    }

    const getStatusColor = (status) => {
        if (status === 'verified' || status === 'approved') return { dot: 'bg-emerald-400', text: 'text-emerald-400' }
        if (status === 'pending') return { dot: 'bg-amber-400', text: 'text-amber-400' }
        if (status === 'expired') return { dot: 'bg-orange-400', text: 'text-orange-400' }
        return { dot: 'bg-red-400', text: 'text-red-400' }
    }

    const getName = (u) => {
        if (isEmployer) return u.company_name || u.representative_name || u.name || '—'
        return u.display_name || u.full_name || u.name || '—'
    }

    const filteredUsers = users.filter(u => {
        if (!searchQuery.trim()) return true
        const q = searchQuery.toLowerCase()
        return (
            (getName(u)).toLowerCase().includes(q) ||
            (u.email || '').toLowerCase().includes(q)
        )
    })

    const handleDeleteSuccess = (deletedId) => {
        setPendingDelete(null)
        if (onDelete) onDelete({ id: deletedId })
    }

    return (
        <>
            <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-800">
                                <th className="text-left text-xs uppercase tracking-wider text-slate-500 font-semibold px-5 py-4">
                                    {isEmployer ? 'Company' : 'Name'}
                                </th>
                                <th className="text-left text-xs uppercase tracking-wider text-slate-500 font-semibold px-5 py-4">Email</th>
                                <th className="text-left text-xs uppercase tracking-wider text-slate-500 font-semibold px-5 py-4">Status</th>
                                <th className="text-left text-xs uppercase tracking-wider text-slate-500 font-semibold px-5 py-4">Joined</th>
                                {canDelete && (
                                    <th className="text-left text-xs uppercase tracking-wider text-slate-500 font-semibold px-5 py-4">Actions</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={canDelete ? 5 : 4} className="text-center py-16 text-slate-500">
                                        No {isEmployer ? 'employers' : 'jobseekers'} found.
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map(user => {
                                    const status = getStatusField(user)
                                    const colors = getStatusColor(status)
                                    return (
                                        <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                                        isEmployer ? 'bg-violet-500/15' : 'bg-blue-500/15'
                                                    }`}>
                                                        {isEmployer
                                                            ? <Building2 className="w-4 h-4 text-violet-400" />
                                                            : <User className="w-4 h-4 text-blue-400" />
                                                        }
                                                    </div>
                                                    <p className="text-sm font-medium text-slate-200 truncate max-w-[220px]">
                                                        {getName(user)}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-sm text-slate-400">{user.email}</td>
                                            <td className="px-5 py-4">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className={`flex items-center gap-1.5 text-xs font-medium ${colors.text}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                                                        {getStatusLabel(status)}
                                                    </span>
                                                    {(status === 'verified' || status === 'approved') && user.profile_modified_since_verification && (
                                                        <PendingReverificationBadge />
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-xs text-slate-500">
                                                {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                                            </td>
                                            {canDelete && (
                                                <td className="px-5 py-4">
                                                    <button
                                                        onClick={() => setPendingDelete(user)}
                                                        className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                        title="Delete user"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {pendingDelete && (
                <DeleteUserModal
                    user={pendingDelete}
                    onClose={() => setPendingDelete(null)}
                    onSuccess={handleDeleteSuccess}
                />
            )}
        </>
    )
}

export { RoleUserTable }
export default RoleUserTable
