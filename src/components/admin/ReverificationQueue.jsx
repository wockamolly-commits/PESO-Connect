import { useEffect, useMemo, useState } from 'react'
import { Building2, CheckCircle, FileText, Loader2, RefreshCw, User, XCircle } from 'lucide-react'
import PendingReverificationBadge from '../common/PendingReverificationBadge'
import { getCertificateSignedUrl } from '../../utils/certificateUtils'
import { buildVerifiedSnapshot, getChangedProfileFields } from '../../utils/reverification'

const FIELD_LABELS = {
    first_name: 'First Name',
    surname: 'Surname',
    middle_name: 'Middle Name',
    vocational_training: 'Vocational Training',
    highest_education: 'Highest Education',
    school_name: 'School Name',
    course_or_field: 'Course / Field',
    professional_licenses: 'Professional Licenses',
    civil_service_eligibility: 'Civil Service Eligibility',
    work_experiences: 'Work Experiences',
    company_name: 'Company Name',
    tin: 'TIN',
    business_reg_number: 'Business Registration Number',
    owner_name: 'Owner Name',
    representative_name: 'Representative Name',
}

const TABS = [
    { id: 'jobseeker', label: 'Jobseekers', icon: User },
    { id: 'employer', label: 'Employers', icon: Building2 },
]

const formatScalar = (value) => {
    if (value == null || value === '') return '-'
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    return String(value)
}

