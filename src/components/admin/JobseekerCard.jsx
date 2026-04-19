import {
    User, FileText, Maximize2,
    ChevronDown, ChevronUp, CheckCircle, XCircle, Loader2,
    Briefcase, GraduationCap, Award, ChevronRight
} from 'lucide-react'
import { getCertificateSignedUrl, getCertificateSource } from '../../utils/certificateUtils'
import { getTrainingCertificateRecord } from '../../utils/reverification'

// Resolves a certificate record to a viewable URL. Prefers a freshly-minted
// signed URL (private bucket); falls back to any legacy stored URL.
const resolveCertificateUrl = async (cert) => {
    if (cert?.path) {
        try {
            const signed = await getCertificateSignedUrl(cert.path)
            if (signed) return signed
        } catch {
            // fall through to legacy url below
        }
    }
    return getCertificateSource(cert)
}

const SUFFIX_PLACEHOLDERS = new Set(['none', 'n/a', 'na', '-'])
const normalizeSuffix = (value) => {
    if (typeof value !== 'string') return value ?? ''
    const trimmedValue = value.trim()
    return SUFFIX_PLACEHOLDERS.has(trimmedValue.toLowerCase()) ? '' : trimmedValue
}

const buildDisplayName = (jobseeker) => {
    const splitName = [
        jobseeker.first_name,
        jobseeker.middle_name,
        jobseeker.surname,
        normalizeSuffix(jobseeker.suffix),
    ]
        .map((value) => typeof value === 'string' ? value.trim() : '')
        .filter(Boolean)
        .join(' ')

    return splitName || jobseeker.display_name || jobseeker.full_name || jobseeker.name || 'Unnamed User'
}

const formatList = (values = []) => values.filter(Boolean).join(', ')

const formatAddress = (jobseeker) => formatList([
    jobseeker.street_address,
    jobseeker.barangay,
    jobseeker.city,
    jobseeker.province,
])

const formatSalaryRange = (jobseeker) => {
    if (!jobseeker.expected_salary_min && !jobseeker.expected_salary_max) return '\u2014'
    if (jobseeker.expected_salary_min && jobseeker.expected_salary_max) {
        return `\u20B1${jobseeker.expected_salary_min} - \u20B1${jobseeker.expected_salary_max}`
    }
    return `\u20B1${jobseeker.expected_salary_min || jobseeker.expected_salary_max}`
}

const getEmploymentDetail = (jobseeker) => {
    if (jobseeker.employment_status === 'Employed') return jobseeker.employment_type || '\u2014'
    if (jobseeker.employment_status === 'Self-Employed') return jobseeker.self_employment_type || '\u2014'
    if (jobseeker.employment_status === 'Unemployed') return jobseeker.unemployment_reason || '\u2014'
    return '\u2014'
}

const getSkills = (jobseeker) => {
    const merged = [...(jobseeker.predefined_skills || []), ...(jobseeker.skills || [])]
    return [...new Set(merged.filter(Boolean))]
}

const getLicenses = (jobseeker) => (
    (jobseeker.professional_licenses || [])
        .map((license, index) => ({
            label: license?.name || license?.license || license?.title || `License ${index + 1}`,
            path: license?.license_copy_path || '',
            fileName: license?.license_file_name || '',
        }))
        .filter((license) => license.label || license.path)
)

const formatExperienceYears = (experience = {}) => {
    const start = experience?.year_started?.toString().trim()
    const end = experience?.year_ended?.toString().trim()

    if (start && end) return `${start} - ${end}`
    if (start) return `${start} - Present`
    if (end) return `Until ${end}`
    return '\u2014'
}

const getTrainings = (jobseeker) => (
    (jobseeker.vocational_training || [])
        .map((training, index) => {
            const certificate = getTrainingCertificateRecord(training, index)?.[0] || null
            return {
                label: training?.course || training?.title || `Training ${index + 1}`,
                provider: training?.institution || training?.provider || '\u2014',
                hours: training?.hours || '',
                certificate_level: training?.certificate_level || '',
                skills_acquired: training?.skills_acquired || '',
                certificate,
            }
        })
)

const getEducationRows = (jobseeker) => {
    const currentlyInSchool = jobseeker.currently_in_school === true
    const didNotGraduate = jobseeker.did_not_graduate === true

    if (currentlyInSchool) {
        return [
            ['Highest Education', jobseeker.highest_education],
            ['School', jobseeker.school_name],
            ['Course/Field', jobseeker.course_or_field],
            ['Expected Graduation', jobseeker.year_graduated],
            ['Currently In School', 'Yes'],
            ['Level Reached', jobseeker.education_level_reached],
            ['Last Attended', jobseeker.year_last_attended],
        ]
    }

    if (didNotGraduate) {
        return [
            ['Highest Education', jobseeker.highest_education],
            ['School', jobseeker.school_name],
            ['Course/Field', jobseeker.course_or_field],
            ['Currently In School', 'No'],
            ['Did Not Graduate', 'Yes'],
            ['Level Reached', jobseeker.education_level_reached],
            ['Last Attended', jobseeker.year_last_attended],
        ]
    }

    return [
        ['Highest Education', jobseeker.highest_education],
        ['School', jobseeker.school_name],
        ['Course/Field', jobseeker.course_or_field],
        ['Year Graduated', jobseeker.year_graduated],
        ['Currently In School', 'No'],
        ['Did Not Graduate', 'No'],
    ]
}

