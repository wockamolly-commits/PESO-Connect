const stringifyList = (value: unknown, fallback = 'None') => {
  if (!Array.isArray(value) || value.length === 0) return fallback
  const parts = value
    .map((item) => {
      if (typeof item === 'string') return item.trim()
      if (item && typeof item === 'object' && 'name' in item && typeof item.name === 'string') {
        return item.name.trim()
      }
      return ''
    })
    .filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : fallback
}

const stringifyExperiences = (value: unknown) => {
  if (!Array.isArray(value) || value.length === 0) return 'None'

  const rows = value
    .map((item) => {
      if (!item || typeof item !== 'object') return ''

      const title =
        ('position' in item && typeof item.position === 'string' && item.position.trim()) ||
        ('title' in item && typeof item.title === 'string' && item.title.trim()) ||
        ''
      const company =
        ('company' in item && typeof item.company === 'string' && item.company.trim()) || ''
      const duration =
        ('duration' in item && typeof item.duration === 'string' && item.duration.trim()) ||
        ('years' in item && String(item.years).trim()) ||
        ''
      const detail = [
        title,
        company ? `at ${company}` : '',
        duration ? `(${duration})` : '',
      ]
        .filter(Boolean)
        .join(' ')
        .trim()

      return detail
    })
    .filter(Boolean)

  return rows.length > 0 ? rows.join('; ') : 'None'
}

const stringifyLocations = (value: unknown) => {
  if (!Array.isArray(value) || value.length === 0) return 'Not specified'
  const parts = value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : 'Not specified'
}

const stringifyLanguages = (value: unknown) => {
  if (!Array.isArray(value) || value.length === 0) return 'Not specified'

  const parts = value
    .map((item) => {
      if (typeof item === 'string') return item.trim()
      if (!item || typeof item !== 'object') return ''

      const language =
        ('language' in item && typeof item.language === 'string' && item.language.trim()) || ''
      const proficiency =
        ('proficiency' in item && typeof item.proficiency === 'string' && item.proficiency.trim()) || ''

      if (!language) return ''
      return proficiency ? `${language} (${proficiency})` : language
    })
    .filter(Boolean)

  return parts.length > 0 ? parts.join(', ') : 'Not specified'
}

const stringifyLicenses = (value: unknown) => {
  if (!Array.isArray(value) || value.length === 0) return 'None'

  const parts = value
    .map((item) => {
      if (typeof item === 'string') return item.trim()
      if (!item || typeof item !== 'object') return ''

      const name = ('name' in item && typeof item.name === 'string' && item.name.trim()) || ''
      const validUntil =
        ('valid_until' in item && typeof item.valid_until === 'string' && item.valid_until.trim()) || ''

      if (!name) return ''
      return validUntil ? `${name} (valid until ${validUntil})` : name
    })
    .filter(Boolean)

  return parts.length > 0 ? parts.join(', ') : 'None'
}

const stringifyTraining = (value: unknown) => {
  if (!Array.isArray(value) || value.length === 0) return 'None'

  const rows = value
    .map((item) => {
      if (!item || typeof item !== 'object') return ''

      const course = ('course' in item && typeof item.course === 'string' && item.course.trim()) || ''
      const institution =
        ('institution' in item && typeof item.institution === 'string' && item.institution.trim()) || ''
      const certificateLevel =
        ('certificate_level' in item && typeof item.certificate_level === 'string' && item.certificate_level.trim()) || ''
      const skillsAcquired =
        ('skills_acquired' in item && typeof item.skills_acquired === 'string' && item.skills_acquired.trim()) || ''

      const detail = [course, institution ? `at ${institution}` : '', certificateLevel, skillsAcquired]
        .filter(Boolean)
        .join(' | ')
        .trim()

      return detail
    })
    .filter(Boolean)

  return rows.length > 0 ? rows.join('; ') : 'None'
}

const stringifySalaryExpectation = (profile: Record<string, unknown>) => {
  const min = profile.expected_salary_min
  const max = profile.expected_salary_max
  const minText = min !== undefined && min !== null && String(min).trim() !== '' ? String(min).trim() : ''
  const maxText = max !== undefined && max !== null && String(max).trim() !== '' ? String(max).trim() : ''

  if (!minText && !maxText) return 'Not specified'
  if (minText && maxText) return `${minText} to ${maxText}`
  return minText || maxText
}

