import {
    Building2, User, FileText, Shield, Maximize2,
    ChevronDown, ChevronUp, CheckCircle, XCircle, Loader2
} from 'lucide-react'

const EmployerCard = ({
    employer,
    expandedId,
    setExpandedId,
    actionLoading,
    onApprove,
    onReject,
    onViewDocument
}) => {
    const isExpanded = expandedId === employer.id
    const status = employer.employer_status || 'pending'

    return (
        <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-colors">
            {/* Summary row */}
            <div
                className="flex items-center justify-between p-5 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : employer.id)}
            >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-11 h-11 bg-slate-800 rounded-xl flex items-center justify-center flex-shrink-0 border border-slate-700">
                        <Building2 className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-semibold text-slate-100 truncate">
                            {employer.company_name || employer.name || 'Unnamed Business'}
                        </h3>
                        <p className="text-sm text-slate-500 truncate">
                            {employer.representative_name || employer.name} &bull; {employer.email}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold ${
                        status === 'pending'
                            ? 'bg-amber-500/15 text-amber-400'
                            : status === 'approved'
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : 'bg-red-500/15 text-red-400'
                    }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                            status === 'pending'
                                ? 'bg-amber-400' : status === 'approved'
                                    ? 'bg-emerald-400' : 'bg-red-400'
                        }`} />
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                    {isExpanded
                        ? <ChevronUp className="w-5 h-5 text-slate-600" />
                        : <ChevronDown className="w-5 h-5 text-slate-600" />
                    }
                </div>
            </div>

            {/* Expanded details */}
            {isExpanded && (
                <div className="px-5 pb-5 border-t border-slate-800 pt-5 animate-fade-in">
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Business Info */}
                        <div>
                            <h4 className="font-semibold text-slate-200 mb-3 flex items-center gap-2 text-sm">
                                <Building2 className="w-4 h-4 text-indigo-400" />
                                Business Information
                            </h4>
                            <div className="space-y-2.5 text-sm">
                                {[
                                    ['Company', employer.company_name],
                                    ['Type', (employer.employer_type || '\u2014').replace('_', ' ')],
                                    ['Reg. No.', employer.business_reg_number],
                                    ['Industry', employer.nature_of_business],
                                ].map(([label, val], i) => (
                                    <div key={i} className="flex justify-between items-center">
                                        <span className="text-slate-500">{label}</span>
                                        <span className="font-medium text-slate-200 capitalize">{val || '\u2014'}</span>
                                    </div>
                                ))}
                                <div>
                                    <span className="text-slate-500">Address</span>
                                    <p className="font-medium text-slate-200 mt-1">{employer.business_address || '\u2014'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Representative & Contact */}
                        <div>
                            <h4 className="font-semibold text-slate-200 mb-3 flex items-center gap-2 text-sm">
                                <User className="w-4 h-4 text-indigo-400" />
                                Representative & Contact
                            </h4>
                            <div className="space-y-2.5 text-sm">
                                {[
                                    ['Name', employer.representative_name || employer.name],
                                    ['Position', employer.representative_position],
                                    ['Email', employer.contact_email || employer.email],
                                    ['Phone', employer.contact_number],
                                    ['Preferred', employer.preferred_contact_method],
                                ].map(([label, val], i) => (
                                    <div key={i} className="flex justify-between items-center">
                                        <span className="text-slate-500">{label}</span>
                                        <span className="font-medium text-slate-200 capitalize">{val || '\u2014'}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Documents */}
                    <div className="mt-6">
                        <h4 className="font-semibold text-slate-200 mb-3 flex items-center gap-2 text-sm">
                            <FileText className="w-4 h-4 text-indigo-400" />
                            Uploaded Documents
                        </h4>
                        <div className="grid md:grid-cols-2 gap-3">
                            {employer.gov_id_url ? (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onViewDocument(employer.gov_id_url, `Government ID \u2014 ${employer.company_name || employer.name}`) }}
                                    className="group p-3 bg-slate-800/60 border border-slate-700/50 rounded-xl hover:border-indigo-500/30 hover:bg-slate-800 transition-all text-left"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-indigo-400" />
                                            <span className="text-sm text-slate-300 font-medium">Government ID</span>
                                        </div>
                                        <Maximize2 className="w-4 h-4 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                    {employer.gov_id_url.startsWith('data:image') ? (
                                        <img src={employer.gov_id_url} alt="Government ID"
                                            className="w-full h-28 object-cover rounded-lg border border-slate-700" />
                                    ) : (
                                        <div className="flex items-center gap-2 h-28 justify-center bg-slate-800 rounded-lg border border-slate-700">
                                            <FileText className="w-6 h-6 text-slate-600" />
                                            <span className="text-xs text-slate-500">Click to view</span>
                                        </div>
                                    )}
                                </button>
                            ) : (
                                <div className="flex items-center gap-3 p-3 bg-slate-800/30 border border-slate-800 rounded-xl">
                                    <FileText className="w-5 h-5 text-slate-600" />
                                    <span className="text-sm text-slate-500">Government ID &mdash; not uploaded</span>
                                </div>
                            )}

                            {employer.business_permit_url ? (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onViewDocument(employer.business_permit_url, `Business Permit \u2014 ${employer.company_name || employer.name}`) }}
                                    className="group p-3 bg-slate-800/60 border border-slate-700/50 rounded-xl hover:border-indigo-500/30 hover:bg-slate-800 transition-all text-left"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-indigo-400" />
                                            <span className="text-sm text-slate-300 font-medium">Business Permit</span>
                                        </div>
                                        <Maximize2 className="w-4 h-4 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                    {employer.business_permit_url.startsWith('data:image') ? (
                                        <img src={employer.business_permit_url} alt="Business Permit"
                                            className="w-full h-28 object-cover rounded-lg border border-slate-700" />
                                    ) : (
                                        <div className="flex items-center gap-2 h-28 justify-center bg-slate-800 rounded-lg border border-slate-700">
                                            <FileText className="w-6 h-6 text-slate-600" />
                                            <span className="text-xs text-slate-500">Click to view</span>
                                        </div>
                                    )}
                                </button>
                            ) : (
                                <div className="flex items-center gap-3 p-3 bg-slate-800/30 border border-slate-800 rounded-xl">
                                    <FileText className="w-5 h-5 text-slate-600" />
                                    <span className="text-sm text-slate-500">Business Permit &mdash; not uploaded</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Agreements */}
                    <div className="mt-6">
                        <h4 className="font-semibold text-slate-200 mb-3 flex items-center gap-2 text-sm">
                            <Shield className="w-4 h-4 text-indigo-400" />
                            Agreements
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {[
                                ['Terms & Conditions', employer.terms_accepted],
                                ['PESO Consent', employer.peso_consent],
                                ['Labor Compliance', employer.labor_compliance],
                            ].map(([label, accepted], i) => (
                                <span key={i} className={`px-3 py-1 rounded-lg text-xs font-medium ${accepted ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                                    }`}>
                                    {accepted ? '\u2713' : '\u2717'} {label}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Rejection reason */}
                    {status === 'rejected' && employer.rejection_reason && (
                        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                            <p className="text-sm text-red-300">
                                <strong className="text-red-400">Rejection Reason:</strong> {employer.rejection_reason}
                            </p>
                        </div>
                    )}

                    {/* Timestamps */}
                    <div className="mt-4 text-xs text-slate-600">
                        Registered: {employer.created_at ? new Date(employer.created_at).toLocaleString() : '\u2014'}
                        {employer.updated_at && ` \u2022 Updated: ${new Date(employer.updated_at).toLocaleString()}`}
                    </div>

                    {/* Actions */}
                    <div className="mt-5 pt-4 border-t border-slate-800 flex items-center gap-3">
                        {status !== 'approved' && (
                            <button
                                onClick={() => onApprove(employer.id, 'employer')}
                                disabled={actionLoading === employer.id}
                                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 transition-colors font-medium text-sm disabled:opacity-50"
                            >
                                {actionLoading === employer.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <CheckCircle className="w-4 h-4" />
                                )}
                                Approve
                            </button>
                        )}
                        {status !== 'rejected' && (
                            <button
                                onClick={() => onReject({ id: employer.id, role: 'employer' })}
                                disabled={actionLoading === employer.id}
                                className="flex items-center gap-2 px-5 py-2.5 bg-red-600/80 text-white rounded-xl hover:bg-red-500 transition-colors font-medium text-sm disabled:opacity-50"
                            >
                                <XCircle className="w-4 h-4" />
                                Reject
                            </button>
                        )}
                        {status === 'approved' && (
                            <span className="text-emerald-400 font-medium flex items-center gap-1.5 text-sm">
                                <CheckCircle className="w-4 h-4" /> Employer is active
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export { EmployerCard }
export default EmployerCard
