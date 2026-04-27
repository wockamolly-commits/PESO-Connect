function cleanString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function isTrue(value) {
  return value === true || value === 'true'
}

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function uniqueStrings(values = []) {
  const seen = new Set()
  return values
    .map(cleanString)
    .filter(Boolean)
    .filter((value) => {
      const key = value.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

function formatDate(dateValue) {
  const value = cleanString(dateValue)
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function formatDisplayLabel(value) {
  const text = cleanString(value)
  if (!text) return ''
  return text
    .split(/[-_]/)
    .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1)}` : ''))
    .join(' ')
}

function formatYearRange(start, end) {
  const startValue = cleanString(start)
  const endValue = cleanString(end)
  if (startValue && endValue) return `${startValue} - ${endValue}`
  if (startValue) return `${startValue} - Present`
  return endValue
}

function composeFullName(data = {}) {
  const source = data && typeof data === 'object' ? data : {}
  const first = cleanString(source.first_name)
  const middle = cleanString(source.middle_name)
  const surname = cleanString(source.surname)
  const suffix = cleanString(source.suffix)
  const explicitFullName = cleanString(source.full_name || source.display_name || source.name)

  const assembled = [first, middle, surname].filter(Boolean).join(' ')
  const name = assembled || explicitFullName
  if (!name) return ''
  if (!suffix || suffix === 'None') return name
  return `${name} ${suffix}`.trim()
}

function normalizeLanguage(language) {
  if (typeof language === 'string') {
    const value = cleanString(language)
    return value ? { language: value, proficiency: '' } : null
  }

  if (!language || typeof language !== 'object') return null

  const name = cleanString(language.language)
  const proficiency = cleanString(language.proficiency)
  if (!name) return null

  return { language: name, proficiency }
}

function normalizeExperience(experience) {
  if (!experience || typeof experience !== 'object') return null

  const position = cleanString(experience.position)
  const company = cleanString(experience.company)
  const address = cleanString(experience.address)
  const employmentStatus = cleanString(experience.employment_status)
  const description = cleanString(experience.description)
  const duration =
    cleanString(experience.duration) ||
    formatYearRange(experience.year_started, experience.year_ended)

  if (!position && !company && !address && !employmentStatus && !description && !duration) {
    return null
  }

  return {
    position,
    company,
    address,
    employmentStatus,
    description,
    duration,
  }
}

function normalizeTraining(training) {
  if (!training || typeof training !== 'object') return null

  const course = cleanString(training.course)
  const institution = cleanString(training.institution)
  const hours = cleanString(training.hours)
  const skillsAcquired = cleanString(training.skills_acquired)
  const certificateLevel = cleanString(training.certificate_level)

  if (!course && !institution && !hours && !skillsAcquired && !certificateLevel) {
    return null
  }

  return {
    course,
    institution,
    hours,
    skillsAcquired,
    certificateLevel,
  }
}

function normalizeLicense(license) {
  if (!license || typeof license !== 'object') return null

  const name = cleanString(license.name)
  const number = cleanString(license.number)
  const validUntil = formatDate(license.valid_until)

  if (!name && !number && !validUntil) return null

  return {
    name,
    number,
    validUntil,
  }
}

function normalizeEducation(data = {}) {
  const highestEducation = cleanString(data.highest_education)
  const schoolName = cleanString(data.school_name)
  const courseOrField = cleanString(data.course_or_field)
  const yearGraduated = cleanString(data.year_graduated)
  const educationLevelReached = cleanString(data.education_level_reached)
  const yearLastAttended = cleanString(data.year_last_attended)
  const currentlyInSchool = isTrue(data.currently_in_school)
  const didNotGraduate = isTrue(data.did_not_graduate)

  if (
    !highestEducation &&
    !schoolName &&
    !courseOrField &&
    !yearGraduated &&
    !educationLevelReached &&
    !yearLastAttended
  ) {
    return null
  }

  const details = []
  if (currentlyInSchool) {
    details.push('Currently in school')
  } else if (didNotGraduate) {
    details.push('Undergraduate')
  }
  if (educationLevelReached) {
    details.push(`Highest level reached: ${educationLevelReached}`)
  }
  if (yearGraduated) {
    details.push(`Year graduated: ${yearGraduated}`)
  } else if (yearLastAttended) {
    details.push(`Last attended: ${yearLastAttended}`)
  }

  return {
    highestEducation,
    schoolName,
    courseOrField,
    details,
  }
}

export function normalizeResumeData(data = {}) {
  const source = data && typeof data === 'object' ? data : {}
  const fullName = composeFullName(source)
  const email = cleanString(source.email)
  const mobileNumber = cleanString(source.mobile_number)
  const locationParts = [
    cleanString(source.street_address),
    cleanString(source.barangay),
    cleanString(source.city),
    cleanString(source.province),
  ].filter(Boolean)
  const location = locationParts.join(', ')

  const preferredOccupations = uniqueStrings(asArray(source.preferred_occupations))
  const preferredLocalLocations = uniqueStrings(asArray(source.preferred_local_locations))
  const preferredOverseasLocations = uniqueStrings(asArray(source.preferred_overseas_locations))
  const preferredJobTypes = uniqueStrings(asArray(source.preferred_job_type)).map(formatDisplayLabel)
  const civilStatus = cleanString(source.civil_status)
  const sex = cleanString(source.sex)
  const dateOfBirth = cleanString(source.date_of_birth)
  const religion = cleanString(source.religion)
  const summary = uniqueStrings([
    cleanString(source.display_name),
    cleanString(source.objective),
    cleanString(source.summary),
    cleanString(source.about_me),
  ])[0]

  return {
    fullName,
    email,
    mobileNumber,
    profilePhoto: cleanString(source.profile_photo),
    location,
    civilStatus,
    sex,
    dateOfBirth: formatDate(dateOfBirth),
    religion,
    summary,
    employmentStatus: cleanString(source.employment_status),
    portfolioUrl: cleanString(source.portfolio_url),
    civilServiceEligibility: cleanString(source.civil_service_eligibility),
    civilServiceDate: formatDate(source.civil_service_date),
    willingToRelocate: cleanString(source.willing_to_relocate),
    preferredOccupations,
    preferredLocalLocations,
    preferredOverseasLocations,
    preferredJobTypes,
    expectedSalaryMin: cleanString(source.expected_salary_min),
    expectedSalaryMax: cleanString(source.expected_salary_max),
    skills: uniqueStrings([
      ...asArray(source.predefined_skills),
      ...asArray(source.skills),
    ]),
    certifications: uniqueStrings(asArray(source.certifications)),
    languages: asArray(source.languages).map(normalizeLanguage).filter(Boolean),
    workExperiences: asArray(source.work_experiences).map(normalizeExperience).filter(Boolean),
    vocationalTraining: asArray(source.vocational_training).map(normalizeTraining).filter(Boolean),
    professionalLicenses: asArray(source.professional_licenses).map(normalizeLicense).filter(Boolean),
    education: normalizeEducation(source),
  }
}

export function buildResumeExportData(baseData = {}, overrideData = {}) {
  return {
    ...baseData,
    ...overrideData,
    email: cleanString(overrideData.email) || cleanString(baseData.email),
    profile_photo: cleanString(overrideData.profile_photo) || cleanString(baseData.profile_photo),
    full_name: composeFullName(overrideData) || composeFullName(baseData),
  }
}
