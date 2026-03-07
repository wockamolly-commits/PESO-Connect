import { Loader2, XCircle } from 'lucide-react'

const RejectModal = ({ showRejectModal, rejectReason, setRejectReason, onReject, onClose, actionLoading }) => {
    if (!showRejectModal) return null

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-fade-in">
                <h3 className="text-lg font-semibold text-white mb-2">
                    Reject {showRejectModal.role === 'employer' ? 'Employer' : 'Jobseeker'}
                </h3>
                <p className="text-sm text-slate-400 mb-4">
                    Please provide a reason for rejection. This will be visible to the user.
                </p>
                <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Enter rejection reason..."
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all min-h-[100px] resize-none mb-4 text-sm"
                />
                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors font-medium text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onReject(showRejectModal.id, showRejectModal.role)}
                        disabled={actionLoading === showRejectModal.id}
                        className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-500 transition-colors font-medium text-sm disabled:opacity-50"
                    >
                        {actionLoading === showRejectModal.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <XCircle className="w-4 h-4" />
                        )}
                        Confirm Reject
                    </button>
                </div>
            </div>
        </div>
    )
}

export { RejectModal }
export default RejectModal
