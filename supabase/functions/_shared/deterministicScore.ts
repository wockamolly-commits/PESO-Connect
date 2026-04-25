// Deterministic scoring logic shared by frontend and edge functions.

export const normalizeSkillName = (name) => {
  if (!name || typeof name !== 'string') return ''
  const canonicalKey = normalizeSkillKey(name)
  return CANONICAL_SKILL_LABELS.get(canonicalKey) || canonicalKey
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export const deduplicateSkills = (skills) => {
  const seen = new Set()
  return skills.filter((skill) => {
    const key = normalizeSkillKey(skill)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const MATCH_CREDITS = {
  exact: 1,
  partial: 0.8,
  related: 0.6,
  quantified: 0.7,
  inferred: 0.6,
  overqualified: 0.6,
}

const MATCH_STATUS = {
  exact: 'match',
  partial: 'partial',
  related: 'partial',
  gap: 'gap',
}

const SKILL_NOISE_PREFIXES = [
  /^(?:knowledge|experience|experienced|expertise|proficiency|proficient|familiarity|familiar|background|skilled)\s+(?:in|with|on|using|of)\s+/i,
  /^(?:can|ability to|able to)\s+/i,
]

const SKILL_TOKEN_STOP_WORDS = new Set([
  'a', 'an', 'and', 'as', 'for', 'in', 'of', 'on', 'the', 'to', 'with', 'using',
])

const normalizeRawSkillKey = (value) => {
  let normalized = String(value || '')
    .toLowerCase()
    .replace(/[()]/g, ' ')
    .replace(/[+]/g, ' plus ')
    .replace(/[&/]/g, ' ')
    .replace(/[-_]/g, ' ')
    .replace(/[.,:;]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  for (const pattern of SKILL_NOISE_PREFIXES) {
    normalized = normalized.replace(pattern, '').trim()
  }

  normalized = normalized
    .replace(/\bskills?\b$/i, '')
    .replace(/\bexperience\b$/i, '')
    .replace(/\bknowledge\b$/i, '')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized
}

const EXACT_SKILL_VARIANT_GROUPS = [
  ['Excel', ['excel', 'ms excel', 'microsoft excel']],
  ['Microsoft Office', ['microsoft office', 'ms office', 'microsoft office suite', 'office suite']],
  ['Microsoft Word', ['microsoft word', 'ms word']],
  ['Customer Service', ['customer service', 'customer relations', 'customer care', 'client service']],
  ['Data Entry', ['data entry', 'data encoding', 'encoding']],
  ['Typing', ['typing', 'typing skills', 'keyboarding']],
  ['Computer Literacy', ['computer literacy', 'basic computer skills', 'computer operation']],
  ['AutoCAD', ['autocad', 'auto cad', 'autocad drafting']],
  ['Electrical Wiring', ['electrical wiring', 'electrical installation', 'wiring']],
  ['Forklift Operation', ['forklift operation', 'forklift driving', 'forklift operator']],
  ['Administrative Support', ['administrative support', 'admin support', 'administrative assistance']],
  ['Reception', ['reception', 'front desk reception']],
  ['Caregiving', ['caregiving', 'care giver']],
]

const CANONICAL_SKILL_LOOKUP = new Map()
export const CANONICAL_SKILL_LABELS = new Map()

for (const [canonicalLabel, variants] of EXACT_SKILL_VARIANT_GROUPS) {
  const canonicalKey = normalizeRawSkillKey(canonicalLabel)
  CANONICAL_SKILL_LABELS.set(canonicalKey, canonicalLabel)
  for (const variant of variants) {
    CANONICAL_SKILL_LOOKUP.set(normalizeRawSkillKey(variant), canonicalKey)
  }
}

export const normalizeSkillKey = (value) => {
  const rawKey = normalizeRawSkillKey(value)
  return CANONICAL_SKILL_LOOKUP.get(rawKey) || rawKey
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
  ['administrative support', 'office administration', 'clerical work', 'administrative assistant'],
  ['filing', 'records management', 'document control'],
  ['reception', 'front desk', 'guest reception'],
  ['calendar management', 'scheduling', 'appointment setting'],
  ['email management', 'email correspondence', 'business correspondence'],
  ['inventory management', 'stock replenishment', 'stock handling'],
  ['retail sales', 'sales floor assistance', 'upselling'],
  ['cashiering', 'point of sale', 'pos', 'cash handling'],
  ['housekeeping', 'room cleaning', 'sanitation'],
  ['food preparation', 'kitchen prep', 'meal preparation'],
  ['guest service', 'guest relations', 'hotel service'],
  ['delivery driving', 'delivery', 'route driving', 'courier'],
  ['route planning', 'delivery scheduling', 'trip planning'],
  ['caregiving', 'elderly care', 'home care assistance'],
  ['child care', 'babysitting', 'child supervision'],
  ['patient care', 'basic patient support', 'nursing assistance'],
  ['technical support', 'it support', 'computer troubleshooting'],
  ['adobe photoshop', 'photoshop', 'image editing'],
  ['adobe illustrator', 'illustrator', 'vector design'],
  ['ui design', 'user interface design'],
  ['ux design', 'user experience design'],
]

export const SKILL_SYNONYMS = new Map()
for (const group of SKILL_SYNONYM_GROUPS) {
  const normalizedGroup = [...new Set(group.map((skill) => normalizeSkillKey(skill)).filter(Boolean))]
  for (const term of normalizedGroup) {
    const existing = SKILL_SYNONYMS.get(term) || new Set()
    for (const other of normalizedGroup) {
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
  'administrative support': ['data entry', 'typing', 'filing', 'calendar management', 'email management', 'reception'],
  'retail operations': ['cashiering', 'retail sales', 'inventory management', 'merchandising', 'customer service'],
  'hospitality operations': ['housekeeping', 'food preparation', 'guest service', 'bartending', 'barista'],
  'transport services': ['driving', 'delivery driving', 'route planning', 'forklift operation'],
  'care support': ['caregiving', 'patient care', 'child care', 'first aid'],
  'entry level it support': ['technical support', 'computer literacy', 'data entry', 'ms office'],
  'design tools': ['graphic design', 'adobe photoshop', 'adobe illustrator', 'autocad'],
  'problem solving': [
    'troubleshooting',
    'hardware troubleshooting',
    'computer troubleshooting',
    'technical support',
    'diagnostic testing',
    'root cause analysis',
  ],
}

export const SKILL_SEMANTIC_FAMILIES = {
  troubleshooting: [
    'problem solving',
    'troubleshooting',
    'hardware troubleshooting',
    'computer troubleshooting',
    'electrical troubleshooting',
    'technical support',
    'diagnostic testing',
    'root cause analysis',
  ],
  office_operations: [
    'administrative support',
    'office administration',
    'data entry',
    'filing',
    'calendar management',
    'email management',
    'reception',
  ],
  care_support: [
    'caregiving',
    'patient care',
    'child care',
    'first aid',
  ],
}

const SEMANTIC_SKILL_TO_FAMILIES = new Map()
for (const [family, skills] of Object.entries(SKILL_SEMANTIC_FAMILIES)) {
  const normalizedFamily = normalizeSkillKey(family)
  for (const skill of skills) {
    const key = normalizeSkillKey(skill)
    if (!key) continue
    const existing = SEMANTIC_SKILL_TO_FAMILIES.get(key) || new Set()
    existing.add(normalizedFamily)
    SEMANTIC_SKILL_TO_FAMILIES.set(key, existing)
  }
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

const BASELINE_REQUIREMENT_PATTERNS = [/\btyping\b/i, /\btyping speed\b/i, /\bdata entry\b/i, /\bdata encoding\b/i, /\bbasic computer\b/i, /\bcomputer literacy\b/i, /\bms office\b/i, /\bmicrosoft office\b/i, /\bhigh school\b/i, /\bsenior high\b/i]
const LOW_TIER_ROLE_PATTERNS = [/\bdata entry\b/i, /\bdata encoder\b/i, /\bencoder\b/i, /\badmin assistant\b/i, /\badministrative assistant\b/i, /\bclerical\b/i, /\boffice assistant\b/i, /\bback office\b/i, /\bdocumentation\b/i]
const OVERQUALIFICATION_TRANSFER_PATTERNS = [/\btyping\b/i, /\btyping speed\b/i, /\bdata entry\b/i, /\bdata encoding\b/i, /\battention to detail\b/i, /\banalytical thinking\b/i, /\banalytical skills\b/i, /\baccuracy\b/i, /\bprecision\b/i, /\bcomputer literacy\b/i, /\bbasic computer\b/i, /\bms office\b/i, /\bmicrosoft office\b/i]
export const HIGH_TIER_SKILL_PATTERNS = [/\bprogramming\b/i, /\bcoding\b/i, /\bsoftware\b/i, /\bweb development\b/i, /\bfrontend\b/i, /\bbackend\b/i, /\bfull stack\b/i, /\bgraphic design\b/i, /\bvisual design\b/i, /\bui\b/i, /\bux\b/i, /\bphotoshop\b/i, /\billustrator\b/i, /\bfigma\b/i]

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
    signals.add(normalizeRawSkillKey(skill))
    for (const alias of aliases[skill] || []) {
      signals.add(normalizeRawSkillKey(alias))
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

const buildWholePhraseRegex = (value) => new RegExp(`\\b${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')

const getMeaningfulTokens = (value) =>
  normalizeRawSkillKey(value)
    .split(' ')
    .filter((token) => token && !SKILL_TOKEN_STOP_WORDS.has(token))

const hasStrongPhraseOverlap = (a, b) => {
  const rawA = normalizeRawSkillKey(a)
  const rawB = normalizeRawSkillKey(b)
  if (!rawA || !rawB || rawA === rawB) return false

  const [shorter, longer] = rawA.length <= rawB.length ? [rawA, rawB] : [rawB, rawA]
  const shorterTokens = getMeaningfulTokens(shorter)
  const longerTokens = new Set(getMeaningfulTokens(longer))

  if (shorterTokens.length >= 2 && buildWholePhraseRegex(shorter).test(longer)) return true

  const sharedCount = shorterTokens.filter((token) => longerTokens.has(token)).length
  return shorterTokens.length >= 2 && sharedCount >= Math.max(2, Math.ceil(shorterTokens.length * 0.75))
}

export const skillMatches = (a, b) => {
  const keyA = normalizeSkillKey(a)
  const keyB = normalizeSkillKey(b)
  if (!keyA || !keyB) return false
  if (keyA === keyB) return true
  return hasStrongPhraseOverlap(a, b)
}

export const synonymMatches = (a, b) => {
  const keyA = normalizeSkillKey(a)
  const keyB = normalizeSkillKey(b)
  if (!keyA || !keyB || keyA === keyB) return false
  const synsA = SKILL_SYNONYMS.get(keyA)
  return Boolean(synsA && synsA.has(keyB))
}

export const hierarchyCoversRequirement = (requirement, userSkills, aliases) => {
  const reqKey = normalizeSkillKey(requirement)
  const children = SKILL_HIERARCHY[reqKey]
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

export const semanticFamilyMatches = (requirement, skill, aliases = {}) => {
  const requirementFamilies = SEMANTIC_SKILL_TO_FAMILIES.get(normalizeSkillKey(requirement)) || new Set()
  const candidateKeys = [
    normalizeSkillKey(skill),
    ...(aliases?.[skill] || []).map((alias) => normalizeSkillKey(alias)),
  ].filter(Boolean)

  return candidateKeys.some((key) => {
    const skillFamilies = SEMANTIC_SKILL_TO_FAMILIES.get(key) || new Set()
    return [...skillFamilies].some((family) => requirementFamilies.has(family))
  })
}

const buildAliasCandidates = (skills = [], aliases = {}) =>
  skills.flatMap((skill) =>
    (aliases[skill] || [])
      .map((alias) => ({
        source: 'alias',
        display: String(alias || '').trim(),
        key: normalizeSkillKey(alias),
        rawKey: normalizeRawSkillKey(alias),
        parentSkill: skill,
      }))
      .filter((candidate) => candidate.key),
  )

const buildSkillCandidates = (skills = [], aliases = {}) => {
  const seen = new Set()
  const candidates = [
    ...skills.map((skill) => ({
      source: 'skill',
      display: String(skill || '').trim(),
      key: normalizeSkillKey(skill),
      rawKey: normalizeRawSkillKey(skill),
      parentSkill: null,
    })),
    ...buildAliasCandidates(skills, aliases),
  ]

  return candidates.filter((candidate) => {
    const dedupeKey = `${candidate.source}:${candidate.parentSkill || ''}:${candidate.key}`
    if (!candidate.key || seen.has(dedupeKey)) return false
    seen.add(dedupeKey)
    return true
  })
}

const getMatchStatus = (matchType) => MATCH_STATUS[matchType] || MATCH_STATUS.gap

export const matchRequirementToSkillSet = (requirement, skills = [], aliases = {}) => {
  const requirementKey = normalizeSkillKey(requirement)
  const requirementRawKey = normalizeRawSkillKey(requirement)
  if (!requirementKey) {
    return { matched: false, matchType: 'gap', credit: 0, status: getMatchStatus('gap'), matchedSkill: null }
  }

  const candidates = buildSkillCandidates(skills, aliases)
  const directCandidates = candidates.filter((candidate) => candidate.source === 'skill')
  const aliasCandidates = candidates.filter((candidate) => candidate.source === 'alias')
  const findCandidate = (pool, predicate) => pool.find(predicate) || null

  const exactCandidate = findCandidate(
    directCandidates,
    (candidate) => candidate.key === requirementKey,
  )
  if (exactCandidate) {
    return {
      matched: true,
      matchType: 'exact',
      credit: MATCH_CREDITS.exact,
      status: getMatchStatus('exact'),
      matchedSkill: exactCandidate.display,
      matchedSkillKey: exactCandidate.key,
      reason: `Matched directly from ${exactCandidate.display}.`,
    }
  }

  const partialCandidate = findCandidate(
    directCandidates,
    (candidate) => hasStrongPhraseOverlap(requirementRawKey, candidate.rawKey),
  )
  if (partialCandidate) {
    return {
      matched: true,
      matchType: 'partial',
      credit: MATCH_CREDITS.partial,
      status: getMatchStatus('partial'),
      matchedSkill: partialCandidate.display,
      matchedSkillKey: partialCandidate.key,
      reason: `${partialCandidate.display} closely overlaps with ${requirement}.`,
    }
  }

  const aliasCandidate = findCandidate(
    aliasCandidates,
    (candidate) => candidate.key === requirementKey || hasStrongPhraseOverlap(requirementRawKey, candidate.rawKey),
  )
  if (aliasCandidate) {
    return {
      matched: true,
      matchType: 'partial',
      credit: MATCH_CREDITS.partial,
      status: getMatchStatus('partial'),
      matchedSkill: aliasCandidate.parentSkill || aliasCandidate.display,
      matchedSkillKey: aliasCandidate.key,
      reason: `${aliasCandidate.parentSkill || aliasCandidate.display} was matched through a normalized profile alias.`,
    }
  }

  const relatedCandidate = findCandidate(
    directCandidates,
    (candidate) => synonymMatches(requirementKey, candidate.key),
  ) || findCandidate(
    aliasCandidates,
    (candidate) => synonymMatches(requirementKey, candidate.key),
  )

  if (relatedCandidate) {
    return {
      matched: true,
      matchType: 'related',
      credit: MATCH_CREDITS.related,
      status: getMatchStatus('related'),
      matchedSkill: relatedCandidate.parentSkill || relatedCandidate.display,
      matchedSkillKey: relatedCandidate.key,
      reason: `${relatedCandidate.parentSkill || relatedCandidate.display} is treated as a closely related skill for ${requirement}.`,
    }
  }

  const semanticCandidate = findCandidate(
    directCandidates,
    (candidate) => semanticFamilyMatches(requirementKey, candidate.display, aliases),
  ) || findCandidate(
    aliasCandidates,
    (candidate) => semanticFamilyMatches(requirementKey, candidate.parentSkill || candidate.display, aliases),
  )

  if (semanticCandidate) {
    return {
      matched: true,
      matchType: 'related',
      credit: MATCH_CREDITS.related,
      status: getMatchStatus('related'),
      matchedSkill: semanticCandidate.parentSkill || semanticCandidate.display,
      matchedSkillKey: semanticCandidate.key,
      reason: `${semanticCandidate.parentSkill || semanticCandidate.display} supports the broader requirement ${requirement}.`,
    }
  }

  if (hierarchyCoversRequirement(requirementKey, skills, aliases)) {
    return {
      matched: true,
      matchType: 'related',
      credit: MATCH_CREDITS.related,
      status: getMatchStatus('related'),
      matchedSkill: null,
      matchedSkillKey: null,
      reason: `${requirement} is covered by a more specific skill family in the profile.`,
    }
  }

  return { matched: false, matchType: 'gap', credit: 0, status: getMatchStatus('gap'), matchedSkill: null, matchedSkillKey: null, reason: '' }
}

const QUANTIFIED_REQUIREMENT_PATTERNS = [
  {
    regex: /\btyping\s+(?:speed\s*)?\d+\+?\s*wpm\b/i,
    baseTerms: ['typing', 'typing skills', 'typing skill', 'keyboarding', 'data entry', 'data encoding'],
    credit: MATCH_CREDITS.quantified,
  },
]

const quantifiedRequirementMatch = (requirement, skills, aliases) => {
  const pattern = QUANTIFIED_REQUIREMENT_PATTERNS.find(({ regex }) => regex.test(requirement))
  if (!pattern) return null

  const matched = skills.some((skill) =>
    pattern.baseTerms.some((term) => skillMatches(term, skill) || synonymMatches(term, skill)),
  ) || pattern.baseTerms.some((term) => hierarchyCoversRequirement(term, skills, aliases))

  if (!matched) return null

  return { matched: true, credit: pattern.credit, matchType: 'partial', status: getMatchStatus('partial'), matchedSkill: null }
}

const isBaselineRequirement = (requirement) =>
  requirementMatchesAnyPattern(requirement, BASELINE_REQUIREMENT_PATTERNS)

const isLowTierRole = (job = {}, requirements = []) => {
  const signals = [job.title || '', job.category || '', job.description || '', ...requirements]
  return signals.some((signal) => LOW_TIER_ROLE_PATTERNS.some((pattern) => pattern.test(signal)))
}

const inferSoftSkillMatch = () => null

const buildRebrandingSuggestions = ({ job, profileSkills, missingSkills, inferredSoftSkills, overqualificationSignal }) => {
  return []
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
  const requirementMatches = []
  const skillBreakdown = []
  const evidence = []
  const gaps = []

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
      const matched = ageSatisfied(req, userData)
      if (matched) {
        matchingSkills.push(req)
        baselineEarned += 1
      } else {
        missingSkills.push(req)
      }
      const score = matched ? MATCH_CREDITS.exact : 0
      const status = matched ? getMatchStatus('exact') : getMatchStatus('gap')
      requirementMatches.push({ requirement: req, kind: 'age', bucket: 'baseline', matchType: matched ? 'exact' : 'gap', credit: score, status, matchedSkill: null, reason: matched ? 'Matched your age requirement.' : '' })
      continue
    }

    if (isEducationRequirement(req)) {
      baselinePossible += 1
      const matched = educationSatisfied(req, userData)
      if (matched) {
        matchingSkills.push(req)
        baselineEarned += 1
      } else {
        missingSkills.push(req)
      }
      const score = matched ? MATCH_CREDITS.exact : 0
      const status = matched ? getMatchStatus('exact') : getMatchStatus('gap')
      const reason = matched ? `Matched from your education level: ${deriveUserEducationLevel(userData) || req}.` : ''
      skillBreakdown.push({ label: req, tier: 'required', kind: 'education', score, status, matchType: matched ? 'exact' : 'gap', reason })
      requirementMatches.push({ requirement: req, kind: 'education', bucket: 'baseline', matchType: matched ? 'exact' : 'gap', credit: score, status, matchedSkill: null, reason })
      if (matched) evidence.push({ type: 'education_required_match', jobField: 'education', jobValue: req, candidateField: 'education', candidateValue: deriveUserEducationLevel(userData) || req, matchMode: status, score, reason })
      else gaps.push({ type: 'education_required_gap', jobField: 'education', jobValue: req })
      continue
    }

    if (isLanguageRequirement(req)) {
      languagePossible += 1
      const matched = languageSatisfied(req, userData.languages)
      if (matched) {
        matchingSkills.push(req)
        languageEarned += 1
      } else {
        missingSkills.push(req)
      }
      const score = matched ? MATCH_CREDITS.exact : 0
      const status = matched ? getMatchStatus('exact') : getMatchStatus('gap')
      const reason = matched ? `Matched from your listed language support for ${req}.` : ''
      skillBreakdown.push({ label: req, tier: 'required', kind: 'language', score, status, matchType: matched ? 'exact' : 'gap', reason })
      requirementMatches.push({ requirement: req, kind: 'language', bucket: 'language', matchType: matched ? 'exact' : 'gap', credit: score, status, matchedSkill: null, reason })
      if (matched) evidence.push({ type: 'language_required_match', jobField: 'language', jobValue: req, candidateField: 'language', candidateValue: req, matchMode: status, score, reason })
      else gaps.push({ type: 'language_required_gap', jobField: 'language', jobValue: req })
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
      const score = inferredMatch.credit
      const status = getMatchStatus('related')
      const reason = `Credited from ${inferredMatch.inferredSkill}: ${inferredMatch.recruiterReason}`
      requirementMatches.push({ requirement: req, kind: 'skill', bucket: 'technical', matchType: 'related', credit: score, status, matchedSkill: inferredMatch.inferredSkill, reason })
      skillBreakdown.push({ label: req, tier: 'required', kind: 'skill', score, status, matchType: 'related', matchedSkill: inferredMatch.inferredSkill, reason })
      evidence.push({ type: 'skill_required_inferred', jobField: 'skill', jobValue: req, candidateField: 'skill', candidateValue: inferredMatch.inferredSkill, matchMode: status, score, reason })
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
      const reason = `Matched from closely related typing or data-entry experience for ${req}.`
      requirementMatches.push({ requirement: req, kind: 'skill', bucket, matchType: quantifiedMatch.matchType, credit: quantifiedMatch.credit, status: quantifiedMatch.status, matchedSkill: quantifiedMatch.matchedSkill, reason })
      skillBreakdown.push({ label: req, tier: 'required', kind: 'skill', score: quantifiedMatch.credit, status: quantifiedMatch.status, matchType: quantifiedMatch.matchType, matchedSkill: quantifiedMatch.matchedSkill, reason })
      evidence.push({ type: 'skill_required_quantified', jobField: 'skill', jobValue: req, candidateField: 'skill', candidateValue: quantifiedMatch.matchedSkill || req, matchMode: quantifiedMatch.status, score: quantifiedMatch.credit, reason })
      continue
    }

    let matchResult = matchRequirementToSkillSet(req, skills, safeAliases)

    if (!matchResult.matched && highPrecisionCandidate && requirementMatchesAnyPattern(req, OVERQUALIFICATION_TRANSFER_PATTERNS)) {
      matchResult = {
        matched: true,
        matchType: 'related',
        credit: MATCH_CREDITS.overqualified,
        status: getMatchStatus('related'),
        matchedSkill: null,
        reason: 'Credited from higher-precision technical experience that transfers to this requirement.',
      }
    }

    requirementMatches.push({ requirement: req, kind: 'skill', bucket, matchType: matchResult.matchType, credit: matchResult.credit, status: matchResult.status, matchedSkill: matchResult.matchedSkill, reason: matchResult.reason || '' })
    skillBreakdown.push({ label: req, tier: 'required', kind: 'skill', score: matchResult.credit, status: matchResult.status, matchType: matchResult.matchType, matchedSkill: matchResult.matchedSkill, reason: matchResult.reason || '' })

    if (matchResult.matched) {
      matchingSkills.push(req)
      if (bucket === 'baseline') baselineEarned += matchResult.credit
      else technicalEarned += matchResult.credit
      evidence.push({ type: `skill_required_${matchResult.matchType}`, jobField: 'skill', jobValue: req, candidateField: 'skill', candidateValue: matchResult.matchedSkill || req, matchMode: matchResult.status, score: matchResult.credit, reason: matchResult.reason || '' })
    } else {
      missingSkills.push(req)
      gaps.push({ type: 'skill_required_gap', jobField: 'skill', jobValue: req })
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
    requirementMatches,
    skillBreakdown,
    evidence,
    gaps,
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
  const hasEducationEvidence = Boolean(String(userData.highest_education || '').trim())
  const hasAgeEvidence = Boolean(userData.date_of_birth || userData.birthdate || userData.birthday)
  const hasSkillEvidence = skills.length > 0
  const hasLanguageEvidence = Array.isArray(userData.languages) && userData.languages.length > 0
  const hasExperienceEvidence =
    (Array.isArray(userData.work_experiences) && userData.work_experiences.length > 0) ||
    (Array.isArray(userData.experience_categories) && userData.experience_categories.length > 0)

  const baselineObserved = hasSkillEvidence || hasEducationEvidence || hasAgeEvidence
  const baselineApplicable = (classified.baselineRequirementScore > 0) || requirements.some((req) => isAgeRequirement(req) || isEducationRequirement(req) || isBaselineRequirement(req))
  const experienceApplicable = Boolean(String(job.experience_level || '').trim() || String(job.category || '').trim())
  const educationApplicable = Boolean(String(job.education_level || '').trim() || requirements.some((req) => isEducationRequirement(req)))
  const technicalApplicable = classified.technicalRequirementScore > 0 || requirements.some((req) => !isEducationRequirement(req) && !isLanguageRequirement(req) && !isAgeRequirement(req))

  const fitScore = computeWeightedScore([
    { score: technicalCompetencyScore, weight: 0.5, active: technicalApplicable && hasSkillEvidence },
    { score: baselineScore, weight: 0.25, active: baselineApplicable && baselineObserved },
    { score: experienceScore, weight: 0.15, active: experienceApplicable && hasExperienceEvidence },
    { score: classified.languageRequirementScore, weight: 0.1, active: classified.languageRequirementApplicable && hasLanguageEvidence },
  ])

  const confidenceScore = (() => {
    const components = [
      { weight: 0.5, applicable: technicalApplicable, active: technicalApplicable && hasSkillEvidence },
      { weight: 0.25, applicable: baselineApplicable, active: baselineApplicable && baselineObserved },
      { weight: 0.15, applicable: experienceApplicable, active: experienceApplicable && hasExperienceEvidence },
      { weight: 0.1, applicable: classified.languageRequirementApplicable, active: classified.languageRequirementApplicable && hasLanguageEvidence },
    ]

    const applicableWeight = components
      .filter((component) => component.applicable)
      .reduce((sum, component) => sum + component.weight, 0)

    if (applicableWeight <= 0) return 0

    const activeWeight = components
      .filter((component) => component.active)
      .reduce((sum, component) => sum + component.weight, 0)

    return Number((activeWeight / applicableWeight).toFixed(4))
  })()

  return {
    matchScore: fitScore,
    matchLevel: getMatchLevel(fitScore),
    confidenceScore,
    matchingSkills: classified.matchingSkills,
    missingSkills: classified.missingSkills,
    requirementMatches: classified.requirementMatches,
    skillBreakdown: classified.skillBreakdown,
    evidence: classified.evidence,
    gaps: classified.gaps,
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
