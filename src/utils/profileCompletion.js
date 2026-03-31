// src/utils/profileCompletion.js

const jobseekerChecks = [
    { key: 'profile_photo', label: 'Add a profile photo', weight: 5, test: (d) => !!d.profile_photo },
    { key: 'personal_info', label: 'Complete personal information', weight: 15, test: (d) => !!((d.first_name || d.full_name) && d.date_of_birth && d.city && d.province) },
    { key: 'contact_info', label: 'Add contact information', weight: 10, test: (d) => !!d.mobile_number },
    { key: 'employment_prefs', label: 'Set employment preferences', weight: 10, test: (d) => !!(d.preferred_job_type?.length > 0 && (d.preferred_local_locations?.length > 0 || d.preferred_job_location)) },
    { key: 'education', label: 'Add educational background', weight: 15, test: (d) => !!(d.highest_education && d.school_name) },
    { key: 'skills', label: 'Add at least 3 skills', weight: 15, test: (d) => d.skills?.length >= 3 },
    { key: 'work_experience', label: 'Add work experience', weight: 10, test: (d) => d.work_experiences?.length > 0 },
    { key: 'resume', label: 'Upload your resume', weight: 10, test: (d) => !!d.resume_url },
    { key: 'certifications', label: 'Add certifications', weight: 5, test: (d) => d.certifications?.length > 0 },
    { key: 'portfolio', label: 'Add portfolio URL', weight: 5, test: (d) => !!d.portfolio_url },
]

const employerChecks = [
    { key: 'company_info', label: 'Complete company information', weight: 20, test: (d) => !!(d.company_name && d.employer_type && d.business_address && d.nature_of_business) },
    { key: 'representative', label: 'Add representative details', weight: 15, test: (d) => !!(d.representative_name && d.representative_position) },
    { key: 'documents', label: 'Upload business documents', weight: 20, test: (d) => !!(d.business_permit_url && d.gov_id_url) },
    { key: 'contact', label: 'Add contact details', weight: 15, test: (d) => !!(d.contact_email && d.contact_number) },
    { key: 'description', label: 'Add company description', weight: 10, test: (d) => !!d.company_description },
    { key: 'profile_photo', label: 'Upload company logo', weight: 10, test: (d) => !!d.profile_photo },
    { key: 'website', label: 'Add website or social links', weight: 10, test: (d) => !!(d.company_website || d.facebook_url || d.linkedin_url) },
]

const homeownerChecks = [
    { key: 'personal_info', label: 'Complete your name', weight: 25, test: (d) => !!(d.first_name || d.full_name) },
    { key: 'contact_info', label: 'Add contact number', weight: 20, test: (d) => !!d.contact_number },
    { key: 'profile_photo', label: 'Add a profile photo', weight: 15, test: (d) => !!d.profile_photo },
    { key: 'address', label: 'Add your address', weight: 15, test: (d) => !!(d.city && d.province) },
    { key: 'bio', label: 'Write a short bio', weight: 15, test: (d) => !!d.bio },
    { key: 'service_preferences', label: 'Add service preferences', weight: 10, test: (d) => d.service_preferences?.length > 0 },
]

const checksByRole = {
    jobseeker: jobseekerChecks,
    employer: employerChecks,
    homeowner: homeownerChecks,
}

export function calculateCompletion(userData) {
    if (!userData?.role) return { percentage: 0, missing: [] }

    // For role='user', look up checks by subtype
    const key = userData.role === 'user' ? userData.subtype : userData.role
    const checks = checksByRole[key]
    if (!checks) return { percentage: 0, missing: [] }

    let earned = 0
    const missing = []

    for (const check of checks) {
        if (check.test(userData)) {
            earned += check.weight
        } else {
            missing.push({ key: check.key, label: check.label })
        }
    }

    return { percentage: earned, missing }
}
