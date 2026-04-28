import { useState } from 'react'
import { Shield, Building2, User, Trash2 } from 'lucide-react'
import PendingReverificationBadge from '../common/PendingReverificationBadge'
import { DeleteUserModal } from './DeleteUserModal'

const UserManagementSection = ({
    allUsers,
    searchQuery,
    setSearchQuery,
    canDeleteUsers = false,
    adminAccessRows = [],
    currentUserId = null,
    onDeleteUser,
}) => {
    const [pendingDelete, setPendingDelete] = useState(null)

    const filteredUsers = allUsers.filter(u => {
        if (!searchQuery.trim()) return true
        const q = searchQuery.toLowerCase()
        return (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)
    })

    const isSuperAdminRow = (userId) =>
        adminAccessRows.some(r => r.user_id === userId && r.admin_level === 'admin')

    const showDeleteButton = (user) =>
        canDeleteUsers &&
        user.id !== currentUserId &&
        !isSuperAdminRow(user.id)

    const handleDeleteSuccess = (deletedUserId) => {
        setPendingDelete(null)
        if (onDeleteUser) onDeleteUser(deletedUserId)
    }

    return (
        <div className="animate-fade-in">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-1">User Management</h2>
                <p className="text-slate-400 text-sm">All registered users on the platform</p>
            </div>

            {/* User search */}
            <div className="relative mb-6">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
                <input
                    type="text"
                    placeholder="Search users by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-900/80 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-sm"
                />
            </div>

            {/* Users table */}
            <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-800">
                                <th className="text-left text-xs uppercase tracking-wider text-slate-500 font-semibold px-5 py-4">User</th>
                                <th className="text-left text-xs uppercase tracking-wider text-slate-500 font-semibold px-5 py-4">Role</th>
                                <th className="text-left text-xs uppercase tracking-wider text-slate-500 font-semibold px-5 py-4">Status</th>
                                <th className="text-left text-xs uppercase tracking-wider text-slate-500 font-semibold px-5 py-4">Joined</th>
                                {canDeleteUsers && (
                                    <th className="text-left text-xs uppercase tracking-wider text-slate-500 font-semibold px-5 py-4">Actions</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {filteredUsers.map(user => (
                                <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                                user.role === 'admin' ? 'bg-indigo-500/15'
                                                : user.role === 'employer' ? 'bg-violet-500/15'
                                                : 'bg-blue-500/15'
                                            }`}>
                                                {user.role === 'admin'
                                                    ? <Shield className="w-4 h-4 text-indigo-400" />
                                                    : user.role === 'employer'
                                                        ? <Building2 className="w-4 h-4 text-violet-400" />
                                                        : <User className="w-4 h-4 text-blue-400" />
                                                }
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-slate-200">{user.name || '—'}</p>
                                                <p className="text-xs text-slate-500">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize ${
                                            user.role === 'admin' ? 'bg-indigo-500/15 text-indigo-400'
                                            : user.role === 'employer' ? 'bg-violet-500/15 text-violet-400'
                                            : 'bg-blue-500/15 text-blue-400'
                                        }`}>
                                            {user.subtype || user.role}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`flex items-center gap-1.5 text-xs font-medium ${
                                                user.is_verified ? 'text-emerald-400' : 'text-amber-400'
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${
                                                    user.is_verified ? 'bg-emerald-400' : 'bg-amber-400'
                                                }`} />
                                                {user.is_verified ? 'Verified' : 'Pending'}
                                            </span>
                                            {user.is_verified && user.profile_modified_since_verification && (
                                                <PendingReverificationBadge />
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-xs text-slate-500">
                                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                                    </td>
                                    {canDeleteUsers && (
                                        <td className="px-5 py-4">
                                            {showDeleteButton(user) && (
                                                <button
                                                    onClick={() => setPendingDelete(user)}
                                                    className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                    title="Delete user"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            ))}
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
        </div>
    )
}

export { UserManagementSection }
export default UserManagementSection
