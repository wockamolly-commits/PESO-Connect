const pickFirstString = (...values) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return ''
}

// employer_profiles is 1:1 with public.users (PK on id), so the join
// should always return at most one row. Supabase's PostgREST still
// returns an array shape when the FK isn't flagged as unique in the
// schema cache. We take [0] in that case, but a length >1 means the
// invariant is broken (duplicate row, bad schema cache) and should be
// surfaced so it isn't silently swallowed.
const normalizeProfileRow = (value) => {
  if (Array.isArray(value)) {
    if (value.length > 1 && typeof console !== 'undefined') {
      console.warn(
        '[employerBranding] Expected employer_profiles to be 1:1 but got',
        value.length,
        'rows — using the first. Check schema cardinality.'
      )
    }
    return value[0] || null
  }
  return value || null
}

export const getEmployerProfile = (job = {}) => {
  return normalizeProfileRow(
    job.employer?.employer_profiles
    || job.employer_profile
    || job.employer_profiles
  )
}

export const getEmployerDisplayName = (job = {}) => {
  const profile = getEmployerProfile(job)
  return pickFirstString(
    job.employer_name,
    profile?.company_name,
    job.employer?.company_name,
    job.employer?.name,
    'Employer'
  )
}

export const getEmployerImageUrl = (job = {}) => {
  const profile = getEmployerProfile(job)
  return pickFirstString(
    job.employer?.profile_photo,
    profile?.company_logo,
    job.profile_photo,
    job.company_logo
  )
}