const renderStructuredValue = (field, value, signedUrls) => {
    if (field === 'vocational_training') {
        const trainings = Array.isArray(value) ? value : []
        if (!trainings.length) return <p className="text-sm text-slate-500">No entries</p>

        return (
            <div className="space-y-2">
                {trainings.map((training, index) => {
                    const certificatePath = training?.certificate_path?.trim()
                    const href = certificatePath ? signedUrls[certificatePath] : ''
                    return (
                        <div key={`${training?.course || 'training'}-${index}`} className="rounded-xl border border-slate-700/70 bg-slate-900/70 p-3">
                            <p className="text-sm font-medium text-slate-100">
                                {training?.course || 'Untitled training'} {training?.institution ? `- ${training.institution}` : ''}
                            </p>
                            {training?.certificate_level && (
                                <p className="mt-1 text-xs text-slate-400">Certificate: {training.certificate_level}</p>
                            )}
                            {certificatePath && (
                                <a
                                    href={href || '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`mt-2 inline-flex items-center gap-1.5 text-xs ${href ? 'text-emerald-300 hover:text-emerald-200 hover:underline' : 'text-slate-500'}`}
                                >
                                    <FileText className="h-3 w-3" />
                                    {href ? 'View certificate' : 'Certificate path saved'}
                                </a>
                            )}
                        </div>
                    )
                })}
            </div>
        )
    }

    if (field === 'professional_licenses' || field === 'work_experiences') {
        const items = Array.isArray(value) ? value : []
        if (!items.length) return <p className="text-sm text-slate-500">No entries</p>

        return (
            <div className="space-y-2">
                {items.map((item, index) => (
                    <div key={index} className="rounded-xl border border-slate-700/70 bg-slate-900/70 p-3 text-sm text-slate-200">
                        {Object.entries(item || {}).map(([key, itemValue]) => (
                            <p key={key}>
                                <span className="text-slate-400">{key.replace(/_/g, ' ')}:</span> {formatScalar(itemValue)}
                            </p>
                        ))}
                    </div>
                ))}
            </div>
        )
    }

    return <p className="text-sm text-slate-200 whitespace-pre-wrap">{formatScalar(value)}</p>
}

const ReverificationQueue = ({
    queueItems,
    actionLoading,
    onApprove,
    onReject,
    onRevoke,
    allowedRoleLabels = ['jobseeker', 'employer'],
}) => {
    const normalizedAllowedRoleLabels = useMemo(
        () => (Array.isArray(allowedRoleLabels) && allowedRoleLabels.length ? allowedRoleLabels : ['jobseeker', 'employer']),
        [allowedRoleLabels]
    )
    const [activeTab, setActiveTab] = useState(normalizedAllowedRoleLabels[0])
    const [expandedId, setExpandedId] = useState(null)
    const [signedUrls, setSignedUrls] = useState({})

    const visibleTabs = useMemo(
        () => TABS.filter((tab) => normalizedAllowedRoleLabels.includes(tab.id)),
        [normalizedAllowedRoleLabels]
    )

    useEffect(() => {
        if (!normalizedAllowedRoleLabels.includes(activeTab)) {
            setActiveTab(normalizedAllowedRoleLabels[0])
        }
    }, [activeTab, normalizedAllowedRoleLabels])

    const filteredItems = useMemo(
        () => queueItems.filter((item) => item.roleLabel === activeTab && normalizedAllowedRoleLabels.includes(item.roleLabel)),
        [activeTab, normalizedAllowedRoleLabels, queueItems]
    )

    useEffect(() => {
        let cancelled = false
        const certificatePaths = queueItems
            .flatMap((item) => {
                const trainings = item?.vocational_training || []
                return Array.isArray(trainings)
                    ? trainings.map((training) => training?.certificate_path?.trim()).filter(Boolean)
                    : []
            })
            .filter((path, index, arr) => arr.indexOf(path) === index)

        const missingPaths = certificatePaths.filter((path) => !signedUrls[path])
        if (!missingPaths.length) return undefined

        ;(async () => {
            const nextSignedUrls = {}
            for (const path of missingPaths) {
                try {
                    nextSignedUrls[path] = await getCertificateSignedUrl(path)
                } catch {
                    nextSignedUrls[path] = ''
                }
            }

            if (!cancelled) {
                setSignedUrls((prev) => ({ ...prev, ...nextSignedUrls }))
            }
        })()

        return () => {
            cancelled = true
        }
    }, [queueItems, signedUrls])

    return (
        <div className="animate-fade-in">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-1">Re-verification Queue</h2>
                <p className="text-slate-400 text-sm">Review verified profiles that changed watched identity or credential fields.</p>
            </div>

            <div className="mb-6 flex flex-wrap gap-3">
                {visibleTabs.map((tab) => {
                    const count = queueItems.filter((item) => item.roleLabel === tab.id).length
                    const isActive = activeTab === tab.id
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                                isActive
                                    ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                                    : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-600'
                            }`}
                        >
                            <tab.icon className="h-4 w-4" />
                            {tab.label}
                            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">{count}</span>
                        </button>
                    )
                })}
            </div>

            <div className="space-y-4">
                {filteredItems.length === 0 ? (
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-6 py-14 text-center">
                        <RefreshCw className="mx-auto mb-3 h-10 w-10 text-slate-700" />
                        <p className="text-slate-400 font-medium">No pending re-verification items.</p>
                    </div>
                ) : (
                    filteredItems.map((item) => {
                        const isExpanded = expandedId === item.id
                        const snapshot = item.verified_snapshot && Object.keys(item.verified_snapshot).length > 0
                            ? item.verified_snapshot
                            : buildVerifiedSnapshot(item.roleLabel, {})
                        const changedFields = getChangedProfileFields(item.roleLabel, snapshot, item)
                        const title = item.roleLabel === 'employer'
                            ? item.company_name || item.display_name || item.email
                            : item.display_name || item.name || item.email

                        return (
                            <div key={item.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden">
                                <button
                                    type="button"
                                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                                    className="flex w-full items-center justify-between gap-4 p-5 text-left"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate font-semibold text-slate-100">{title}</p>
                                        <p className="text-sm text-slate-500">
                                            Flagged {item.updated_at ? new Date(item.updated_at).toLocaleString() : 'recently'}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-end gap-2">
                                        <PendingReverificationBadge />
                                        {item.is_verified && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-300">
                                                <CheckCircle className="h-3 w-3" />
                                                Verified
                                            </span>
                                        )}
                                    </div>
                                </button>

                                {isExpanded && (
                                    <div className="border-t border-slate-800 px-5 pb-5 pt-5">
                                        <div className="mb-5 flex flex-wrap gap-3">
                                            <button
                                                type="button"
                                                onClick={() => onApprove(item)}
                                                disabled={actionLoading === item.id}
                                                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                                            >
                                                {actionLoading === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                                                Approve
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onReject(item)}
                                                disabled={actionLoading === item.id}
                                                className="inline-flex items-center gap-2 rounded-xl bg-red-600/85 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
                                            >
                                                <XCircle className="h-4 w-4" />
                                                Reject
                                            </button>
                                            {item.is_verified && (
                                                <button
                                                    type="button"
                                                    onClick={() => onRevoke(item)}
                                                    disabled={actionLoading === item.id}
                                                    className="inline-flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-300 hover:bg-amber-500/20 disabled:opacity-50"
                                                >
                                                    <RefreshCw className="h-4 w-4" />
                                                    Revoke
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid gap-4 lg:grid-cols-2">
                                            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                                                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Before (verified snapshot)</p>
                                                <div className="space-y-4">
                                                    {changedFields.map(({ field, before }) => (
                                                        <div key={`before-${field}`}>
                                                            <p className="mb-2 text-sm font-medium text-slate-200">{FIELD_LABELS[field] || field}</p>
                                                            {renderStructuredValue(field, before, signedUrls)}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                                                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-amber-300">After (current profile)</p>
                                                <div className="space-y-4">
                                                    {changedFields.length === 0 ? (
                                                        <p className="text-sm text-slate-400">No changed watched fields were detected.</p>
                                                    ) : changedFields.map(({ field, after }) => (
                                                        <div key={`after-${field}`}>
                                                            <p className="mb-2 text-sm font-medium text-slate-100">{FIELD_LABELS[field] || field}</p>
                                                            {renderStructuredValue(field, after, signedUrls)}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}

export { ReverificationQueue }
export default ReverificationQueue
