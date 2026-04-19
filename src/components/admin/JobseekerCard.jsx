import {
    User, FileText, Maximize2,
    ChevronDown, ChevronUp, CheckCircle, XCircle, Loader2,
    Briefcase, GraduationCap, Award, ChevronRight
} from 'lucide-react'
import PendingReverificationBadge from '../common/PendingReverificationBadge'

const JobseekerCard = ({
    jobseeker,
    expandedId,
    setExpandedId,
    actionLoading,
    onApprove,
    onReject,
    onViewDocument,
    canApprove = true,
    canReject = true,
}) => {
    const isExpanded = expandedId === jobseeker.id
    const status = jobseeker.jobseeker_status || 'pending'

    return (
        <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-colors">
            {/* Summary row */}
            <div
                className="flex items-center justify-between p-5 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : jobseeker.id)}
            >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-11 h-11 bg-slate-800 rounded-xl flex items-center justify-center flex-shrink-0 border border-slate-700">
                        <User className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-semibold text-slate-100 truncate">
                            {jobseeker.display_name || jobseeker.full_name || jobseeker.name || 'Unnamed User'}
                        </h3>
                        <p className="text-sm text-slate-500 truncate">
                            {jobseeker.email} &bull; {jobseeker.skills?.length || 0} skill(s)
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                    {jobseeker.profile_modified_since_verification && status === 'verified' && (
                        <PendingReverificationBadge />
                    )}
                    <span className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold ${
                        status === 'pending'
                            ? 'bg-amber-500/15 text-amber-400'
                            : status === 'verified'
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : 'bg-red-500/15 text-red-400'
                    }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                            status === 'pending'
                                ? 'bg-amber-400' : status === 'verified'
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
                        {/* Personal Information */}
                        <div>
                            <h4 className="font-semibold text-slate-200 mb-3 flex items-center gap-2 text-sm">
                                <User className="w-4 h-4 text-indigo-400" />
                                Personal Information
                            </h4>
                            <div className="space-y-2.5 text-sm">
                                {[
                                    ['Full Name', jobseeker.display_name || jobseeker.full_name || jobseeker.name],
                                    ['Date of Birth', jobseeker.date_of_birth],
                                    ['Address', `${jobseeker.barangay || ''}, ${jobseeker.city || ''}, ${jobseeker.province || ''}`.trim().replace(/^,\s*|,\s*$/g, '') || '\u2014'],
                                    ['Mobile', jobseeker.mobile_number],
                                    ['Contact Method', jobseeker.preferred_contact_method],
                                ].map(([label, val], i) => (
                                    <div key={i} className="flex justify-between items-center">
                                        <span className="text-slate-500">{label}</span>
                                        <span className="font-medium text-slate-200 capitalize">{val || '\u2014'}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Employment Preferences */}
                        <div>
                            <h4 className="font-semibold text-slate-200 mb-3 flex items-center gap-2 text-sm">
                                <Briefcase className="w-4 h-4 text-indigo-400" />
                                Employment Preferences
                            </h4>
                            <div className="space-y-2.5 text-sm">
                                {[
                                    ['Job Type', jobseeker.preferred_job_type?.join(', ') || '\u2014'],
                                    ['Location', (jobseeker.preferred_local_locations || []).filter(Boolean).join(', ') || '\u2014'],
                                    ['Salary Range', jobseeker.expected_salary_min && jobseeker.expected_salary_max ? `\u20B1${jobseeker.expected_salary_min} - \u20B1${jobseeker.expected_salary_max}` : '\u2014'],
                                    ['Willing to Relocate', jobseeker.willing_to_relocate === 'yes' ? 'Yes' : 'No'],
                                ].map(([label, val], i) => (
                                    <div key={i} className="flex justify-between items-start">
                                        <span className="text-slate-500">{label}</span>
                                        <span className="font-medium text-slate-200 capitalize text-right">{val || '\u2014'}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Education */}
                        <div>
                            <h4 className="font-semibold text-slate-200 mb-3 flex items-center gap-2 text-sm">
                                <GraduationCap className="w-4 h-4 text-indigo-400" />
                                Educational Background
                            </h4>
                            <div className="space-y-2.5 text-sm">
                                {[
                                    ['Highest Education', jobseeker.highest_education],
                                    ['School', jobseeker.school_name],
                                    ['Course/Field', jobseeker.course_or_field],
                                    ['Year Graduated', jobseeker.year_graduated],
                                ].map(([label, val], i) => (
                                    <div key={i} className="flex justify-between items-start">
                                        <span className="text-slate-500">{label}</span>
                                        <span className="font-medium text-slate-200 text-right">{val || '\u2014'}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Skills */}
                        <div>
                            <h4 className="font-semibold text-slate-200 mb-3 flex items-center gap-2 text-sm">
                                <Award className="w-4 h-4 text-indigo-400" />
                                Skills & Certifications
                            </h4>
                            <div className="space-y-3">
                                {jobseeker.skills && jobseeker.skills.length > 0 ? (
                                    <div>
                                        <p className="text-xs text-slate-500 mb-2">Skills:</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {jobseeker.skills.map((skill, i) => (
                                                <span key={i} className="px-2 py-1 bg-blue-500/15 text-blue-400 rounded text-xs">
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-500">No skills listed</p>
                                )}
                                {jobseeker.certifications && jobseeker.certifications.length > 0 && (
                                    <div>
                                        <p className="text-xs text-slate-500 mb-2">Certifications:</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {jobseeker.certifications.map((cert, i) => (
                                                <span key={i} className="px-2 py-1 bg-green-500/15 text-green-400 rounded text-xs">
                                                    {cert}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {jobseeker.portfolio_url && (
                                    <div>
                                        <p className="text-xs text-slate-500 mb-2">Portfolio:</p>
                                        <a
                                            href={/^https?:\/\//i.test(jobseeker.portfolio_url) ? jobseeker.portfolio_url : '#'}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/15 text-purple-400 rounded-lg text-xs hover:bg-purple-500/25 transition-colors"
                                        >
                                            <FileText className="w-3 h-3" />
                                            View Portfolio
                                            <ChevronRight className="w-3 h-3" />
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Work Experience */}
                    {jobseeker.work_experiences && jobseeker.work_experiences.length > 0 && (
                        <div className="mt-6">
                            <h4 className="font-semibold text-slate-200 mb-3 flex items-center gap-2 text-sm">
                                <Briefcase className="w-4 h-4 text-indigo-400" />
                                Work Experience
                            </h4>
                            <div className="space-y-3">
                                {jobseeker.work_experiences.map((exp, i) => (
                                    <div key={i} className="p-3 bg-slate-800/60 border border-slate-700/50 rounded-lg">
                                        <p className="font-medium text-slate-200 text-sm">{exp.position}</p>
                                        <p className="text-sm text-slate-400">{exp.company}</p>
                                        <p className="text-xs text-slate-500 mt-1">{exp.duration}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Documents */}
                    <div className="mt-6">
                        <h4 className="font-semibold text-slate-200 mb-3 flex items-center gap-2 text-sm">
                            <FileText className="w-4 h-4 text-indigo-400" />
                            Uploaded Documents
                        </h4>
                        <div className="grid md:grid-cols-2 gap-3">
                            {/* Resume */}
                            {jobseeker.resume_url ? (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onViewDocument(jobseeker.resume_url, `Resume \u2014 ${jobseeker.display_name || jobseeker.full_name || jobseeker.name}`) }}
                                    className="group p-3 bg-slate-800/60 border border-slate-700/50 rounded-xl hover:border-indigo-500/30 hover:bg-slate-800 transition-all text-left"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-indigo-400" />
                                            <span className="text-sm text-slate-300 font-medium">Resume/CV</span>
                                        </div>
                                        <Maximize2 className="w-4 h-4 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                    <p className="text-xs text-slate-500">Click to view</p>
                                </button>
                            ) : (
                                <div className="flex items-center gap-3 p-3 bg-slate-800/30 border border-slate-800 rounded-xl">
                                    <FileText className="w-5 h-5 text-slate-600" />
                                    <span className="text-sm text-slate-500">Resume &mdash; not uploaded</span>
                                </div>
                            )}

                            {/* Certificates */}
                            {jobseeker.certificate_urls && jobseeker.certificate_urls.length > 0 && (
                                <div className="p-3 bg-slate-800/60 border border-slate-700/50 rounded-xl">
                                    <div className="flex items-center gap-2 mb-2">
                                        <FileText className="w-4 h-4 text-green-400" />
                                        <span className="text-sm text-slate-300 font-medium">Certificates ({jobseeker.certificate_urls.length})</span>
                                    </div>
                                    <div className="space-y-1">
                                        {jobseeker.certificate_urls.map((cert, i) => (
                                            <button
                                                key={i}
                                                onClick={(e) => { e.stopPropagation(); onViewDocument(cert.data, cert.name || `Certificate ${i + 1}`) }}
                                                className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline block"
                                            >
                                                {cert.name || `Certificate ${i + 1}`}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Rejection reason */}
                    {status === 'rejected' && jobseeker.rejection_reason && (
                        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                            <p className="text-sm text-red-300">
                                <strong className="text-red-400">Rejection Reason:</strong> {jobseeker.rejection_reason}
                            </p>
                        </div>
                    )}

                    {/* Timestamps */}
                    <div className="mt-4 text-xs text-slate-600">
                        Registered: {jobseeker.created_at ? new Date(jobseeker.created_at).toLocaleString() : '\u2014'}
                        {jobseeker.updated_at && ` \u2022 Updated: ${new Date(jobseeker.updated_at).toLocaleString()}`}
                    </div>

                    {/* Actions */}
                    <div className="mt-5 pt-4 border-t border-slate-800 flex items-center gap-3">
                        {status !== 'verified' && canApprove && (
                            <button
                                onClick={() => onApprove(jobseeker.id, 'jobseeker')}
                                disabled={actionLoading === jobseeker.id}
                                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 transition-colors font-medium text-sm disabled:opacity-50"
                            >
                                {actionLoading === jobseeker.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <CheckCircle className="w-4 h-4" />
                                )}
                                Verify
                            </button>
                        )}
                        {status !== 'rejected' && canReject && (
                            <button
                                onClick={() => onReject({ id: jobseeker.id, role: 'jobseeker' })}
                                disabled={actionLoading === jobseeker.id}
                                className="flex items-center gap-2 px-5 py-2.5 bg-red-600/80 text-white rounded-xl hover:bg-red-500 transition-colors font-medium text-sm disabled:opacity-50"
                            >
                                <XCircle className="w-4 h-4" />
                                Reject
                            </button>
                        )}
                        {status === 'verified' && (
                            <span className="text-emerald-400 font-medium flex items-center gap-1.5 text-sm">
                                <CheckCircle className="w-4 h-4" /> Jobseeker is verified
                            </span>
                        )}
                        {!canApprove && !canReject && status !== 'verified' && (
                            <span className="text-slate-500 text-xs">View only</span>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export { JobseekerCard }
export default JobseekerCard