const normalizeRequirements = (job: Record<string, unknown>) => {
  const requirements = Array.isArray(job.requirements)
    ? job.requirements
    : Array.isArray(job.required_skills)
      ? job.required_skills
      : []

  return requirements
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
}

export const buildJobText = (job: Record<string, unknown>) => {
  const requirements = normalizeRequirements(job)
  const str = (key: string, fallback = 'Not specified') => {
    const v = job[key]
    return typeof v === 'string' && v.trim() ? v.trim() : fallback
  }

  return [
    `Job title: ${str('title', '')}`,
    `Category: ${str('category')}`,
    `Job summary: ${str('job_summary', str('description', 'Not provided'))}`,
    `Key responsibilities: ${str('key_responsibilities', 'Not specified')}`,
    `Requirements: ${requirements.length > 0 ? requirements.join(', ') : 'None specified'}`,
    `Preferred skills: ${stringifyList(job.preferred_skills, 'None')}`,
    `Required languages: ${stringifyList(job.required_languages, 'Not specified')}`,
    `Licenses & certifications: ${str('licenses_certifications', 'None')}`,
    `Benefits: ${stringifyList(job.benefits, 'Not specified')}`,
    `Experience level: ${str('experience_level', 'Any')}`,
    `Education level: ${str('education_level', 'None')}`,
    `Course/strand: ${str('course_strand', 'Not specified')}`,
    `Employment type: ${str('type')}`,
    `Work arrangement: ${str('work_arrangement')}`,
    `Location: ${str('location')}`,
    `Accepts PWD: ${job.accepts_pwd ? `Yes (${stringifyList(job.pwd_disabilities, 'unspecified')})` : 'No'}`,
    `Accepts returning OFWs: ${job.accepts_ofw ? 'Yes' : 'No'}`,
    `Other qualifications: ${str('other_qualifications', 'None')}`,
  ].join('\n')
}

export const buildProfileText = (profile: Record<string, unknown>) => {
  const predefinedSkills = Array.isArray(profile.predefined_skills) ? profile.predefined_skills : []
  const customSkills = Array.isArray(profile.skills) ? profile.skills : []
  const mergedSkills = [...predefinedSkills, ...customSkills]

  return [
    `Preferred occupations: ${stringifyList(profile.preferred_occupations, 'Not specified')}`,
    `Preferred job types: ${stringifyList(profile.preferred_job_type, 'Not specified')}`,
    `Skills: ${stringifyList(mergedSkills, 'Not specified')}`,
    `Work experience: ${stringifyExperiences(profile.work_experiences)}`,
    `Employment status: ${typeof profile.employment_status === 'string' ? profile.employment_status.trim() : 'Not specified'}`,
    `Education: ${typeof profile.highest_education === 'string' ? profile.highest_education.trim() : 'Not specified'}`,
    `Course or field: ${typeof profile.course_or_field === 'string' ? profile.course_or_field.trim() : 'Not specified'}`,
    `Languages: ${stringifyLanguages(profile.languages)}`,
    `Certifications: ${stringifyList(profile.certifications, 'None')}`,
    `Professional licenses: ${stringifyLicenses(profile.professional_licenses)}`,
    `Vocational training: ${stringifyTraining(profile.vocational_training)}`,
    `Portfolio: ${typeof profile.portfolio_url === 'string' && profile.portfolio_url.trim() ? profile.portfolio_url.trim() : 'None'}`,
    `Experience categories: ${stringifyList(profile.experience_categories, 'Not specified')}`,
    `Preferred local locations: ${stringifyLocations(profile.preferred_local_locations)}`,
    `Preferred overseas locations: ${stringifyLocations(profile.preferred_overseas_locations)}`,
    `Willing to relocate: ${typeof profile.willing_to_relocate === 'string' ? profile.willing_to_relocate.trim() : 'Not specified'}`,
    `Expected salary: ${stringifySalaryExpectation(profile)}`,
  ].join('\n')
}
