import { useState, useEffect } from 'react'
import { supabase } from '../../config/supabase'
import { ALL_PERMISSIONS, SUPER_ADMIN_ONLY_PERMISSIONS, isSuperAdmin } from '../../utils/adminPermissions'
import { Shield, UserCog, Save, Loader2, ChevronDown, ChevronUp, Plus, CheckCircle } from 'lucide-react'
import { InviteAdminModal } from './InviteAdminModal'

const PERMISSION_LABELS = {
    view_overview: 'View Overview',
    view_employers: 'View Employers',
    approve_employers: 'Approve Employers',
    reject_employers: 'Reject Employers',
    view_jobseekers: 'View Jobseekers',
    approve_jobseekers: 'Approve Jobseekers',
    reject_jobseekers: 'Reject Jobseekers',
    view_users: 'View All Users',
    export_jobseekers: 'Export Jobseekers',
    reverify_profiles: 'Review Re-verification Queue',
    manage_admins: 'Manage Admins (super-admin only)',
    manage_system_settings: 'System Settings (super-admin only)',
    delete_users: 'Delete Users (super-admin only)',
}

// Permissions a super-admin may delegate to sub-admins
const DELEGATABLE_PERMISSIONS = ALL_PERMISSIONS.filter(
    p => !SUPER_ADMIN_ONLY_PERMISSIONS.includes(p)
)

