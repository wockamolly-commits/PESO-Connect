// AI Service for PESO-Connect
// Provides Smart Resume Analysis and Semantic Job-Skill Matching
// Powered by Cohere (Command R+)

const COHERE_API_KEY = import.meta.env.VITE_COHERE_API_KEY
const COHERE_API_URL = 'https://api.cohere.com/v2/chat'
const COHERE_MODEL = 'command-a-03-2025'

// In-memory cache to avoid redundant API calls during a session
const cache = new Map()
const CACHE_TTL = 10 * 60 * 1000 // 10 minutes

const getCached = (key) => {
    const entry = cache.get(key)
    if (!entry) return null
    if (Date.now() - entry.timestamp > CACHE_TTL) {
        cache.delete(key)
        return null
    }
    return entry.data
}

const setCache = (key, data) => {
    cache.set(key, { data, timestamp: Date.now() })
}

// --- sessionStorage cache for match scores ---
const SESSION_KEY_PREFIX = 'peso-match-scores-'

export const clearSessionScores = (userId) => {
    try {
        sessionStorage.removeItem(`${SESSION_KEY_PREFIX}${userId}`)
    } catch {
        // ignore
    }
}

/**
 * Call Cohere API with a prompt
 */
export const callAI = async (prompt, { timeoutMs = 15000, maxTokens = 2048 } = {}) => {
    if (!COHERE_API_KEY) {
        throw new Error('Cohere API key not configured. Add VITE_COHERE_API_KEY to your .env file.')
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
        const response = await fetch(COHERE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${COHERE_API_KEY}`,
            },
            body: JSON.stringify({
                model: COHERE_MODEL,
                messages: [
                    { role: 'system', content: 'You are a helpful assistant that always responds with valid JSON only. No markdown, no explanation, no code blocks — just raw JSON.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.3,
                max_tokens: maxTokens,
                response_format: { type: 'json_object' }
            }),
            signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
            const error = await response.json().catch(() => ({}))

            if (response.status === 429) {
                throw new Error('AI rate limit reached. Please wait a moment and try again.')
            }

            throw new Error(error.message || `AI API request failed (${response.status})`)
        }

        const data = await response.json()
        const content = data.message?.content?.[0]?.text

        if (!content) {
            throw new Error('AI returned an empty response.')
        }

        return content
    } catch (err) {
        clearTimeout(timeoutId)
        if (err.name === 'AbortError') {
            throw new Error('AI request timed out. Please try again.')
        }
        throw err
    }
}

/**
 * Parse JSON from AI response (handles markdown code blocks just in case)
 */
export const parseAIJSON = (text) => {
    let cleaned = text.trim()
    if (cleaned.startsWith('```json')) {
        cleaned = cleaned.slice(7)
    } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.slice(3)
    }
    if (cleaned.endsWith('```')) {
        cleaned = cleaned.slice(0, -3)
    }
    return JSON.parse(cleaned.trim())
}

/**
 * Safe wrapper around parseAIJSON — returns a Result object instead of throwing
 */
export const safeParseAIJSON = (text) => {
    try {
        return { ok: true, data: parseAIJSON(text) }
    } catch (e) {
        return { ok: false, error: e.message, raw: text }
    }
}

// --- Data Normalization Helpers ---

const normalizeSkillName = (name) => {
    if (!name || typeof name !== 'string') return ''
    return name.trim()
        .replace(/\s+/g, ' ')
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ')
}

const deduplicateSkills = (skills) => {
    const seen = new Set()
    return skills.filter(Boolean).filter(s => {
        const key = s.toLowerCase()
        if (seen.has(key)) return false
        seen.add(key)
        return true
    })
}

const VALID_EDUCATION_LEVELS = [
    'Elementary Graduate',
    'High School Graduate',
    'Senior High School Graduate',
    'Vocational/Technical',
    'Vocational/Technical Graduate',
    'College Undergraduate',
    'College Graduate',
    'Masteral Degree',
    'Doctoral Degree'
]

