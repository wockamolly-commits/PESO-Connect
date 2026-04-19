import { useState } from 'react'
import { supabase } from '../../config/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Settings, User, Lock, Loader2, Check, AlertCircle } from 'lucide-react'

const AdminAccountSettings = () => {
    const { userData, currentUser, fetchUserData } = useAuth()

    // Profile form
    const [name, setName] = useState(userData?.name || '')
    const [profileLoading, setProfileLoading] = useState(false)
    const [profileSuccess, setProfileSuccess] = useState('')
    const [profileError, setProfileError] = useState('')

    // Password form
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [passwordLoading, setPasswordLoading] = useState(false)
    const [passwordSuccess, setPasswordSuccess] = useState('')
    const [passwordError, setPasswordError] = useState('')

    const handleProfileSubmit = async (e) => {
        e.preventDefault()
        setProfileError('')
        setProfileSuccess('')

        const trimmed = name.trim()
        if (!trimmed) {
            setProfileError('Name cannot be empty.')
            return
        }

        setProfileLoading(true)
        try {
            const { error } = await supabase
                .from('users')
                .update({ name: trimmed, updated_at: new Date().toISOString() })
                .eq('id', currentUser.id)
            if (error) throw error

            await fetchUserData(currentUser.id)
            setProfileSuccess('Display name updated.')
            setTimeout(() => setProfileSuccess(''), 3000)
        } catch (err) {
            setProfileError(err.message || 'Failed to update name.')
        } finally {
            setProfileLoading(false)
        }
    }

    const handlePasswordSubmit = async (e) => {
        e.preventDefault()
        setPasswordError('')
        setPasswordSuccess('')

        if (password.length < 6) {
            setPasswordError('Password must be at least 6 characters.')
            return
        }
        if (password !== confirmPassword) {
            setPasswordError('Passwords do not match.')
            return
        }

        setPasswordLoading(true)
        try {
            const { error } = await supabase.auth.updateUser({ password })
            if (error) throw error

            setPassword('')
            setConfirmPassword('')
            setPasswordSuccess('Password updated successfully.')
            setTimeout(() => setPasswordSuccess(''), 3000)
        } catch (err) {
            setPasswordError(err.message || 'Failed to update password.')
        } finally {
            setPasswordLoading(false)
        }
    }

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-indigo-500/15 rounded-xl flex items-center justify-center">
                        <Settings className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">Account Settings</h2>
                        <p className="text-sm text-slate-500">Manage your admin profile and security</p>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Profile Section */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center">
                            <User className="w-4 h-4 text-slate-300" />
                        </div>
                        <h3 className="text-base font-semibold text-white">Display Name</h3>
                    </div>

                    <form onSubmit={handleProfileSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm"
                                placeholder="Your display name"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                value={currentUser?.email || ''}
                                disabled
                                className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-500 text-sm cursor-not-allowed"
                            />
                            <p className="mt-1.5 text-xs text-slate-600">Email cannot be changed.</p>
                        </div>

                        {profileError && (
                            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                {profileError}
                            </div>
                        )}
                        {profileSuccess && (
                            <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-sm text-emerald-400">
                                <Check className="w-4 h-4 flex-shrink-0" />
                                {profileSuccess}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={profileLoading}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-colors text-sm font-medium disabled:opacity-50"
                        >
                            {profileLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Name'}
                        </button>
                    </form>
                </div>

                {/* Password Section */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center">
                            <Lock className="w-4 h-4 text-slate-300" />
                        </div>
                        <h3 className="text-base font-semibold text-white">Change Password</h3>
                    </div>

                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                New Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm"
                                placeholder="Min. 6 characters"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                Confirm Password
                            </label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm"
                                placeholder="Confirm your new password"
                                required
                            />
                        </div>

                        {passwordError && (
                            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                {passwordError}
                            </div>
                        )}
                        {passwordSuccess && (
                            <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-sm text-emerald-400">
                                <Check className="w-4 h-4 flex-shrink-0" />
                                {passwordSuccess}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={passwordLoading}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-colors text-sm font-medium disabled:opacity-50"
                        >
                            {passwordLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}

export { AdminAccountSettings }
export default AdminAccountSettings