const DetailRow = ({ label, value, capitalize = false }) => (
    <div className="grid grid-cols-[minmax(0,11rem)_minmax(0,1fr)] gap-4 items-start">
        <span className="text-slate-500">{label}</span>
        <span className={`font-medium text-slate-200 text-right break-words min-w-0 ${capitalize ? 'capitalize' : ''}`}>
            {value || '\u2014'}
        </span>
    </div>
)

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
                            {buildDisplayName(jobseeker)}
                        </h3>
                        <p className="text-sm text-slate-500 truncate">
                            {jobseeker.email} &bull; {getSkills(jobseeker).length} skill(s)
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                    {jobseeker.profile_modified_since_verification && status === 'verified' && (
                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-yellow-500/15 text-yellow-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                            Profile Modified
                        </span>
                    )}
                    <span className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold ${
                        status === 'pending'
                            ? 'bg-amber-500/15 text-amber-400'
                            : status === 'verified'
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : status === 'expired'
                                    ? 'bg-orange-500/15 text-orange-400'
                                    : 'bg-red-500/15 text-red-400'
                    }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                            status === 'pending'
                                ? 'bg-amber-400' : status === 'verified'
                                    ? 'bg-emerald-400' : status === 'expired'
                                        ? 'bg-orange-400' : 'bg-red-400'
                        }`} />
                        {status === 'expired' ? 'Expired' : status.charAt(0).toUpperCase() + status.slice(1)}
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
                                    ['Full Name', buildDisplayName(jobseeker)],
                                    ['Date of Birth', jobseeker.date_of_birth],
                                    ['Sex', jobseeker.sex],
                                    ['Civil Status', jobseeker.civil_status],
                                    ['Religion', jobseeker.religion],
                                    ['Address', formatAddress(jobseeker)],
                                    ['Mobile', jobseeker.mobile_number],
                                    ['Contact Method', jobseeker.preferred_contact_method],
                                ].map(([label, val], i) => (
                                    <DetailRow key={i} label={label} value={val} capitalize />
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
                                    ['Employment Status', jobseeker.employment_status],
                                    ['Employment Detail', getEmploymentDetail(jobseeker)],
                                    ['Months Looking', jobseeker.months_looking_for_work],
                                    ['Job Type', jobseeker.preferred_job_type?.join(', ') || '\u2014'],
                                    ['Preferred Occupation', formatList(jobseeker.preferred_occupations || [])],
                                    ['Local Location', formatList(jobseeker.preferred_local_locations || [])],
                                    ['Overseas Location', formatList(jobseeker.preferred_overseas_locations || [])],
                                    ['Salary Range', formatSalaryRange(jobseeker)],
                                    ['Willing to Relocate', jobseeker.willing_to_relocate === 'yes' ? 'Yes' : 'No'],
                                ].map(([label, val], i) => (
                                    <DetailRow key={i} label={label} value={val} capitalize />
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
                                {getEducationRows(jobseeker).map(([label, val], i) => (
                                    <DetailRow key={i} label={label} value={val} />
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
                                {getSkills(jobseeker).length > 0 ? (
                                    <div>
                                        <p className="text-xs text-slate-500 mb-2">Skills:</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {getSkills(jobseeker).map((skill, i) => (
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
                                {getLicenses(jobseeker).length > 0 && (
                                    <div>
                                        <p className="text-xs text-slate-500 mb-2">Professional Licenses:</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {getLicenses(jobseeker).map((license, i) => (
                                                <span key={i} className="px-2 py-1 bg-cyan-500/15 text-cyan-400 rounded text-xs">
                                                    {license.label}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {jobseeker.civil_service_eligibility && (
                                    <div className="text-xs text-slate-400">
                                        Civil Service: {jobseeker.civil_service_eligibility}
                                        {jobseeker.civil_service_date ? ` (${jobseeker.civil_service_date})` : ''}
                                    </div>
                                )}
                                {(jobseeker.languages || []).length > 0 && (
                                    <div>
                                        <p className="text-xs text-slate-500 mb-2">Languages:</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {jobseeker.languages.map((language, i) => (
                                                <span key={i} className="px-2 py-1 bg-amber-500/15 text-amber-400 rounded text-xs">
                                                    {language.language}{language.proficiency ? ` (${language.proficiency})` : ''}
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
                                        <p className="text-xs text-slate-500 mt-1">{formatExperienceYears(exp)}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {(jobseeker.vocational_training && jobseeker.vocational_training.length > 0) && (
                        <div className="mt-6">
                            <h4 className="font-semibold text-slate-200 mb-3 flex items-center gap-2 text-sm">
                                <GraduationCap className="w-4 h-4 text-indigo-400" />
                                Trainings
                            </h4>
                            <div className="space-y-3">
                                {getTrainings(jobseeker).map((training, i) => (
                                    <div key={i} className="p-3 bg-slate-800/60 border border-slate-700/50 rounded-lg">
                                        <p className="font-medium text-slate-200 text-sm">{training.label}</p>
                                        <p className="text-sm text-slate-400">{training.provider}</p>
                                        <div className="mt-2 space-y-1 text-xs text-slate-500">
                                            {training.hours && (
                                                <p>Hours: {training.hours}</p>
                                            )}
                                            {training.certificate_level && (
                                                <p>Certificate Received: {training.certificate_level}</p>
                                            )}
                                            {training.skills_acquired && (
                                                <p>Skills Acquired: {training.skills_acquired}</p>
                                            )}
                                        </div>
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

                            {/* Professional License Proofs */}
                            {getLicenses(jobseeker).some((license) => license.path) && (
                                <div className="p-3 bg-slate-800/60 border border-slate-700/50 rounded-xl">
                                    <div className="flex items-center gap-2 mb-2">
                                        <FileText className="w-4 h-4 text-green-400" />
                                        <span className="text-sm text-slate-300 font-medium">Professional License Proofs</span>
                                    </div>
                                    <div className="space-y-1">
                                        {getLicenses(jobseeker).filter((license) => license.path).map((license, i) => (
                                            <button
                                                key={`${license.label}-${i}`}
                                                onClick={async (e) => {
                                                    e.stopPropagation()
                                                    const url = await resolveCertificateUrl({ path: license.path, name: license.fileName || license.label })
                                                    onViewDocument(url, `${license.label} Proof`)
                                                }}
                                                className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline block"
                                            >
                                                {license.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Technical/Vocational Training Proofs */}
                            {getTrainings(jobseeker).some((training) => training.certificate?.path) && (
                                <div className="p-3 bg-slate-800/60 border border-slate-700/50 rounded-xl">
                                    <div className="flex items-center gap-2 mb-2">
                                        <FileText className="w-4 h-4 text-amber-400" />
                                        <span className="text-sm text-slate-300 font-medium">Technical/Vocational Training Proofs</span>
                                    </div>
                                    <div className="space-y-1">
                                        {getTrainings(jobseeker).filter((training) => training.certificate?.path).map((training, i) => (
                                            <button
                                                key={`${training.label}-${i}`}
                                                onClick={async (e) => {
                                                    e.stopPropagation()
                                                    const url = await resolveCertificateUrl(training.certificate)
                                                    onViewDocument(url, `${training.label} Training Proof`)
                                                }}
                                                className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline block"
                                            >
                                                {training.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Civil Service Proof */}
                            {jobseeker.civil_service_cert_path && (
                                <div className="p-3 bg-slate-800/60 border border-slate-700/50 rounded-xl">
                                    <div className="flex items-center gap-2 mb-2">
                                        <FileText className="w-4 h-4 text-cyan-400" />
                                        <span className="text-sm text-slate-300 font-medium">Civil Service Proof</span>
                                    </div>
                                    <button
                                        onClick={async (e) => {
                                            e.stopPropagation()
                                            const url = await resolveCertificateUrl({ path: jobseeker.civil_service_cert_path, name: jobseeker.civil_service_eligibility || 'Civil Service Proof' })
                                            onViewDocument(url, `Civil Service Proof — ${jobseeker.civil_service_eligibility || jobseeker.display_name || jobseeker.full_name || jobseeker.name}`)
                                        }}
                                        className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline block"
                                    >
                                        {jobseeker.civil_service_eligibility || 'Civil Service Eligibility'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-6">
                        <h4 className="font-semibold text-slate-200 mb-3 flex items-center gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-indigo-400" />
                            Agreements
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {[
                                ['Terms & Conditions', jobseeker.terms_accepted],
                                ['Data Privacy', jobseeker.data_processing_consent],
                                ['PESO Verification', jobseeker.peso_verification_consent],
                                ['Info Accuracy', jobseeker.info_accuracy_confirmation],
                                ['DOLE Authorization', jobseeker.dole_authorization],
                            ].map(([label, accepted], i) => (
                                <span key={i} className={`px-3 py-1 rounded-lg text-xs font-medium ${accepted ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                                    {accepted ? '\u2713' : '\u2717'} {label}
                                </span>
                            ))}
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

                    {/* Expiry info */}
                    {status === 'expired' && jobseeker.verification_expired_at && (
                        <div className="mt-4 p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                            <p className="text-sm text-orange-300">
                                <strong className="text-orange-400">Verification Expired:</strong>{' '}
                                {jobseeker.verified_for_year ? `Previously verified for ${jobseeker.verified_for_year}.` : 'Verification expired.'}{' '}
                                Expired on {new Date(jobseeker.verification_expired_at).toLocaleDateString()}.
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
                                {status === 'expired' ? 'Re-Verify' : 'Verify'}
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
                                <CheckCircle className="w-4 h-4" /> Jobseeker is verified{jobseeker.verified_for_year ? ` (${jobseeker.verified_for_year})` : ''}
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