const normalizeEducationLevel = (degree) => {
    if (!degree) return ''
    const d = degree.toLowerCase()
    if (d.includes('doctor') || d.includes('phd')) return 'Doctoral Degree'
    if (d.includes('master') || d.includes('mba') || d.includes('m.s') || d.includes('m.a')) return 'Masteral Degree'
    if (d.includes('bachelor') || d.includes('b.s') || d.includes('b.a') || d.includes('college grad')) return 'College Graduate'
    if (d.includes('college') || d.includes('undergrad')) return 'College Undergraduate'
    if (d.includes('vocational') || d.includes('tesda') || d.includes('technical') || d.includes('nc ')) return 'Vocational/Technical Graduate'
    if (d.includes('senior high') || d.includes('shs') || d.includes('grade 12')) return 'Senior High School Graduate'
    if (d.includes('high school') || d.includes('secondary')) return 'High School Graduate'
    if (d.includes('elementary') || d.includes('primary') || d.includes('grade 6')) return 'Elementary Graduate'
    return 'College Graduate'
}

// --- Education ordinal maps for deterministic scoring ---
const JOB_EDUCATION_ORDINAL = {
    'none': -1,
    'elementary': 0,
    'high-school': 1,
    'vocational': 2,
    'college': 3,
}

const USER_EDUCATION_ORDINAL = {
    'Elementary Graduate': 0,
    'High School Graduate': 1,
    'Senior High School Graduate': 1.5,
    'Vocational/Technical': 2,
    'Vocational/Technical Graduate': 2,
    'College Undergraduate': 2.5,
    'College Graduate': 3,
    'Masteral Degree': 4,
    'Doctoral Degree': 5,
}

// --- Skill hierarchy for parent-child matching ---
// Children satisfy parent requirements (upward only, no recursion)
const SKILL_HIERARCHY = {
    'communication skills': ['customer service', 'active listening', 'public speaking', 'interpersonal skills'],
    'basic computer skills': ['ms office', 'typing skills', 'data entry', 'email management'],
    'electrical work': ['electrical installation', 'wiring', 'electrical troubleshooting'],
    'food preparation': ['cooking', 'baking', 'food safety', 'kitchen management'],
    'vehicle operation': ['driving', 'motorcycle operation', 'forklift operation'],
    'construction': ['masonry', 'carpentry', 'painting', 'scaffolding'],
    'welding': ['arc welding', 'mig welding', 'tig welding', 'smaw'],
    'customer service': ['cashiering', 'sales', 'complaint handling'],
    'farm equipment operation': ['tractor operation', 'harvesting equipment', 'irrigation systems'],
    'plumbing': ['pipe fitting', 'pipe installation', 'drain cleaning'],
}

