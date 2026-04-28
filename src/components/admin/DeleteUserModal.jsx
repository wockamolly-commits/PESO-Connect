import { createPortal } from 'react-dom'
import { useState } from 'react'
import { supabase } from '../../config/supabase'
import { AlertTriangle, Loader2, Trash2, X } from 'lucide-react'

const DeleteUserModal = ({ user, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleDelete = async () => {
        setError('')
        setLoading(true)
        try {
            const { data: { session }, error: sessionError } = await supabase.auth.refreshSession()
            if (sessionError || !session?.access_token) {
                throw new Error('Your session has expired. Please log in again.')
            }

            const res = await supabase.functions.invoke('delete-user', {
                body: { target_id: user.id },
                headers: { Authorization: `Bearer ${session.access_token}` },
            })

            if (res.error) {
                let message = 'Delete failed.'
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
            onSuccess(user.id)
        } catch (err) {
            setError(err.message || 'Failed to delete user.')
        } finally {
            setLoading(false)
        }
    }

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
            <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center">
                            <Trash2 className="w-5 h-5 text-red-400" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-white">Delete User</h2>
                            <p className="text-xs text-slate-500">This action cannot be undone</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors rounded-lg hover:bg-slate-800"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    <div className="p-4 bg-slate-800/60 border border-slate-700 rounded-xl">
                        <p className="text-sm font-medium text-slate-200">{user.name || '—'}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{user.email}</p>
                        <span className={`mt-2 inline-block px-2 py-0.5 rounded text-xs font-semibold capitalize ${
                            user.role === 'employer'
                                ? 'bg-violet-500/15 text-violet-400'
                                : user.role === 'admin'
                                    ? 'bg-indigo-500/15 text-indigo-400'
                                    : 'bg-blue-500/15 text-blue-400'
                        }`}>
                            {user.subtype || user.role}
                        </span>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                        <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-red-300">
                            This will permanently delete the user's account, profile, and all associated data. This action cannot be undone.
                        </p>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors text-sm font-medium disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={loading}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-500 transition-colors text-sm font-medium disabled:opacity-50"
                        >
                            {loading
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <Trash2 className="w-4 h-4" />
                            }
                            Delete User
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    )
}

export { DeleteUserModal }
export default DeleteUserModal
