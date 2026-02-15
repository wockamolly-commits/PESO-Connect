import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../config/firebase'
import { useAuth } from '../contexts/AuthContext'
import {
    Settings as SettingsIcon,
    User,
    Bell,
    Shield,
    Mail,
    KeyRound,
    Trash2,
    Loader2,
    CheckCircle,
    AlertCircle,
    X,
    Lock
} from 'lucide-react'

// ─── Delete Account Modal ────────────────────────────────────────────────────
const DeleteAccountModal = ({ onClose, onConfirm }) => {
    const [confirmText, setConfirmText] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const canDelete = confirmText === 'DELETE' && password.length >= 6

    const handleDelete = async () => {
        if (!canDelete) return
        setLoading(true)
        setError('')
        try {
            await onConfirm(password)
        } catch (err) {
            if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                setError('Incorrect password. Please try again.')
            } else {
                setError(err.message || 'Failed to delete account.')
            }
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 animate-fade-in">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                >
                    <X className="w-4 h-4 text-gray-500" />
                </button>

                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-red-100 rounded-2xl mb-3">
                        <Trash2 className="w-7 h-7 text-red-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Delete Account</h3>
                    <p className="text-sm text-gray-500 mt-1">This action is permanent and cannot be undone.</p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="label">Type DELETE to confirm</label>
                        <input
                            type="text"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            className="input-field"
                            placeholder="DELETE"
                        />
                    </div>
                    <div>
                        <label className="label">Enter your password</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input-field pl-12"
                                placeholder="Your current password"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <p className="text-sm">{error}</p>
                        </div>
                    )}

                    <button
                        onClick={handleDelete}
                        disabled={!canDelete || loading}
                        className="w-full bg-red-600 text-white font-semibold py-3 rounded-xl hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Deleting...
                            </>
                        ) : (
                            <>
                                <Trash2 className="w-5 h-5" />
                                Permanently Delete Account
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Toggle Switch Component ─────────────────────────────────────────────────
const Toggle = ({ enabled, onChange, disabled = false }) => (
    <button
        type="button"
        onClick={() => !disabled && onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        } ${enabled ? 'bg-primary-600' : 'bg-gray-300'}`}
    >
        <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
        />
    </button>
)

// ─── Main Settings Page ──────────────────────────────────────────────────────
const Settings = () => {
    const navigate = useNavigate()
    const { currentUser, userData, resetPassword, deleteAccount, isJobseeker, isEmployer } = useAuth()

    const [activeTab, setActiveTab] = useState('account')
    const [resetSent, setResetSent] = useState(false)
    const [resetLoading, setResetLoading] = useState(false)
    const [deleteModal, setDeleteModal] = useState(false)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    // Notification preferences
    const [notifications, setNotifications] = useState({
        email_notifications: true,
        job_match_alerts: true,
        application_updates: true,
        new_applicant_alerts: true,
        message_notifications: true,
    })

    // Privacy settings
    const [privacy, setPrivacy] = useState({
        profile_visibility: 'public',
        show_contact_info: true,
        show_skills: true,
    })

    // Load saved preferences from userData
    useEffect(() => {
        if (userData) {
            if (userData.notification_preferences) {
                setNotifications(prev => ({ ...prev, ...userData.notification_preferences }))
            }
            if (userData.privacy_settings) {
                setPrivacy(prev => ({ ...prev, ...userData.privacy_settings }))
            }
        }
    }, [userData])

    // Debounced auto-save
    const saveSettings = useCallback(async (field, value) => {
        if (!currentUser) return
        setSaving(true)
        try {
            await updateDoc(doc(db, 'users', currentUser.uid), {
                [field]: value,
                updated_at: new Date().toISOString()
            })
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
        } catch (error) {
            console.error('Failed to save settings:', error)
        } finally {
            setSaving(false)
        }
    }, [currentUser])

    const updateNotification = (key, value) => {
        const updated = { ...notifications, [key]: value }
        // If master toggle is off, disable all sub-toggles
        if (key === 'email_notifications' && !value) {
            updated.job_match_alerts = false
            updated.application_updates = false
            updated.new_applicant_alerts = false
            updated.message_notifications = false
        }
        setNotifications(updated)
        saveSettings('notification_preferences', updated)
    }

    const updatePrivacy = (key, value) => {
        const updated = { ...privacy, [key]: value }
        setPrivacy(updated)
        saveSettings('privacy_settings', updated)
    }

    const handleResetPassword = async () => {
        setResetLoading(true)
        try {
            await resetPassword(currentUser.email)
            setResetSent(true)
        } catch (error) {
            console.error('Reset password error:', error)
        } finally {
            setResetLoading(false)
        }
    }

    const handleDeleteAccount = async (password) => {
        await deleteAccount(password)
        navigate('/login')
    }

    const tabs = [
        { id: 'account', label: 'Account', icon: User },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'privacy', label: 'Privacy', icon: Shield },
    ]

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white py-8 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/25">
                            <SettingsIcon className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                    </div>
                    <p className="text-gray-600">Manage your account, notifications, and privacy</p>
                </div>

                <div className="flex flex-col md:flex-row gap-6">
                    {/* Sidebar / Tabs */}
                    <div className="md:w-56 flex-shrink-0">
                        <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                                        activeTab === tab.id
                                            ? 'bg-primary-100 text-primary-700'
                                            : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    <tab.icon className="w-5 h-5" />
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        {/* Save indicator */}
                        {(saving || saved) && (
                            <div className="flex items-center gap-2 mb-4 text-sm">
                                {saving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
                                        <span className="text-gray-500">Saving...</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                        <span className="text-green-600">Saved</span>
                                    </>
                                )}
                            </div>
                        )}

                        {/* ─── Account Tab ─── */}
                        {activeTab === 'account' && (
                            <div className="space-y-6">
                                {/* Email */}
                                <div className="card">
                                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Email Address</h2>
                                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                                        <Mail className="w-5 h-5 text-gray-400" />
                                        <span className="text-gray-700">{currentUser?.email}</span>
                                    </div>
                                </div>

                                {/* Password */}
                                <div className="card">
                                    <h2 className="text-lg font-semibold text-gray-900 mb-2">Password</h2>
                                    <p className="text-sm text-gray-500 mb-4">
                                        We'll send a password reset link to your email address.
                                    </p>
                                    {resetSent ? (
                                        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                                            <div>
                                                <p className="font-medium text-green-800">Reset email sent!</p>
                                                <p className="text-sm text-green-600">Check your inbox for the reset link.</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={handleResetPassword}
                                            disabled={resetLoading}
                                            className="btn-secondary flex items-center gap-2"
                                        >
                                            {resetLoading ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Sending...
                                                </>
                                            ) : (
                                                <>
                                                    <KeyRound className="w-4 h-4" />
                                                    Send Password Reset Email
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>

                                {/* Delete Account */}
                                <div className="card border-red-200">
                                    <h2 className="text-lg font-semibold text-red-700 mb-2">Danger Zone</h2>
                                    <p className="text-sm text-gray-500 mb-4">
                                        Permanently delete your account and all associated data. This cannot be undone.
                                    </p>
                                    <button
                                        onClick={() => setDeleteModal(true)}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-700 font-medium rounded-xl hover:bg-red-100 border border-red-200 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Delete Account
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ─── Notifications Tab ─── */}
                        {activeTab === 'notifications' && (
                            <div className="card">
                                <h2 className="text-lg font-semibold text-gray-900 mb-6">Notification Preferences</h2>
                                <div className="space-y-6">
                                    {/* Master toggle */}
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-gray-900">Email Notifications</p>
                                            <p className="text-sm text-gray-500">Receive notifications via email</p>
                                        </div>
                                        <Toggle
                                            enabled={notifications.email_notifications}
                                            onChange={(v) => updateNotification('email_notifications', v)}
                                        />
                                    </div>

                                    <hr className="border-gray-100" />

                                    {/* Message notifications - all roles */}
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-gray-900">Message Notifications</p>
                                            <p className="text-sm text-gray-500">Get notified when you receive new messages</p>
                                        </div>
                                        <Toggle
                                            enabled={notifications.message_notifications}
                                            onChange={(v) => updateNotification('message_notifications', v)}
                                            disabled={!notifications.email_notifications}
                                        />
                                    </div>

                                    {/* Jobseeker toggles */}
                                    {isJobseeker() && (
                                        <>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-medium text-gray-900">Job Match Alerts</p>
                                                    <p className="text-sm text-gray-500">Get notified about new jobs matching your skills</p>
                                                </div>
                                                <Toggle
                                                    enabled={notifications.job_match_alerts}
                                                    onChange={(v) => updateNotification('job_match_alerts', v)}
                                                    disabled={!notifications.email_notifications}
                                                />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-medium text-gray-900">Application Updates</p>
                                                    <p className="text-sm text-gray-500">Get notified when your application status changes</p>
                                                </div>
                                                <Toggle
                                                    enabled={notifications.application_updates}
                                                    onChange={(v) => updateNotification('application_updates', v)}
                                                    disabled={!notifications.email_notifications}
                                                />
                                            </div>
                                        </>
                                    )}

                                    {/* Employer toggles */}
                                    {isEmployer() && (
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-gray-900">New Applicant Alerts</p>
                                                <p className="text-sm text-gray-500">Get notified when someone applies to your jobs</p>
                                            </div>
                                            <Toggle
                                                enabled={notifications.new_applicant_alerts}
                                                onChange={(v) => updateNotification('new_applicant_alerts', v)}
                                                disabled={!notifications.email_notifications}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ─── Privacy Tab ─── */}
                        {activeTab === 'privacy' && (
                            <div className="card">
                                <h2 className="text-lg font-semibold text-gray-900 mb-6">Privacy Settings</h2>
                                <div className="space-y-6">
                                    {/* Profile visibility */}
                                    <div>
                                        <p className="font-medium text-gray-900 mb-3">Profile Visibility</p>
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors hover:bg-gray-50">
                                                <input
                                                    type="radio"
                                                    name="visibility"
                                                    checked={privacy.profile_visibility === 'public'}
                                                    onChange={() => updatePrivacy('profile_visibility', 'public')}
                                                    className="w-4 h-4 text-primary-600"
                                                />
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">Public</p>
                                                    <p className="text-xs text-gray-500">Anyone on PESO Connect can view your profile</p>
                                                </div>
                                            </label>
                                            <label className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors hover:bg-gray-50">
                                                <input
                                                    type="radio"
                                                    name="visibility"
                                                    checked={privacy.profile_visibility === 'verified_only'}
                                                    onChange={() => updatePrivacy('profile_visibility', 'verified_only')}
                                                    className="w-4 h-4 text-primary-600"
                                                />
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">Verified Users Only</p>
                                                    <p className="text-xs text-gray-500">Only verified users can view your profile</p>
                                                </div>
                                            </label>
                                        </div>
                                    </div>

                                    <hr className="border-gray-100" />

                                    {/* Show skills */}
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-gray-900">Show Skills</p>
                                            <p className="text-sm text-gray-500">Display your skills on your public profile</p>
                                        </div>
                                        <Toggle
                                            enabled={privacy.show_skills}
                                            onChange={(v) => updatePrivacy('show_skills', v)}
                                        />
                                    </div>

                                    {/* Show contact info */}
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-gray-900">Show Contact Info</p>
                                            <p className="text-sm text-gray-500">Display your contact details on your public profile</p>
                                        </div>
                                        <Toggle
                                            enabled={privacy.show_contact_info}
                                            onChange={(v) => updatePrivacy('show_contact_info', v)}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Delete Account Modal */}
            {deleteModal && (
                <DeleteAccountModal
                    onClose={() => setDeleteModal(false)}
                    onConfirm={handleDeleteAccount}
                />
            )}
        </div>
    )
}

export default Settings