const AdminManagementSection = ({ adminAccess }) => {
    const [adminUsers, setAdminUsers] = useState([])
    const [accessRows, setAccessRows] = useState([])
    const [loading, setLoading] = useState(true)
    const [expandedId, setExpandedId] = useState(null)
    const [saving, setSaving] = useState('')
    const [feedback, setFeedback] = useState({})
    const [showInviteModal, setShowInviteModal] = useState(false)
    const [inviteSuccess, setInviteSuccess] = useState('')

    const canManage = isSuperAdmin(adminAccess)

    useEffect(() => {
        fetchAdminData()
    }, [])

    const fetchAdminData = async () => {
        setLoading(true)
        try {
            const { data: users, error: usersError } = await supabase
                .from('users')
                .select('id, email, name, role, created_at')
                .eq('role', 'admin')
            if (usersError) throw usersError

            const { data: access, error: accessError } = await supabase
                .from('admin_access')
                .select('*')
            if (accessError) throw accessError

            setAdminUsers(users || [])
            setAccessRows(access || [])
        } catch (err) {
            console.error('Error loading admin data:', err)
        } finally {
            setLoading(false)
        }
    }

    const getAccessRow = (userId) => accessRows.find(r => r.user_id === userId) || null

    const handleSaveAccess = async (userId, adminLevel, permissions) => {
        setSaving(userId)
        setFeedback(prev => ({ ...prev, [userId]: null }))
        try {
            const now = new Date().toISOString()
            const { error } = await supabase
                .from('admin_access')
                .upsert({
                    user_id: userId,
                    admin_level: adminLevel,
                    permissions: adminLevel === 'admin' ? ALL_PERMISSIONS : permissions,
                    updated_at: now,
                }, { onConflict: 'user_id' })
            if (error) throw error
            setFeedback(prev => ({ ...prev, [userId]: 'Saved' }))
            await fetchAdminData()
        } catch (err) {
            console.error('Error saving access:', err)
            setFeedback(prev => ({ ...prev, [userId]: 'Error saving' }))
        } finally {
            setSaving('')
        }
    }

    const handleInviteSuccess = async (email) => {
        setShowInviteModal(false)
        setInviteSuccess(`Invite sent to ${email}. They will receive a link to set up their account.`)
        setTimeout(() => setInviteSuccess(''), 8000)
        await fetchAdminData()
    }

    if (loading) {
        return (
            <div className="animate-fade-in flex items-center justify-center py-24">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
            </div>
        )
    }

    return (
        <div className="animate-fade-in">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-1">Admin Management</h2>
                <p className="text-slate-400 text-sm">Manage admin access levels and permissions</p>
            </div>

            {/* Invite sub-admin (super-admin only) */}
            {canManage && (
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        {inviteSuccess && (
                            <div className="flex items-center gap-2 text-sm text-emerald-400">
                                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                                {inviteSuccess}
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => setShowInviteModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-colors font-medium text-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Invite Sub-Admin
                    </button>
                </div>
            )}

            {/* Invite modal */}
            {showInviteModal && (
                <InviteAdminModal
                    onClose={() => setShowInviteModal(false)}
                    onSuccess={handleInviteSuccess}
                />
            )}

            {/* Admin user list */}
            <div className="space-y-3">
                {adminUsers.map(user => {
                    const access = getAccessRow(user.id)
                    const isExpanded = expandedId === user.id
                    const level = access?.admin_level || 'no access record'
                    const grantedPerms = access?.permissions || []

                    return (
                        <div key={user.id} className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
                            <div
                                className="flex items-center justify-between p-5 cursor-pointer"
                                onClick={() => setExpandedId(isExpanded ? null : user.id)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-indigo-500/15 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <Shield className="w-5 h-5 text-indigo-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-200">{user.name || user.email}</p>
                                        <p className="text-xs text-slate-500">{user.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                        level === 'admin'
                                            ? 'bg-indigo-500/15 text-indigo-400'
                                            : level === 'sub-admin'
                                                ? 'bg-amber-500/15 text-amber-400'
                                                : 'bg-slate-700 text-slate-400'
                                    }`}>
                                        {level}
                                    </span>
                                    {isExpanded
                                        ? <ChevronUp className="w-5 h-5 text-slate-600" />
                                        : <ChevronDown className="w-5 h-5 text-slate-600" />
                                    }
                                </div>
                            </div>

                            {isExpanded && (
                                <AdminAccessEditor
                                    user={user}
                                    access={access}
                                    canManage={canManage}
                                    saving={saving === user.id}
                                    feedback={feedback[user.id]}
                                    onSave={handleSaveAccess}
                                />
                            )}
                        </div>
                    )
                })}

                {adminUsers.length === 0 && (
                    <div className="text-center py-16">
                        <UserCog className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">No admin users found.</p>
                    </div>
                )}
            </div>
        </div>
    )
}

const AdminAccessEditor = ({ user, access, canManage, saving, feedback, onSave }) => {
    const [adminLevel, setAdminLevel] = useState(access?.admin_level || 'sub-admin')
    const [selectedPerms, setSelectedPerms] = useState(access?.permissions || [])

    const togglePerm = (perm) => {
        setSelectedPerms(prev =>
            prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
        )
    }

    const isReadOnly = !canManage

    return (
        <div className="px-5 pb-5 border-t border-slate-800 pt-5 animate-fade-in">
            {/* Admin level */}
            <div className="mb-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Admin Level</p>
                {isReadOnly ? (
                    <span className="text-sm text-slate-300 capitalize">{adminLevel}</span>
                ) : (
                    <div className="flex gap-3">
                        {['admin', 'sub-admin'].map(lvl => (
                            <button
                                key={lvl}
                                onClick={() => setAdminLevel(lvl)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    adminLevel === lvl
                                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                                        : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200'
                                }`}
                            >
                                {lvl}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Permissions */}
            <div className="mb-5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    {adminLevel === 'admin' ? 'All permissions granted (super-admin)' : 'Granted Permissions'}
                </p>
                {adminLevel === 'admin' ? (
                    <p className="text-xs text-slate-500">Super-admins receive all permissions implicitly.</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {DELEGATABLE_PERMISSIONS.map(perm => (
                            <label
                                key={perm}
                                className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
                                    isReadOnly
                                        ? 'border-slate-800 cursor-default'
                                        : 'border-slate-700/50 hover:border-slate-600 cursor-pointer'
                                } ${selectedPerms.includes(perm) ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-slate-800/40'}`}
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedPerms.includes(perm)}
                                    onChange={() => !isReadOnly && togglePerm(perm)}
                                    disabled={isReadOnly}
                                    className="w-4 h-4 accent-indigo-500 flex-shrink-0"
                                />
                                <span className="text-xs text-slate-300">{PERMISSION_LABELS[perm] || perm}</span>
                            </label>
                        ))}
                    </div>
                )}
            </div>

            {/* Super-admin-only notice */}
            {!isReadOnly && adminLevel === 'sub-admin' && (
                <div className="mb-4 p-3 bg-slate-800/60 border border-slate-700 rounded-lg">
                    <p className="text-xs text-slate-400">
                        The following permissions are always super-admin only and cannot be delegated:
                        {' '}{SUPER_ADMIN_ONLY_PERMISSIONS.join(', ')}.
                    </p>
                </div>
            )}

            {/* Save */}
            {!isReadOnly && (
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => onSave(user.id, adminLevel, selectedPerms)}
                        disabled={saving}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-colors font-medium text-sm disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Changes
                    </button>
                    {feedback && (
                        <span className={`text-xs font-medium ${feedback === 'Saved' ? 'text-emerald-400' : 'text-red-400'}`}>
                            {feedback}
                        </span>
                    )}
                </div>
            )}

            {isReadOnly && (
                <p className="text-xs text-slate-500">Only super-admins can modify access records.</p>
            )}
        </div>
    )
}

export { AdminManagementSection }
export default AdminManagementSection
