import { useState } from 'react'
import { supabase } from '../../config/supabase'
import { X, Mail, Loader2, ShieldCheck, ChevronDown } from 'lucide-react'

// ----------------------------------------------------------------
// Role templates — each maps to a named set of permissions
// ----------------------------------------------------------------
const ROLE_TEMPLATES = [
    {
        id: 'employer_validator',
        label: 'Employer Validator',
        description: 'Reviews and approves/rejects employer registrations.',
        permissions: ['view_overview', 'view_employers', 'approve_employers', 'reject_employers'],
    },
    {
        id: 'jobseeker_support',
        label: 'Jobseeker Support',
        description: 'Reviews and approves/rejects jobseeker accounts.',
        permissions: ['view_overview', 'view_jobseekers', 'approve_jobseekers', 'reject_jobseekers'],
    },
    {
        id: 'moderator',
        label: 'Moderator',
        description: 'Views all users and can remove accounts.',
        permissions: ['view_overview', 'view_users', 'delete_users'],
    },
]

// ----------------------------------------------------------------
// InviteAdminModal
// Props:
//   onClose()        — called when the modal should close
//   onSuccess(email) — called after the invite is sent successfully
// ----------------------------------------------------------------
const InviteAdminModal = ({ onClose, onSuccess }) => {
    const [email, setEmail] = useState('')
    const [selectedTemplate, setSelectedTemplate] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const template = ROLE_TEMPLATES.find(t => t.id === selectedTemplate) || null

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        if (!email.trim()) { setError('Please enter an email address.'); return }
        if (!selectedTemplate) { setError('Please select a role template.'); return }
        setLoading(true)
        try {
            // Force-refresh to guarantee a non-expired JWT for the edge function gateway
            const { data: { session }, error: sessionError } = await supabase.auth.refreshSession()
            if (sessionError || !session?.access_token) {
                throw new Error('Your session has expired. Please log in again.')
            }

            const res = await supabase.functions.invoke('invite-admin', {
                body: {
                    email: email.trim().toLowerCase(),
                    templateId: selectedTemplate,
                    permissions: template.permissions,
                },
                headers: { Authorization: `Bearer ${session.access_token}` },
            })

            // supabase.functions.invoke puts non-2xx responses in res.error
            // with a generic message. Extract the real message from the body.
            if (res.error) {
                let message = 'Invite failed.'
                try {
                    const errBody = await res.error.context?.json?.()
                    if (errBody?.error) message = errBody.error
                    else message = res.error.message || message
                } catch {
                    message = res.error.message || message
                }
                throw new Error(message)
            }

            if (res.data?.error) throw new Error(res.data.error)
            onSuccess(email.trim())
        } catch (err) {
            setError(err.message || 'Failed to send invite.')
        } finally {
            setLoading(false)
        }
    }

    return (
        /* Backdrop */
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
            <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/15 flex items-center justify-center">
                            <ShieldCheck className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-white">Invite Sub-Admin</h2>
                            <p className="text-xs text-slate-500">Send a secure invite link</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors rounded-lg hover:bg-slate-800"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">

                    {/* Email */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                            Email Address
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="official@organization.gov.ph"
                                required
                                className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm"
                            />
                        </div>
                        <p className="mt-1.5 text-xs text-slate-500">
                            Must be an official email not linked to any jobseeker or employer account.
                        </p>
                    </div>

                    {/* Role Template */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                            Role Template
                        </label>
                        <div className="relative">
                            <select
                                value={selectedTemplate}
                                onChange={e => setSelectedTemplate(e.target.value)}
                                required
                                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 appearance-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                            >
                                <option value="" disabled>Select a role…</option>
                                {ROLE_TEMPLATES.map(t => (
                                    <option key={t.id} value={t.id}>{t.label}</option>
                                ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        </div>

                        {/* Template description + permissions preview */}
                        {template && (
                            <div className="mt-3 p-3 bg-slate-800/60 border border-slate-700 rounded-xl">
                                <p className="text-xs text-slate-300 font-medium mb-2">{template.description}</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {template.permissions.map(p => (
                                        <span
                                            key={p}
                                            className="px-2 py-0.5 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-md text-xs font-mono"
                                        >
                                            {p}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors text-sm font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !email.trim() || !selectedTemplate}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-colors text-sm font-medium disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                            Send Invite
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export { InviteAdminModal }
export default InviteAdminModal
