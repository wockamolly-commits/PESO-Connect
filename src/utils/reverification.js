export const JOBSEEKER_REVERIFICATION_FIELDS = [
    'first_name',
    'surname',
    'middle_name',
    'vocational_training',
    'highest_education',
    'school_name',
    'course_or_field',
    'professional_licenses',
    'civil_service_eligibility',
    'work_experiences',
]

export const EMPLOYER_REVERIFICATION_FIELDS = [
    'company_name',
    'tin',
    'business_reg_number',
    'owner_name',
    'representative_name',
]

export const getReverificationFields = (roleLabel) =>
    roleLabel === 'employer'
        ? EMPLOYER_REVERIFICATION_FIELDS
        : JOBSEEKER_REVERIFICATION_FIELDS

export const normalizeComparableValue = (value) => {
    if (typeof value === 'string') {
        return value.trim().toLowerCase()
    }

    if (Array.isArray(value) || (value && typeof value === 'object')) {
        return JSON.stringify(value ?? null)
    }

    return value ?? null
}

export const buildVerifiedSnapshot = (roleLabel, profile = {}) => {
    const fields = getReverificationFields(roleLabel)
    return fields.reduce((snapshot, field) => {
        snapshot[field] = profile[field] ?? (field === 'vocational_training' || field === 'professional_licenses' || field === 'work_experiences' ? [] : '')
        return snapshot
    }, {})
}

export const getChangedProfileFields = (roleLabel, snapshot = {}, profile = {}) => {
    return getReverificationFields(roleLabel)
        .filter((field) => normalizeComparableValue(snapshot[field]) !== normalizeComparableValue(profile[field]))
        .map((field) => ({
            field,
            before: snapshot[field],
            after: profile[field],
        }))
}

export const hasTrainingCertificate = (training) =>
    typeof training?.certificate_path === 'string' && training.certificate_path.trim() !== ''

export const countTrainingCertificates = (trainings = []) =>
    (Array.isArray(trainings) ? trainings : []).filter(hasTrainingCertificate).length

export const getTrainingCertificateRecord = (training, index = 0) => {
    const path = training?.certificate_path?.trim()
    if (!path) return []

    const name = training?.certificate_file_name || path.split('/').pop() || `training-certificate-${index + 1}`
    const size = typeof training?.certificate_size === 'number' ? training.certificate_size : null
    return [{ path, name, size }]
}
