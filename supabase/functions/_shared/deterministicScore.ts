// Deterministic scoring logic shared by frontend and edge functions.

export const normalizeSkillName = (name) => {
  if (!name || typeof name !== 'string') return ''
  return name.trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

export const deduplicateSkills = (skills) => {
  const seen = new Set()
  return skills.filter((skill) => {
    const key = skill.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export const VALID_EDUCATION_LEVELS = [
  'Elementary Graduate',
  'High School Graduate',
  'Senior High School Graduate',
  'Vocational/Technical Graduate',
  'College Undergraduate',
  'College Graduate',
  'Masteral Degree',
  'Doctoral Degree',
]

export const normalizeEducationLevel = (degree) => {
  if (!degree || typeof degree !== 'string') return ''
  const d = degree.toLowerCase()
  if (d.includes('doctor') || d.includes('phd')) return 'Doctoral Degree'
  if (d.includes('master') || d.includes('mba') || d.includes('m.s') || d.includes('m.a')) return 'Masteral Degree'
  if (d.includes('bachelor') || d.includes('b.s') || d.includes('b.a') || d.includes('college grad')) return 'College Graduate'
  if (d.includes('college') || d.includes('undergrad')) return 'College Undergraduate'
  if (d.includes('vocational') || d.includes('tesda') || d.includes('technical') || d.includes('nc ')) return 'Vocational/Technical Graduate'
  if (d.includes('senior high') || d.includes('shs') || d.includes('grade 12')) return 'Senior High School Graduate'
  if (d.includes('high school') || d.includes('secondary')) return 'High School Graduate'
  if (d.includes('elementary') || d.includes('primary') || d.includes('grade 6')) return 'Elementary Graduate'
  return ''
}

export const JOB_EDUCATION_ORDINAL = {
  none: -1,
  elementary: 0,
  'high-school': 1,
  'senior-high': 1.5,
  vocational: 2,
  college: 3,
  masters: 4,
  doctoral: 5,
}

export const USER_EDUCATION_ORDINAL = {
  'Elementary Graduate': 0,
  'High School Graduate': 1,
  'Senior High School Graduate': 1.5,
  'Vocational/Technical Graduate': 2,
  'College Undergraduate': 2.5,
  'College Graduate': 3,
  'Masteral Degree': 4,
  'Doctoral Degree': 5,
}

const isTrueLike = (value) => value === true || value === 'true'

export const deriveUserEducationLevel = (userData = {}) => {
  const highestEducation =
    typeof userData === 'string'
      ? userData
      : (userData.highest_education || '')

  const normalizedExisting = normalizeEducationLevel(highestEducation)
  if (normalizedExisting && !['College Graduate', 'Masteral Degree'].includes(normalizedExisting)) {
    return normalizedExisting
  }

  const raw = String(highestEducation || '').toLowerCase()
  const currentlyInSchool = isTrueLike(userData.currently_in_school)
  const didNotGraduate = isTrueLike(userData.did_not_graduate)
  const incomplete = currentlyInSchool || didNotGraduate

  if (raw.includes('graduate studies') || raw.includes('post-graduate')) {
    return incomplete ? 'College Graduate' : 'Masteral Degree'
  }
  if (raw.includes('tertiary') || raw.includes('college')) {
    return incomplete ? 'College Undergraduate' : (normalizedExisting || 'College Graduate')
  }
  if (raw.includes('vocational') || raw.includes('technical') || raw.includes('tesda') || raw.includes('nc ')) {
    return 'Vocational/Technical Graduate'
  }
  if (raw.includes('senior high') || raw.includes('grade 11') || raw.includes('grade 12') || raw.includes('shs')) {
    return incomplete ? 'High School Graduate' : 'Senior High School Graduate'
  }
  if (raw.includes('junior high') || raw.includes('high school') || raw.includes('secondary')) {
    return 'High School Graduate'
  }
  if (raw.includes('elementary') || raw.includes('primary')) {
    return 'Elementary Graduate'
  }

  return normalizedExisting || ''
}

export const parseEducationRequirementLevel = (requirement = '') => {
  if (!requirement) return ''
  const raw = requirement.toLowerCase().trim()
  if (!raw) return ''
  if (USER_EDUCATION_ORDINAL[requirement]) return requirement
  if (raw.includes('doctor') || raw.includes('phd')) return 'Doctoral Degree'
  if (raw.includes('master') || raw.includes('post-graduate') || raw.includes('graduate studies')) return 'Masteral Degree'
  if (
    raw.includes('college graduate') ||
    raw.includes("bachelor's degree") ||
    raw.includes('bachelors degree') ||
    raw.includes('bachelor degree') ||
    raw.includes("bachelor's") ||
    raw.includes('college degree')
  ) return 'College Graduate'
  if (
    raw.includes('college undergraduate') ||
    raw.includes('college level') ||
    raw.includes('currently studying college') ||
    raw.includes('tertiary level')
  ) return 'College Undergraduate'
  if (raw.includes('vocational') || raw.includes('technical') || raw.includes('tesda') || /\bnc\s*[1-4]\b/i.test(raw)) {
    return 'Vocational/Technical Graduate'
  }
  if (raw.includes('senior high') || raw.includes('shs') || raw.includes('grade 12')) return 'Senior High School Graduate'
  if (raw.includes('high school') || raw.includes('secondary')) return 'High School Graduate'
  if (raw.includes('elementary') || raw.includes('primary')) return 'Elementary Graduate'

  return normalizeEducationLevel(requirement)
}

export const getUserEducationOrdinal = (userData = {}) => {
  const normalized = typeof userData === 'string' ? normalizeEducationLevel(userData) : deriveUserEducationLevel(userData)
  return USER_EDUCATION_ORDINAL[normalized] ?? 0
}

export const getJobEducationOrdinal = (educationRequirement = '') => {
  const raw = String(educationRequirement || '').toLowerCase().trim()
  if (raw in JOB_EDUCATION_ORDINAL) return JOB_EDUCATION_ORDINAL[raw]

  const parsed = parseEducationRequirementLevel(educationRequirement)
  const userOrdinal = USER_EDUCATION_ORDINAL[parsed]
  if (typeof userOrdinal === 'number') {
    if (userOrdinal >= 5) return JOB_EDUCATION_ORDINAL.doctoral
    if (userOrdinal >= 4) return JOB_EDUCATION_ORDINAL.masters
    if (userOrdinal >= 3) return JOB_EDUCATION_ORDINAL.college
    if (userOrdinal >= 2) return JOB_EDUCATION_ORDINAL.vocational
    if (userOrdinal >= 1.5) return JOB_EDUCATION_ORDINAL['senior-high']
    if (userOrdinal >= 1) return JOB_EDUCATION_ORDINAL['high-school']
    return JOB_EDUCATION_ORDINAL.elementary
  }

  // If a non-empty requirement string couldn't be parsed, return elementary (0) rather than
  // -1 so the job is not silently treated as having no education requirement.
  return raw ? JOB_EDUCATION_ORDINAL.elementary : -1
}

export const SKILL_SYNONYM_GROUPS = [
  ['welding', 'metal fabrication', 'metal work'],
  ['arc welding', 'smaw', 'stick welding', 'shielded metal arc welding'],
  ['mig welding', 'gmaw', 'gas metal arc welding'],
  ['tig welding', 'gtaw', 'gas tungsten arc welding'],
  ['plumbing', 'pipe work', 'pipe laying'],
  ['pipe fitting', 'pipe installation'],
  ['electrical installation', 'electrical wiring', 'wiring'],
  ['electrical troubleshooting', 'electrical repair', 'electrical maintenance'],
  ['carpentry', 'woodworking', 'wood work'],
  ['masonry', 'bricklaying', 'brick laying', 'concrete work'],
  ['painting', 'house painting', 'wall painting', 'paint work'],
  ['auto mechanic', 'automotive repair', 'car repair', 'vehicle repair', 'auto repair'],
  ['motorcycle repair', 'motorcycle mechanic'],
  ['aircon repair', 'aircon technician', 'hvac', 'aircon maintenance', 'air conditioning'],
  ['refrigeration', 'refrigeration repair', 'ref repair'],
  ['roofing', 'roof installation', 'roof repair'],
  ['tile setting', 'tile installation', 'tiling'],
  ['driving', 'vehicle operation', 'driver'],
  ['forklift operation', 'forklift driving', 'forklift operator'],
  ['motorcycle operation', 'motorcycle driving'],
  ['delivery', 'delivery service', 'courier'],
  ['logistics', 'supply chain', 'warehousing'],
  ['cooking', 'culinary', 'food preparation', 'food prep'],
  ['baking', 'pastry making', 'bread making'],
  ['food safety', 'food handling', 'food sanitation'],
  ['bartending', 'mixology', 'bar service'],
  ['barista', 'coffee making', 'coffee preparation'],
  ['housekeeping', 'room attendant', 'hotel housekeeping', 'cleaning'],
  ['laundry', 'laundry service', 'laundry operation'],
  ['waitstaff', 'food service', 'table service', 'serving'],
  ['farming', 'agriculture', 'crop production'],
  ['gardening', 'landscaping', 'horticulture'],
  ['tractor operation', 'farm equipment operation', 'farm machinery'],
  ['animal husbandry', 'livestock care', 'animal care'],
  ['fish culture', 'aquaculture', 'fishery'],
  ['ms office', 'microsoft office', 'office suite'],
  ['ms excel', 'excel', 'spreadsheet'],
  ['ms word', 'word processing'],
  ['typing skills', 'keyboarding', 'typing'],
  ['data entry', 'data encoding', 'encoding'],
  ['bookkeeping', 'basic accounting', 'record keeping'],
  ['computer literacy', 'basic computer skills', 'computer operation'],
  ['social media management', 'social media marketing', 'smm'],
  ['programming', 'software development', 'coding', 'software engineering'],
  ['web development', 'frontend development', 'backend development', 'full stack development'],
  ['graphic design', 'visual design', 'ui design', 'layout design'],
  ['cashiering', 'cash handling', 'cashier operation', 'pos operation'],
  ['sales', 'selling', 'retail sales'],
  ['inventory management', 'stock management', 'inventory control'],
  ['merchandising', 'product display', 'visual merchandising'],
  ['hairdressing', 'hair cutting', 'hairstyling', 'hair styling'],
  ['manicure', 'nail care', 'nail art'],
  ['massage therapy', 'massage', 'therapeutic massage'],
  ['tailoring', 'sewing', 'dressmaking', 'garment making'],
  ['communication skills', 'verbal communication', 'oral communication'],
  ['written communication', 'business writing', 'report writing'],
  ['teamwork', 'team player', 'collaboration'],
  ['leadership', 'team leadership', 'supervisory skills'],
  ['time management', 'punctuality', 'scheduling'],
  ['problem solving', 'troubleshooting', 'analytical skills'],
  ['customer service', 'client service', 'customer relations', 'customer care'],
  ['attention to detail', 'detail oriented', 'accuracy', 'precision'],
  ['analytical thinking', 'analytical skills', 'critical thinking'],
  ['first aid', 'basic first aid', 'emergency first aid', 'occupational first aid'],
  ['security guard', 'security service', 'security officer'],
  ['occupational safety', 'workplace safety', 'ohs', 'safety compliance'],
  ['scaffolding', 'scaffold erection', 'scaffold installation'],
  ['heavy equipment operation', 'heavy equipment operator', 'backhoe operator'],
]

export const SKILL_SYNONYMS = new Map()
for (const group of SKILL_SYNONYM_GROUPS) {
  const lower = group.map((skill) => skill.toLowerCase())
  for (const term of lower) {
    const existing = SKILL_SYNONYMS.get(term) || new Set()
    for (const other of lower) {
      if (other !== term) existing.add(other)
    }
    SKILL_SYNONYMS.set(term, existing)
  }
}

export const SKILL_HIERARCHY = {
  'communication skills': ['customer service', 'active listening', 'public speaking', 'interpersonal skills', 'verbal communication'],
  'basic computer skills': ['ms office', 'typing skills', 'data entry', 'email management', 'computer literacy'],
  'electrical work': ['electrical installation', 'wiring', 'electrical troubleshooting', 'electrical repair', 'electrical maintenance'],
  'food preparation': ['cooking', 'baking', 'food safety', 'kitchen management', 'food handling'],
  'vehicle operation': ['driving', 'motorcycle operation', 'forklift operation', 'heavy equipment operation'],
  construction: ['masonry', 'carpentry', 'painting', 'scaffolding', 'roofing', 'tile setting'],
  welding: ['arc welding', 'mig welding', 'tig welding', 'smaw', 'metal fabrication'],
  'customer service': ['cashiering', 'sales', 'complaint handling', 'client service'],
  'farm equipment operation': ['tractor operation', 'harvesting equipment', 'irrigation systems'],
  plumbing: ['pipe fitting', 'pipe installation', 'drain cleaning', 'pipe laying'],
  'mechanical work': ['auto mechanic', 'motorcycle repair', 'engine repair', 'machine operation'],
  'food service': ['cooking', 'baking', 'bartending', 'barista', 'waitstaff'],
  'building maintenance': ['painting', 'plumbing', 'electrical repair', 'carpentry', 'aircon repair'],
  'office administration': ['data entry', 'typing skills', 'filing', 'bookkeeping', 'ms office'],
  'personal care services': ['hairdressing', 'manicure', 'massage therapy', 'skin care'],
  'security services': ['security guard', 'cctv monitoring', 'access control', 'patrol'],
  'agricultural work': ['farming', 'gardening', 'animal husbandry', 'fish culture', 'tractor operation'],
}

export const ADJACENT_CATEGORIES = {
  agriculture: ['trades', 'energy'],
  energy: ['trades', 'agriculture'],
  retail: ['hospitality', 'it'],
  it: ['retail', 'energy'],
  trades: ['construction', 'energy', 'agriculture'],
  hospitality: ['retail'],
  construction: ['trades', 'energy'],
}

const SOFT_SKILL_INFERENCE_RULES = [
  {
    requirementPatterns: [/\battention to detail\b/i, /\bdetail[- ]oriented\b/i, /\baccuracy\b/i, /\bprecision\b/i],
    triggerPatterns: [/\bprogramming\b/i, /\bcoding\b/i, /\bsoftware\b/i, /\bweb development\b/i, /\bfrontend\b/i, /\bbackend\b/i, /\bfull stack\b/i, /\bgraphic design\b/i, /\bvisual design\b/i, /\bui\b/i, /\bux\b/i, /\badobe photoshop\b/i, /\badobe illustrator\b/i],
    inferredSkill: 'Attention to Detail',
    recruiterReason: 'Their programming or design background signals strong accuracy, version control, and precision in execution.',
  },
  {
    requirementPatterns: [/\banalytical thinking\b/i, /\banalytical skills\b/i, /\bcritical thinking\b/i],
    triggerPatterns: [/\bprogramming\b/i, /\bcoding\b/i, /\bsoftware\b/i, /\bdebugging\b/i, /\bweb development\b/i, /\bfrontend\b/i, /\bbackend\b/i, /\bfull stack\b/i, /\bgraphic design\b/i, /\bvisual design\b/i, /\bui\b/i, /\bux\b/i],
    inferredSkill: 'Analytical Thinking',
    recruiterReason: 'Their technical and design workflow already relies on structured analysis, iteration, and problem solving.',
  },
]

const BASELINE_REQUIREMENT_PATTERNS = [/\btyping\b/i, /\btyping speed\b/i, /\bdata entry\b/i, /\bdata encoding\b/i, /\bbasic computer\b/i, /\bcomputer literacy\b/i, /\bms office\b/i, /\bmicrosoft office\b/i, /\bhigh school\b/i, /\bsenior high\b/i]
const LOW_TIER_ROLE_PATTERNS = [/\bdata entry\b/i, /\bdata encoder\b/i, /\bencoder\b/i, /\badmin assistant\b/i, /\badministrative assistant\b/i, /\bclerical\b/i, /\boffice assistant\b/i, /\bback office\b/i, /\bdocumentation\b/i]
const OVERQUALIFICATION_TRANSFER_PATTERNS = [/\btyping\b/i, /\btyping speed\b/i, /\bdata entry\b/i, /\bdata encoding\b/i, /\battention to detail\b/i, /\banalytical thinking\b/i, /\banalytical skills\b/i, /\baccuracy\b/i, /\bprecision\b/i, /\bcomputer literacy\b/i, /\bbasic computer\b/i, /\bms office\b/i, /\bmicrosoft office\b/i]
const HIGH_TIER_SKILL_PATTERNS = [/\bprogramming\b/i, /\bcoding\b/i, /\bsoftware\b/i, /\bweb development\b/i, /\bfrontend\b/i, /\bbackend\b/i, /\bfull stack\b/i, /\bgraphic design\b/i, /\bvisual design\b/i, /\bui\b/i, /\bux\b/i, /\bphotoshop\b/i, /\billustrator\b/i, /\bfigma\b/i]

const OVERQUALIFICATION_MESSAGE = 'Technical background exceeds the role\'s detail requirements and signals high accuracy for precision-based tasks.'

const EDUCATION_KEYWORDS = /\b(graduate|undergraduate|degree|diploma|elementary|high\s*school|senior\s*high|vocational|college|master|doctoral|phd|bachelor)\b/i
const LANGUAGE_NAMES = /\b(english|filipino|tagalog|cebuano|bisaya|ilokano|ilocano|hiligaynon|waray|kapampangan|pangasinan|bikolano|maranao|mandarin|chinese|japanese|korean|spanish|arabic|french|german|malay|bahasa)\b/i
const LANGUAGE_KEYWORDS = /\b(speak|fluent|proficien|communicat|literate|language)/i
const PROFICIENCY_ORDINAL = { Basic: 1, Conversational: 2, Fluent: 3, Native: 4 }
const AGE_REQUIREMENT_PATTERN = /\b(?:at least\s*)?(\d{1,2})\s*(?:years?\s*old|yrs?\s*old|y\/o)?\s*(?:and above|above|or older|old and above|up)\b/i
const AGE_RANGE_REQUIREMENT_PATTERN = /\b(\d{1,2})\s*(?:to|-)\s*(\d{1,2})\s*(?:years?\s*old)?\b/i

const requirementMatchesAnyPattern = (requirement, patterns = []) =>
  patterns.some((pattern) => pattern.test(requirement))

const normalizeCategoryKey = (value = '') => value.toLowerCase()
  .replace('energy & utilities', 'energy')
  .replace('retail & service', 'retail')
  .replace('information technology', 'it')
  .replace('skilled trades', 'trades')
  .replace('hospitality', 'hospitality')
  .trim()

const toSkillList = (userData = {}) => deduplicateSkills(
  [...(userData.predefined_skills || []), ...(userData.skills || [])]
    .map((skill) => typeof skill === 'string' ? skill : skill?.name)
    .filter(Boolean),
)

const getSkillSignals = (skills, aliases = {}) => {
  const signals = new Set()
  for (const skill of skills) {
    signals.add(skill.toLowerCase())
    for (const alias of aliases[skill] || []) {
      signals.add(String(alias).toLowerCase())
    }
  }
  return Array.from(signals)
}

const candidateHasPatternMatch = (patterns, skillSignals = []) =>
  patterns.some((pattern) => skillSignals.some((signal) => pattern.test(signal)))

export const isEducationRequirement = (req) => EDUCATION_KEYWORDS.test(req)

export const educationSatisfied = (req, userEducation) => {
  const reqOrdinal = USER_EDUCATION_ORDINAL[parseEducationRequirementLevel(req)] ?? -1
  const userOrdinal = getUserEducationOrdinal(
    typeof userEducation === 'object' && userEducation !== null
      ? userEducation
      : { highest_education: userEducation },
  )
  return reqOrdinal >= 0 && userOrdinal >= reqOrdinal
}

export const isLanguageRequirement = (req) => LANGUAGE_NAMES.test(req) && (LANGUAGE_KEYWORDS.test(req) || /^\s*(english|filipino|tagalog)\s*$/i.test(req))

export const languageSatisfied = (req, userLanguages) => {
  if (!Array.isArray(userLanguages) || userLanguages.length === 0) return false
  const reqLower = req.toLowerCase()
  for (const lang of userLanguages) {
    const name = (lang.language || '').toLowerCase()
    if (name && reqLower.includes(name)) {
      const reqProficiency = /\b(fluent|native)\b/i.test(req) ? 3
        : /\b(proficien|good|strong)\b/i.test(req) ? 2
        : 1
      const userProficiency = PROFICIENCY_ORDINAL[lang.proficiency] ?? 2
      if (userProficiency >= reqProficiency) return true
    }
  }
  return false
}

export const isAgeRequirement = (req = '') =>
  AGE_REQUIREMENT_PATTERN.test(req) ||
  AGE_RANGE_REQUIREMENT_PATTERN.test(req) ||
  /\b\d{1,2}\s*(?:years?\s*old|yrs?\s*old)\b/i.test(req)

export const getUserAge = (userData = {}) => {
  const rawDate = userData.date_of_birth || userData.birthdate || userData.birthday || null
  if (!rawDate) return null

  const birthDate = new Date(rawDate)
  if (Number.isNaN(birthDate.getTime())) return null

  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1
  }
  return age >= 0 ? age : null
}

export const ageSatisfied = (req, userData = {}) => {
  const age = getUserAge(userData)
  if (age === null) return false

  const minimumMatch = req.match(AGE_REQUIREMENT_PATTERN)
  if (minimumMatch) {
    return age >= Number(minimumMatch[1])
  }

  const rangeMatch = req.match(AGE_RANGE_REQUIREMENT_PATTERN)
  if (rangeMatch) {
    const minAge = Number(rangeMatch[1])
    const maxAge = Number(rangeMatch[2])
    return age >= minAge && age <= maxAge
  }

  const exactMatch = req.match(/\b(\d{1,2})\s*(?:years?\s*old|yrs?\s*old)\b/i)
  if (exactMatch) {
    return age >= Number(exactMatch[1])
  }

  return false
}

export const skillMatches = (a, b) => {
  const la = String(a || '').toLowerCase().trim()
  const lb = String(b || '').toLowerCase().trim()
  if (la === lb) return true
  if (la.length < 3 || lb.length < 3) return false
  const [shorter, longer] = la.length <= lb.length ? [la, lb] : [lb, la]
  const regex = new RegExp(`\\b${shorter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
  return regex.test(longer)
}

export const synonymMatches = (a, b) => {
  const la = String(a || '').toLowerCase().trim()
  const lb = String(b || '').toLowerCase().trim()
  if (la === lb) return true
  const synsA = SKILL_SYNONYMS.get(la)
  if (synsA && synsA.has(lb)) return true
  const synsB = SKILL_SYNONYMS.get(lb)
  if (synsA) {
    for (const syn of synsA) {
      if (skillMatches(syn, lb)) return true
    }
  }
  if (synsB) {
    for (const syn of synsB) {
      if (skillMatches(syn, la)) return true
    }
  }
  return false
}

export const hierarchyCoversRequirement = (requirement, userSkills, aliases) => {
  const reqLower = requirement.toLowerCase().trim()
  const children = SKILL_HIERARCHY[reqLower]
  if (!children) return false
  for (const child of children) {
    for (const userSkill of userSkills) {
      if (skillMatches(child, userSkill)) return true
      if (synonymMatches(child, userSkill)) return true
      const userAliases = aliases[userSkill] || []
      for (const alias of userAliases) {
        if (skillMatches(child, alias)) return true
        if (synonymMatches(child, alias)) return true
      }
    }
  }
  return false
}

const QUANTIFIED_REQUIREMENT_PATTERNS = [
  {
    regex: /\btyping\s+(?:speed\s*)?\d+\+?\s*wpm\b/i,
    baseTerms: ['typing', 'typing skills', 'typing skill', 'keyboarding', 'data entry', 'data encoding'],
    credit: 0.7,
  },
]

const quantifiedRequirementMatch = (requirement, skills, aliases) => {
  const pattern = QUANTIFIED_REQUIREMENT_PATTERNS.find(({ regex }) => regex.test(requirement))
  if (!pattern) return null

  const matched = skills.some((skill) =>
    pattern.baseTerms.some((term) => skillMatches(term, skill) || synonymMatches(term, skill)),
  ) || pattern.baseTerms.some((term) => hierarchyCoversRequirement(term, skills, aliases))

  if (!matched) return null

  return { matched: true, credit: pattern.credit }
}

const isBaselineRequirement = (requirement) =>
  requirementMatchesAnyPattern(requirement, BASELINE_REQUIREMENT_PATTERNS)

const isLowTierRole = (job = {}, requirements = []) => {
  const signals = [job.title || '', job.category || '', job.description || '', ...requirements]
  return signals.some((signal) => LOW_TIER_ROLE_PATTERNS.some((pattern) => pattern.test(signal)))
}

const inferSoftSkillMatch = (requirement, skillSignals = []) => {
  for (const rule of SOFT_SKILL_INFERENCE_RULES) {
    if (!requirementMatchesAnyPattern(requirement, rule.requirementPatterns)) continue
    if (candidateHasPatternMatch(rule.triggerPatterns, skillSignals)) {
      return {
        inferredSkill: rule.inferredSkill,
        recruiterReason: rule.recruiterReason,
        credit: 1,
      }
    }
  }
  return null
}

const buildRebrandingSuggestions = ({ job, profileSkills, missingSkills, inferredSoftSkills, overqualificationSignal }) => {
  const suggestions = []
  const lowerSkills = profileSkills.map((skill) => skill.toLowerCase())

  if (overqualificationSignal) {
    suggestions.push(`Frame your technical background as proof of precision, structured execution, and dependable accuracy for ${job.title || 'this role'}.`)
  }

  if (missingSkills.some((req) => /\bdata entry|data encoding|encoder\b/i.test(req)) && lowerSkills.some((skill) => /\bprogramming|coding|software|graphic design|ui|ux\b/i.test(skill))) {
    suggestions.push('Translate your project work into record accuracy, file discipline, and careful data handling instead of presenting it only as advanced technical work.')
  }

  if (missingSkills.some((req) => /\btyping|typing speed\b/i.test(req)) && lowerSkills.some((skill) => /\bprogramming|coding|software|graphic design\b/i.test(skill))) {
    suggestions.push('Position your day-to-day keyboard work as sustained high-volume input with strong accuracy, version control, and quality checks.')
  }

  if (missingSkills.some((req) => /\bcustomer service|communication\b/i.test(req)) && lowerSkills.some((skill) => /\bgraphic design|programming|software|project\b/i.test(skill))) {
    suggestions.push('Describe client revisions, requirement gathering, and feedback loops as customer-facing communication experience for this position.')
  }

  for (const inferred of inferredSoftSkills) {
    if (inferred.inferredSkill === 'Attention to Detail') {
      suggestions.push('Lead with examples of QA checks, debugging, proofreading, or file-accuracy work to make your attention to detail visible to employers.')
    }
    if (inferred.inferredSkill === 'Analytical Thinking') {
      suggestions.push('Present your troubleshooting or design-decision process as analytical thinking that helps you solve issues quickly on the job.')
    }
  }

  const unique = []
  const seen = new Set()
  for (const suggestion of suggestions) {
    const key = suggestion.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(suggestion)
  }
  return unique.slice(0, 4)
}

const computeBucketScore = (earned, possible) => {
  if (possible <= 0) return 0
  return Math.round((earned / possible) * 100)
}

const computeWeightedScore = (components) => {
  const active = components.filter((component) => component.active !== false)
  const totalWeight = active.reduce((sum, component) => sum + component.weight, 0)
  if (totalWeight <= 0) return 0

  return Math.round(
    active.reduce((sum, component) => sum + component.score * (component.weight / totalWeight), 0),
  )
}

export const classifyRequirements = (requirements, skills, aliases, userData, job = {}) => {
  const matchingSkills = []
  const missingSkills = []
  const inferredSoftSkills = []
  const candidateSignals = []

  let technicalEarned = 0
  let technicalPossible = 0
  let inferredEarned = 0
  let inferredPossible = 0
  let baselineEarned = 0
  let baselinePossible = 0
  let languageEarned = 0
  let languagePossible = 0

  const safeAliases = aliases || {}
  const skillSignals = getSkillSignals(skills, safeAliases)
  const highTierCandidate = candidateHasPatternMatch(HIGH_TIER_SKILL_PATTERNS, skillSignals)
  const highPrecisionCandidate = highTierCandidate && isLowTierRole(job, requirements)

  if (highPrecisionCandidate) {
    candidateSignals.push({
      type: 'High-Precision Candidate',
      detail: OVERQUALIFICATION_MESSAGE,
    })
  }

  for (const req of requirements) {
    if (isAgeRequirement(req)) {
      baselinePossible += 1
      if (ageSatisfied(req, userData)) {
        matchingSkills.push(req)
        baselineEarned += 1
      } else {
        missingSkills.push(req)
      }
      continue
    }

    if (isEducationRequirement(req)) {
      baselinePossible += 1
      if (educationSatisfied(req, userData)) {
        matchingSkills.push(req)
        baselineEarned += 1
      } else {
        missingSkills.push(req)
      }
      continue
    }

    if (isLanguageRequirement(req)) {
      languagePossible += 1
      if (languageSatisfied(req, userData.languages)) {
        matchingSkills.push(req)
        languageEarned += 1
      } else {
        missingSkills.push(req)
      }
      continue
    }

    const inferredMatch = inferSoftSkillMatch(req, skillSignals)
    if (inferredMatch) {
      inferredPossible += 1
      inferredEarned += inferredMatch.credit
      matchingSkills.push(req)
      inferredSoftSkills.push({
        requirement: req,
        inferredSkill: inferredMatch.inferredSkill,
        recruiterReason: inferredMatch.recruiterReason,
      })
      continue
    }

    const bucket = isBaselineRequirement(req) ? 'baseline' : 'technical'
    if (bucket === 'baseline') baselinePossible += 1
    else technicalPossible += 1

    const quantifiedMatch = quantifiedRequirementMatch(req, skills, safeAliases)
    if (quantifiedMatch?.matched) {
      matchingSkills.push(req)
      if (bucket === 'baseline') baselineEarned += quantifiedMatch.credit
      else technicalEarned += quantifiedMatch.credit
      continue
    }

    let matched = false
    let requirementCredit = 0
    for (const skill of skills) {
      if (skillMatches(req, skill)) { matched = true; requirementCredit = 1; break }
    }
    if (!matched) {
      for (const skill of skills) {
        if (synonymMatches(req, skill)) { matched = true; requirementCredit = 1; break }
      }
    }
    if (!matched) {
      for (const skill of skills) {
        const skillAliases = safeAliases[skill] || []
        for (const alias of skillAliases) {
          if (skillMatches(req, alias)) { matched = true; requirementCredit = 1; break }
          if (synonymMatches(req, alias)) { matched = true; requirementCredit = 1; break }
        }
        if (matched) break
      }
    }
    if (!matched) {
      matched = hierarchyCoversRequirement(req, skills, safeAliases)
      if (matched) requirementCredit = 1
    }

    if (!matched && highPrecisionCandidate && requirementMatchesAnyPattern(req, OVERQUALIFICATION_TRANSFER_PATTERNS)) {
      matched = true
      requirementCredit = 0.6
    }

    if (matched) {
      matchingSkills.push(req)
      if (bucket === 'baseline') baselineEarned += requirementCredit || 1
      else technicalEarned += requirementCredit || 1
    } else {
      missingSkills.push(req)
    }
  }

  return {
    matchingSkills,
    missingSkills,
    inferredSoftSkills,
    candidateSignals,
    technicalRequirementScore: computeBucketScore(technicalEarned, technicalPossible),
    inferredSoftSkillScore: computeBucketScore(inferredEarned, inferredPossible),
    baselineRequirementScore: computeBucketScore(baselineEarned, baselinePossible),
    languageRequirementScore: computeBucketScore(languageEarned, languagePossible),
    languageRequirementApplicable: languagePossible > 0,
    inferredSoftSkillApplicable: inferredPossible > 0,
    skillScore: requirements.length > 0
      ? Math.round(((technicalEarned + inferredEarned + baselineEarned) / requirements.length) * 100)
      : 100,
    overqualificationSignal: highPrecisionCandidate
      ? { title: 'High-Precision Candidate', detail: OVERQUALIFICATION_MESSAGE }
      : null,
  }
}

export const computeExperienceScore = (job, userData) => {
  const userCategories = (userData.experience_categories || []).map((category) => normalizeCategoryKey(category))
  const jobCategory = normalizeCategoryKey(job.category || '')

  let experienceScore = 100
  if (jobCategory) {
    if (userCategories.includes(jobCategory)) {
      experienceScore = 100
    } else {
      const adjacent = ADJACENT_CATEGORIES[jobCategory] || []
      const hasAdjacent = userCategories.some((category) => adjacent.includes(category))
      experienceScore = hasAdjacent ? 50 : 20
    }
  }

  const jobExpLevel = (job.experience_level || '').toLowerCase()
  if (jobExpLevel && userData.work_experiences?.length > 0) {
    const totalYears = userData.work_experiences.reduce((sum, experience) => {
      const duration = (experience.duration || experience.years || '').toString().toLowerCase()
      const yearMatch = duration.match(/(\d+)\s*(?:year|yr|y)/i)
      const monthMatch = duration.match(/(\d+)\s*(?:month|mo|m)/i)
      return sum + (yearMatch ? parseInt(yearMatch[1]) : 0) + (monthMatch ? parseInt(monthMatch[1]) / 12 : 0)
    }, 0)

    const requiredYears = jobExpLevel === 'entry' ? 0
      : jobExpLevel === 'mid' ? 2
      : jobExpLevel === 'senior' ? 5
      : 0

    if (requiredYears > 0 && totalYears > 0) {
      const yearRatio = Math.min(1, totalYears / requiredYears)
      experienceScore = Math.round(experienceScore * 0.6 + yearRatio * 100 * 0.4)
    }
  }

  return experienceScore
}

export const computeEducationScore = (job, userData) => {
  const jobOrdinal = getJobEducationOrdinal(job.education_level)
  const userOrdinal = getUserEducationOrdinal(userData)
  let educationScore = 100
  if (jobOrdinal >= 0) {
    const diff = jobOrdinal - userOrdinal
    if (diff <= 0) educationScore = 100
    else if (diff <= 0.5) educationScore = 80
    else if (diff <= 1) educationScore = 60
    else if (diff <= 2) educationScore = 35
    else educationScore = 15
  }
  return educationScore
}

export const getMatchLevel = (score) => {
  if (score >= 80) return 'Excellent'
  if (score >= 60) return 'Good'
  if (score >= 40) return 'Fair'
  return 'Low'
}

export const calculateDeterministicScore = (job, userData) => {
  const skills = toSkillList(userData)
  const aliases = userData.skill_aliases || {}
  const requirements = (job.requirements || job.required_skills || []).filter(Boolean)

  const classified = classifyRequirements(requirements, skills, aliases, userData, job)
  const experienceScore = computeExperienceScore(job, userData)
  const educationScore = computeEducationScore(job, userData)
  const technicalCompetencyScore = classified.technicalRequirementScore > 0
    ? Math.round(classified.technicalRequirementScore * 0.75 + experienceScore * 0.25)
    : classified.overqualificationSignal
      ? 95
      : experienceScore
  const baselineScore = Math.round(classified.baselineRequirementScore * 0.5 + educationScore * 0.5)
  const matchScore = computeWeightedScore([
    { score: technicalCompetencyScore, weight: 0.5, active: true },
    { score: classified.inferredSoftSkillScore, weight: 0.2, active: classified.inferredSoftSkillApplicable },
    { score: baselineScore, weight: 0.3, active: true },
    { score: classified.languageRequirementScore, weight: 0.1, active: classified.languageRequirementApplicable },
  ])

  return {
    matchScore,
    matchLevel: getMatchLevel(matchScore),
    matchingSkills: classified.matchingSkills,
    missingSkills: classified.missingSkills,
    skillScore: classified.skillScore,
    experienceScore,
    educationScore,
    technicalCompetencyScore,
    inferredSoftSkillScore: classified.inferredSoftSkillScore,
    baselineRequirementScore: classified.baselineRequirementScore,
    baselineScore,
    technicalRequirementScore: classified.technicalRequirementScore,
    inferredSoftSkills: classified.inferredSoftSkills,
    candidateSignals: classified.candidateSignals,
    overqualificationSignal: classified.overqualificationSignal,
    rebrandingSuggestions: buildRebrandingSuggestions({
      job,
      profileSkills: skills,
      missingSkills: classified.missingSkills,
      inferredSoftSkills: classified.inferredSoftSkills,
      overqualificationSignal: classified.overqualificationSignal,
    }),
  }
}