const skillMatches = (a, b) => {
    const la = a.toLowerCase().trim()
    const lb = b.toLowerCase().trim()
    if (la === lb) return true
    if (la.length < 3 || lb.length < 3) return false
    const [shorter, longer] = la.length <= lb.length ? [la, lb] : [lb, la]
    const regex = new RegExp(`\\b${shorter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    return regex.test(longer)
}

// Detect if a requirement string is actually an education level (not a skill)
const EDUCATION_KEYWORDS = /\b(graduate|undergraduate|degree|diploma|elementary|high\s*school|senior\s*high|vocational|college|master|doctoral|phd|bachelor)\b/i
const isEducationRequirement = (req) => EDUCATION_KEYWORDS.test(req)

// Check if user's education satisfies an education-type requirement string
const educationSatisfied = (req, userEducation) => {
    const reqOrdinal = USER_EDUCATION_ORDINAL[req] ?? USER_EDUCATION_ORDINAL[normalizeEducationLevel(req)] ?? -1
    const userOrdinal = USER_EDUCATION_ORDINAL[userEducation] ?? 0
    return reqOrdinal >= 0 && userOrdinal >= reqOrdinal
}

// --- Language proficiency helpers ---
const LANGUAGE_NAMES = /\b(english|filipino|tagalog|cebuano|bisaya|ilokano|ilocano|hiligaynon|waray|kapampangan|pangasinan|bikolano|maranao|mandarin|chinese|japanese|korean|spanish|arabic|french|german|malay|bahasa)\b/i
const LANGUAGE_KEYWORDS = /\b(speak|fluent|proficien|communicat|literate|language)/i
const isLanguageRequirement = (req) => LANGUAGE_NAMES.test(req) && (LANGUAGE_KEYWORDS.test(req) || /^\s*(english|filipino|tagalog)\s*$/i.test(req))

const PROFICIENCY_ORDINAL = { 'Basic': 1, 'Conversational': 2, 'Fluent': 3, 'Native': 4 }

// Check if user's languages satisfy a language-type requirement
const languageSatisfied = (req, userLanguages) => {
    if (!Array.isArray(userLanguages) || userLanguages.length === 0) return false
    const reqLower = req.toLowerCase()
    for (const lang of userLanguages) {
        const name = (lang.language || '').toLowerCase()
        if (name && reqLower.includes(name)) {
            // Language name matched — now check proficiency if requirement implies a level
            const reqProficiency = /\b(fluent|native)\b/i.test(req) ? 3
                : /\b(proficien|good|strong)\b/i.test(req) ? 2
                : 1 // basic/any mention is enough
            const userProficiency = PROFICIENCY_ORDINAL[lang.proficiency] ?? 2
            if (userProficiency >= reqProficiency) return true
        }
    }
    return false
}

const hierarchyCoversRequirement = (requirement, userSkills, aliases) => {
    const children = SKILL_HIERARCHY[requirement.toLowerCase()]
    if (!children) return false
    for (const child of children) {
        for (const userSkill of userSkills) {
            if (skillMatches(child, userSkill)) return true
            const userAliases = aliases[userSkill] || []
            for (const alias of userAliases) {
                if (skillMatches(child, alias)) return true
            }
        }
    }
    return false
}

export const calculateDeterministicScore = (job, userData) => {
    const skills = (userData.skills || []).map(s => typeof s === 'string' ? s : s.name)
    const aliases = userData.skill_aliases || {}
    const requirements = (job.requirements || job.required_skills || []).filter(Boolean)

    let skillScore = 100
    const matchingSkills = []
    const missingSkills = []

    // Separate non-skill requirements (education, language) from actual skill requirements
    const skillRequirements = []
    for (const req of requirements) {
        if (isEducationRequirement(req)) {
            // Evaluate against user's education level, not skills
            if (educationSatisfied(req, userData.highest_education)) {
                matchingSkills.push(req)
            } else {
                missingSkills.push(req)
            }
        } else if (isLanguageRequirement(req)) {
            // Evaluate against user's language proficiency, not skills
            if (languageSatisfied(req, userData.languages)) {
                matchingSkills.push(req)
            } else {
                missingSkills.push(req)
            }
        } else {
            skillRequirements.push(req)
        }
    }

    if (skillRequirements.length > 0) {
        for (const req of skillRequirements) {
            let matched = false
            // Layer 1: exact/word-boundary match
            for (const skill of skills) {
                if (skillMatches(req, skill)) { matched = true; break }
            }
            // Layer 2: alias match
            if (!matched) {
                for (const skill of skills) {
                    const skillAliases = aliases[skill] || []
                    for (const alias of skillAliases) {
                        if (skillMatches(req, alias)) { matched = true; break }
                    }
                    if (matched) break
                }
            }
            // Layers 3-4: hierarchy (child + child-alias)
            if (!matched) {
                matched = hierarchyCoversRequirement(req, skills, aliases)
            }
            if (matched) matchingSkills.push(req)
            else missingSkills.push(req)
        }
    }

    if (requirements.length > 0) {
        skillScore = (matchingSkills.length / requirements.length) * 100
    }

    const userCategories = (userData.experience_categories || []).map(c => c.toLowerCase())
    const jobCategory = (job.category || '').toLowerCase()
    let experienceScore = 100
    if (jobCategory) {
        experienceScore = userCategories.includes(jobCategory) ? 100 : 20
    }

    const jobEduLevel = (job.education_level || '').toLowerCase()
    const jobOrdinal = JOB_EDUCATION_ORDINAL[jobEduLevel] ?? -1
    const userOrdinal = USER_EDUCATION_ORDINAL[userData.highest_education] ?? 0
    let educationScore = 100
    if (jobOrdinal >= 0) {
        const diff = jobOrdinal - userOrdinal
        if (diff <= 0) educationScore = 100
        else if (diff <= 1) educationScore = 60
        else educationScore = 30
    }

    const matchScore = Math.round(skillScore * 0.5 + experienceScore * 0.3 + educationScore * 0.2)
    const matchLevel = matchScore >= 80 ? 'Excellent' :
                       matchScore >= 60 ? 'Good' :
                       matchScore >= 40 ? 'Fair' : 'Low'

    return { matchScore, matchLevel, matchingSkills, missingSkills }
}

export const expandProfileAliases = async (skills, workExperiences) => {
    const FALLBACK = { skillAliases: {}, experienceCategories: [] }

    const skillNames = (skills || []).map(s => typeof s === 'string' ? s : s.name).filter(Boolean)
    if (skillNames.length === 0) return FALLBACK

    const expList = (workExperiences || []).map(w => `${w.position || w.title || ''} at ${w.company || ''}`).filter(s => s.trim() !== 'at')

    const prompt = `You are a career matching assistant for PESO (Public Employment Service Office) in the Philippines. Analyze this jobseeker's profile and generate matching data.

SKILLS: ${skillNames.join(', ')}
WORK EXPERIENCE: ${expList.length > 0 ? expList.join('; ') : 'None provided'}

Generate:
1. For each skill, provide 4-6 semantic aliases (related terms, abbreviations, broader/narrower terms relevant to Philippine blue-collar, service, and technical jobs)
2. Based on the work experience, classify into the applicable job categories. ONLY use these exact values: agriculture, energy, retail, it, trades, hospitality

Return JSON:
{"skillAliases":{"Skill Name":["alias1","alias2"]},"experienceCategories":["trades","energy"]}`

    try {
        const response = await callAI(prompt, { timeoutMs: 15000, maxTokens: 1024 })
        const parsed = parseAIJSON(response)

        const result = { skillAliases: {}, experienceCategories: [] }
        const validCategories = ['agriculture', 'energy', 'retail', 'it', 'trades', 'hospitality']

        if (parsed.skillAliases && typeof parsed.skillAliases === 'object') {
            for (const [skill, aliases] of Object.entries(parsed.skillAliases)) {
                if (Array.isArray(aliases)) {
                    result.skillAliases[skill] = aliases.map(a => String(a).trim()).filter(Boolean)
                }
            }
        }

        if (Array.isArray(parsed.experienceCategories)) {
            result.experienceCategories = parsed.experienceCategories
                .map(c => String(c).toLowerCase().trim())
                .filter(c => validCategories.includes(c))
        }

        return result
    } catch (err) {
        console.warn('expandProfileAliases failed:', err.message)
        return FALLBACK
    }
}

/**
 * Analyze resume/profile text and extract structured data with normalization
 */
export const analyzeResume = async (resumeText) => {
    const prompt = `Analyze this resume/profile and extract structured information. Focus on skills relevant to blue-collar and service jobs common in the Philippines (plumbing, electrical, carpentry, welding, masonry, driving, cooking, cleaning, farming, etc.).

Resume/Profile Text:
"""
${resumeText}
"""

Return valid JSON in this exact format:
{
    "skills": [
        {"name": "Skill Name", "level": "beginner|intermediate|expert", "years": 0}
    ],
    "experience": [
        {"title": "Job Title", "company": "Company", "duration": "Duration", "description": "Brief description"}
    ],
    "education": [
        {"degree": "Degree/Certificate", "school": "School Name", "year": "Year"}
    ],
    "summary": "One-sentence professional summary",
    "suggestedJobCategories": ["category1", "category2"]
}`

    const response = await callAI(prompt)
    const raw = parseAIJSON(response)

    // --- Normalize the output ---

    if (raw.skills && Array.isArray(raw.skills)) {
        raw.skills = raw.skills
            .map(s => ({
                name: normalizeSkillName(s.name || s),
                level: ['beginner', 'intermediate', 'expert'].includes(s.level) ? s.level : 'intermediate',
                years: Math.max(0, parseInt(s.years) || 0)
            }))
            .filter(s => s.name.length > 0)
        const seen = new Set()
        raw.skills = raw.skills.filter(s => {
            const key = s.name.toLowerCase()
            if (seen.has(key)) return false
            seen.add(key)
            return true
        })
    } else {
        raw.skills = []
    }

    if (raw.experience && Array.isArray(raw.experience)) {
        raw.experience = raw.experience.map(exp => ({
            title: (exp.title || '').trim(),
            company: (exp.company || '').trim(),
            duration: (exp.duration || '').trim(),
            description: (exp.description || '').trim()
        })).filter(exp => exp.title || exp.company)
    } else {
        raw.experience = []
    }

    if (raw.education && Array.isArray(raw.education)) {
        raw.education = raw.education.map(edu => ({
            degree: (edu.degree || '').trim(),
            normalizedLevel: normalizeEducationLevel(edu.degree),
            school: (edu.school || '').trim(),
            year: (edu.year || '').toString().trim()
        })).filter(edu => edu.degree || edu.school)
    } else {
        raw.education = []
    }

    raw.summary = (raw.summary || '').trim()

    if (raw.suggestedJobCategories && Array.isArray(raw.suggestedJobCategories)) {
        raw.suggestedJobCategories = raw.suggestedJobCategories.map(c => (c || '').trim()).filter(Boolean)
    } else {
        raw.suggestedJobCategories = []
    }

    return raw
}

/**
 * Calculate semantic match score between a job and user profile
 */
export const calculateJobMatch = async (job, profile, deterministicResults = null) => {
    const skillsKey = (profile.skills || []).map(s => typeof s === 'string' ? s : s.name).sort().join(',')
    const cacheKey = `match_${job.id}_${skillsKey}`
    const cached = getCached(cacheKey)
    if (cached && cached.skillBreakdown?.length > 0) return cached

    const det = deterministicResults || calculateDeterministicScore(job, profile)
    const jobRequirements = job.requirements?.join(', ') || job.required_skills?.join(', ') || 'Not specified'
    const workExpStr = profile.work_experiences?.map(w => {
        const parts = [`${w.position || w.title || ''} at ${w.company || ''}`]
        if (w.duration) parts.push(`(${w.duration})`)
        return parts.join(' ')
    }).filter(s => s.trim() !== 'at').join('; ') || profile.experience || 'Not specified'
    const certStr = (profile.certifications || []).filter(Boolean).join(', ') || 'None'
    const langStr = (profile.languages || []).map(l => typeof l === 'string' ? l : `${l.language} (${l.proficiency})`).join(', ') || 'Not specified'

    const prompt = `You are an expert career coach and job matching assistant for PESO (Public Employment Service Office) in the Philippines. Provide a detailed match analysis.

${SCORING_RUBRIC}

JOB POSTING:
Title: ${job.title}
Category: ${job.category || 'Not specified'}
Description: ${job.description || 'Not provided'}
Required Skills: ${jobRequirements}
Experience Level: ${job.experience_level || 'Any'}
Education Requirement: ${job.education_level || 'None'}
Location: ${job.location || 'Not specified'}

CANDIDATE PROFILE:
Skills: ${profile.skills?.map(s => typeof s === 'string' ? s : s.name).join(', ') || 'Not specified'}
Work Experience: ${workExpStr}
Education: ${profile.highest_education || profile.education || 'Not specified'}${profile.course_or_field ? ` — ${profile.course_or_field}` : ''}
Certifications: ${certStr}
Languages: ${langStr}
Location: ${profile.preferred_job_location || profile.city || 'Not specified'}

MATCH RESULTS (already computed — your analysis MUST be consistent with these):
Match Score: ${det.matchScore}/100 (${det.matchLevel})
Matched Skills: ${det.matchingSkills?.length > 0 ? det.matchingSkills.join(', ') : 'None'}
Missing Skills: ${det.missingSkills?.length > 0 ? det.missingSkills.join(', ') : 'None'}

IMPORTANT: The matched/missing skills above are FINAL. Do NOT contradict them. If a skill is listed as matched, treat it as a strength. If a skill is listed as missing, treat it as a gap. Your job is to provide qualitative explanation, not to re-evaluate matches.

Return valid JSON in this exact format:
{
    "explanation": "2-3 sentence explanation consistent with the match results above. Highlight the candidate's strengths (matched skills) and note gaps (missing skills) accurately.",
    "skillBreakdown": [
        {"category": "Technical Skills", "score": 80, "detail": "Brief note on technical alignment referencing the matched skills"},
        {"category": "Experience", "score": 60, "detail": "Brief note on experience relevance"},
        {"category": "Education", "score": 70, "detail": "Brief note on education fit"}
    ],
    "actionItems": [
        {"action": "Specific actionable step to improve candidacy", "type": "course|certification|experience|portfolio", "priority": "high|medium|low"},
        {"action": "Another specific step", "type": "course|certification|experience|portfolio", "priority": "high|medium|low"}
    ],
    "improvementTips": ["tip1", "tip2"]
}`

    const response = await callAI(prompt)
    const result = parseAIJSON(response)

    const matched = {
        explanation: result.explanation || 'Could not generate explanation.',
        skillBreakdown: (result.skillBreakdown || []).map(sb => ({
            category: sb.category || 'General',
            score: Math.min(100, Math.max(0, parseInt(sb.score) || 0)),
            detail: sb.detail || ''
        })),
        actionItems: (result.actionItems || []).map(ai => ({
            action: ai.action || '',
            type: ai.type || 'experience',
            priority: ai.priority || 'medium'
        })).filter(ai => ai.action),
        improvementTips: result.improvementTips || []
    }
    setCache(cacheKey, matched)
    return matched
}

// Scoring rubric used by calculateJobMatch for consistent AI scoring
const SCORING_RUBRIC = `SCORING RULES:
- Use semantic skill matching: recognize related skills even if names differ (e.g. "Welding" ↔ "Metal Fabrication", "Driving" ↔ "Logistics", "Cooking" ↔ "Food Preparation", "React" ↔ "Frontend Development")
- Weight: Skills 50%, Experience 30%, Education 20%
- Skills scoring: count matched skills (including semantic matches) vs required skills. 0 matched = max 25 points from skills component
- Experience scoring: relevant industry/role experience adds full points, adjacent experience adds partial. Consider certifications as supporting evidence.
- Education scoring: compare the candidate's education against the job's Education Requirement. If the candidate meets or exceeds the requirement = full points, one level below = partial.
- Final score rubric: 80-100 Excellent, 60-79 Good, 40-59 Fair, 0-39 Low
- Be strict: only score 80+ when candidate has strong direct skill matches AND relevant experience

CRITICAL: Base your analysis on the ACTUAL candidate data provided. Do NOT claim the candidate lacks qualifications they already have. If the candidate's education meets or exceeds the job requirement, do NOT list education as a gap or suggest they need a degree they already hold. The same applies to skills, experience, certifications, and all other profile data — acknowledge what the candidate already has.`

/**
 * Quick skill extraction without full analysis (faster, simpler)
 */
export const quickExtractSkills = async (text) => {
    const prompt = `Extract job skills from this text. Focus on practical, vocational skills common in Philippine blue-collar jobs.

Text: "${text}"

Return a JSON object with a "skills" array:
{"skills": ["skill1", "skill2", "skill3"]}`

    const response = await callAI(prompt)
    const parsed = parseAIJSON(response)
    const skills = parsed.skills || parsed
    if (!Array.isArray(skills)) return []
    return deduplicateSkills(skills.map(normalizeSkillName).filter(Boolean))
}

export { normalizeSkillName, deduplicateSkills, normalizeEducationLevel, VALID_EDUCATION_LEVELS }

export default {
    analyzeResume,
    calculateJobMatch,
    quickExtractSkills,
    normalizeSkillName,
    deduplicateSkills,
    normalizeEducationLevel,
    calculateDeterministicScore,
    expandProfileAliases
}
