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
const SESSION_TTL = 10 * 60 * 1000 // 10 minutes

export const getSessionScores = (userId, skillsHash) => {
    try {
        const raw = sessionStorage.getItem(`${SESSION_KEY_PREFIX}${userId}`)
        if (!raw) return null
        const parsed = JSON.parse(raw)
        if (parsed.skillsHash !== skillsHash) return null
        if (Date.now() - parsed.timestamp > SESSION_TTL) {
            sessionStorage.removeItem(`${SESSION_KEY_PREFIX}${userId}`)
            return null
        }
        return parsed.scores
    } catch {
        return null
    }
}

export const setSessionScores = (userId, skillsHash, newScores) => {
    try {
        const raw = sessionStorage.getItem(`${SESSION_KEY_PREFIX}${userId}`)
        let existing = {}
        if (raw) {
            const parsed = JSON.parse(raw)
            if (parsed.skillsHash === skillsHash && Date.now() - parsed.timestamp < SESSION_TTL) {
                existing = parsed.scores || {}
            }
        }
        sessionStorage.setItem(`${SESSION_KEY_PREFIX}${userId}`, JSON.stringify({
            timestamp: Date.now(),
            skillsHash,
            scores: { ...existing, ...newScores }
        }))
    } catch {
        // sessionStorage full or unavailable — ignore
    }
}

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
    return skills.filter(s => {
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
    'Vocational/Technical Graduate': 2,
    'College Undergraduate': 2.5,
    'College Graduate': 3,
    'Masteral Degree': 4,
    'Doctoral Degree': 5,
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

export const calculateDeterministicScore = (job, userData) => {
    const skills = (userData.skills || []).map(s => typeof s === 'string' ? s : s.name)
    const aliases = userData.skill_aliases || {}
    const requirements = (job.requirements || job.required_skills || []).filter(Boolean)

    let skillScore = 100
    const matchingSkills = []
    const missingSkills = []

    if (requirements.length > 0) {
        for (const req of requirements) {
            let matched = false
            for (const skill of skills) {
                if (skillMatches(req, skill)) { matched = true; break }
                const skillAliases = aliases[skill] || []
                for (const alias of skillAliases) {
                    if (skillMatches(req, alias)) { matched = true; break }
                }
                if (matched) break
            }
            if (matched) matchingSkills.push(req)
            else missingSkills.push(req)
        }
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
export const calculateJobMatch = async (job, profile) => {
    const skillsKey = (profile.skills || []).map(s => typeof s === 'string' ? s : s.name).sort().join(',')
    const cacheKey = `match_${job.id}_${skillsKey}`
    const cached = getCached(cacheKey)
    if (cached && cached.skillBreakdown?.length > 0) return cached

    const jobRequirements = job.requirements?.join(', ') || job.required_skills?.join(', ') || 'Not specified'

    const prompt = `You are an expert career coach and job matching assistant for PESO (Public Employment Service Office) in the Philippines. Provide a detailed match analysis.

${SCORING_RUBRIC}

JOB POSTING:
Title: ${job.title}
Category: ${job.category || 'Not specified'}
Description: ${job.description || 'Not provided'}
Required Skills: ${jobRequirements}
Experience Level: ${job.experience_level || 'Any'}

CANDIDATE PROFILE:
Skills: ${profile.skills?.map(s => typeof s === 'string' ? s : s.name).join(', ') || 'Not specified'}
Experience: ${profile.work_experiences?.map(w => `${w.position} at ${w.company}`).join('; ') || profile.experience || 'Not specified'}
Education: ${profile.highest_education || profile.education || 'Not specified'}

Return valid JSON in this exact format:
{
    "matchScore": 75,
    "matchLevel": "Excellent|Good|Fair|Low",
    "matchingSkills": ["skill1", "skill2"],
    "missingSkills": ["skill1", "skill2"],
    "explanation": "2-3 sentence explanation focusing on the candidate's strengths and fit for this specific role.",
    "skillBreakdown": [
        {"category": "Technical Skills", "score": 80, "detail": "Brief note on technical alignment"},
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
        matchScore: Math.min(100, Math.max(0, parseInt(result.matchScore) || 0)),
        matchLevel: result.matchLevel || 'Unknown',
        matchingSkills: result.matchingSkills || [],
        missingSkills: result.missingSkills || [],
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

// Shared scoring rubric used by both batch and single-job scoring for consistency
const SCORING_RUBRIC = `SCORING RULES:
- Use semantic skill matching: recognize related skills even if names differ (e.g. "Welding" ↔ "Metal Fabrication", "Driving" ↔ "Logistics", "Cooking" ↔ "Food Preparation", "React" ↔ "Frontend Development")
- Weight: Skills 50%, Experience 30%, Education 20%
- Skills scoring: count matched skills (including semantic matches) vs required skills. 0 matched = max 25 points from skills component
- Experience scoring: relevant industry/role experience adds full points, adjacent experience adds partial
- Education scoring: meets or exceeds requirement = full points, one level below = partial
- Final score rubric: 80-100 Excellent, 60-79 Good, 40-59 Fair, 0-39 Low
- Be strict: only score 80+ when candidate has strong direct skill matches AND relevant experience`

/**
 * Score a small batch of jobs (up to 5) in one lean API call.
 */
const scoreBatch = async (jobsBatch, skillsList, expList, eduLevel) => {
    const jobLines = jobsBatch.map((job, i) => {
        const reqs = job.requirements?.join(', ') || job.required_skills?.join(', ') || 'None'
        return `${i}: "${job.title}" — needs: ${reqs}`
    }).join('\n')

    const prompt = `You are a job matching assistant for PESO (Public Employment Service Office) in the Philippines. Match this candidate to each job.

${SCORING_RUBRIC}

Candidate: skills=[${skillsList}] | experience=[${expList}] | education=${eduLevel}

Jobs:
${jobLines}

JSON — keys are job indices. Keep explanation under 15 words:
{"0":{"matchScore":75,"matchLevel":"Good","matchingSkills":["x"],"missingSkills":["y"],"explanation":"brief reason"}}`

    const response = await callAI(prompt, { timeoutMs: 20000, maxTokens: 2048 })
    return safeParseAIJSON(response)
}

/**
 * Score all jobs in small batches (5 at a time) with delays to respect rate limits.
 * Returns { [jobId]: { matchScore, matchLevel, matchingSkills, missingSkills, explanation } }
 */
export const scoreAllJobs = async (jobs, profile) => {
    if (!jobs.length || !profile.skills?.length) return {}

    const skillsList = profile.skills.map(s => typeof s === 'string' ? s : s.name).join(', ')
    const skillsKey = profile.skills.map(s => typeof s === 'string' ? s : s.name).sort().join(',')
    const expList = profile.work_experiences?.map(w => `${w.position} at ${w.company}`).join('; ') || profile.experience || 'None'
    const eduLevel = profile.highest_education || profile.education || 'Not specified'

    const BATCH_SIZE = 5
    const results = {}
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

    for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
        if (i > 0) await delay(3000) // 3s gap between batches to stay under TPM limit

        const batch = jobs.slice(i, i + BATCH_SIZE)
        try {
            const parsed = await scoreBatch(batch, skillsList, expList, eduLevel)
            if (!parsed.ok) {
                console.warn(`scoreAllJobs: batch ${i} parse failed`)
                continue
            }
            for (const [index, data] of Object.entries(parsed.data)) {
                const idx = parseInt(index)
                if (isNaN(idx) || idx < 0 || idx >= batch.length) continue
                const job = batch[idx]
                const normalized = {
                    matchScore: Math.min(100, Math.max(0, parseInt(data.matchScore) || 0)),
                    matchLevel: data.matchLevel || 'Unknown',
                    matchingSkills: data.matchingSkills || [],
                    missingSkills: data.missingSkills || [],
                    explanation: data.explanation || '',
                    skillBreakdown: [],
                    actionItems: [],
                    improvementTips: []
                }
                results[job.id] = normalized
                setCache(`match_${job.id}_${skillsKey}`, normalized)
            }
        } catch (err) {
            const errMsg = err?.message || ''
            if (errMsg.includes('rate limit') || errMsg.includes('429')) {
                console.warn('Rate limited — stopping remaining batches')
                break
            }
            console.warn(`scoreAllJobs: batch ${i} failed:`, errMsg)
        }
    }

    return results
}

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
    scoreAllJobs,
    quickExtractSkills,
    normalizeSkillName,
    deduplicateSkills,
    normalizeEducationLevel,
    calculateDeterministicScore,
    expandProfileAliases
}
