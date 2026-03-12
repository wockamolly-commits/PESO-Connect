// AI Service for PESO-Connect
// Provides Smart Resume Analysis and Semantic Job-Skill Matching
// Powered by Groq (Llama 3.3 70B)

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama-3.3-70b-versatile'

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
 * Call Groq API with a prompt
 */
export const callAI = async (prompt, { timeoutMs = 15000, maxTokens = 2048 } = {}, _retryCount = 0) => {
    if (!GROQ_API_KEY) {
        throw new Error('Groq API key not configured. Add VITE_GROQ_API_KEY to your .env file.')
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`,
            },
            body: JSON.stringify({
                model: GROQ_MODEL,
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
                // Retry once after a short backoff
                if (_retryCount < 1) {
                    await new Promise(resolve => setTimeout(resolve, 2000))
                    return callAI(prompt, { timeoutMs, maxTokens }, _retryCount + 1)
                }
                throw new Error('AI rate limit reached. Please wait a moment and try again.')
            }

            throw new Error(error.error?.message || `AI API request failed (${response.status})`)
        }

        const data = await response.json()
        const content = data.choices?.[0]?.message?.content

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
    if (cached) return cached

    const jobRequirements = job.requirements?.join(', ') || job.required_skills?.join(', ') || 'Not specified'

    const prompt = `You are an expert career coach and job matching assistant for PESO (Public Employment Service Office) in the Philippines. Analyze how well this candidate matches the job. Use semantic skill matching — recognize related skills even if names differ (e.g. "React" matches "Frontend Development", "Welding" matches "Metal Fabrication"). Be specific and actionable.

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

/**
 * Score all jobs in a single API call using index-based matching.
 * Returns { [jobId]: { matchScore, matchLevel, matchingSkills, missingSkills, explanation } }
 */
export const scoreAllJobs = async (jobs, profile) => {
    if (!jobs.length || !profile.skills?.length) return {}

    const jobsToScore = jobs.slice(0, 30)
    if (jobs.length > 30) {
        console.warn(`scoreAllJobs: scoring first 30 of ${jobs.length} jobs`)
    }

    const skillsList = profile.skills.map(s => typeof s === 'string' ? s : s.name).join(', ')
    const skillsKey = profile.skills.map(s => typeof s === 'string' ? s : s.name).sort().join(',')
    const expList = profile.work_experiences?.map(w => `${w.position} at ${w.company}`).join('; ') || profile.experience || 'Not specified'
    const eduLevel = profile.highest_education || profile.education || 'Not specified'

    const jobLines = jobsToScore.map((job, i) => {
        const reqs = job.requirements?.join(', ') || job.required_skills?.join(', ') || 'Not specified'
        return `JOB_${i}: title="${job.title}" | required_skills="${reqs}"`
    }).join('\n')

    const prompt = `You are a job matching assistant for PESO (Public Employment Service Office) in the Philippines. Score how well this candidate matches EACH job below.

RULES:
- Use semantic skill matching: recognize related skills even if names differ (e.g. "Welding" ↔ "Metal Fabrication", "Driving" ↔ "Logistics", "Cooking" ↔ "Food Preparation")
- Weight practical/vocational skills and TESDA certifications appropriately
- Scoring rubric: 80-100 Excellent (strong match), 60-79 Good (relevant skills), 40-59 Fair (some transferable), 0-39 Low (weak match)
- Keep each explanation under 15 words

CANDIDATE:
Skills: ${skillsList}
Experience: ${expList}
Education: ${eduLevel}

JOBS:
${jobLines}

Return valid JSON with numeric index keys matching each JOB_N:
{
  "0": {"matchScore": 75, "matchLevel": "Good", "matchingSkills": ["skill1"], "missingSkills": ["skill1"], "explanation": "Brief reason."},
  "1": {"matchScore": 40, "matchLevel": "Low", "matchingSkills": [], "missingSkills": ["skill1"], "explanation": "Brief reason."}
}`

    const response = await callAI(prompt, { timeoutMs: 45000, maxTokens: 4096 })
    const parsed = safeParseAIJSON(response)

    if (!parsed.ok) {
        console.error('scoreAllJobs: failed to parse AI response')
        return {}
    }

    const results = {}
    for (const [index, data] of Object.entries(parsed.data)) {
        const i = parseInt(index)
        if (isNaN(i) || i < 0 || i >= jobsToScore.length) continue
        const job = jobsToScore[i]
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
        // Cache per-job for calculateJobMatch cache hits on JobDetail
        setCache(`match_${job.id}_${skillsKey}`, normalized)
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
    normalizeEducationLevel
}
