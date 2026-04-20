// AI Service for PESO-Connect
// Provides smart resume analysis and qualitative job matching support.
// Deterministic scoring now lives in a shared module for reuse by frontend and backend.

import {
    calculateDeterministicScore,
    deduplicateSkills,
    normalizeEducationLevel,
    normalizeSkillName,
    VALID_EDUCATION_LEVELS,
} from './matching/deterministicScore'

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

// Session storage cache for match scores
const SESSION_KEY_PREFIX = 'peso-match-scores-'

export const clearSessionScores = (userId) => {
    try {
        sessionStorage.removeItem(`${SESSION_KEY_PREFIX}${userId}`)
    } catch {
        // ignore
    }
}

/**
 * Call Cohere API with a prompt.
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
                Authorization: `Bearer ${COHERE_API_KEY}`,
            },
            body: JSON.stringify({
                model: COHERE_MODEL,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful assistant that always responds with valid JSON only. No markdown, no explanation, no code blocks, just raw JSON.',
                    },
                    { role: 'user', content: prompt },
                ],
                temperature: 0.3,
                max_tokens: maxTokens,
                response_format: { type: 'json_object' },
            }),
            signal: controller.signal,
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
 * Parse JSON from AI response, handling markdown code blocks just in case.
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
 * Safe wrapper around parseAIJSON.
 */
export const safeParseAIJSON = (text) => {
    try {
        return { ok: true, data: parseAIJSON(text) }
    } catch (e) {
        return { ok: false, error: e.message, raw: text }
    }
}

export const expandProfileAliases = async (skills, workExperiences) => {
    const FALLBACK = { skillAliases: {}, experienceCategories: [] }

    const skillNames = (skills || []).map(s => typeof s === 'string' ? s : s.name).filter(Boolean)
    if (skillNames.length === 0) return FALLBACK

    const expList = (workExperiences || [])
        .map(w => `${w.position || w.title || ''} at ${w.company || ''}`)
        .filter(s => s.trim() !== 'at')

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
        const message = err?.message || ''
        const isExpectedTransientFailure =
            message.includes('timed out') ||
            message.includes('rate limit') ||
            message.includes('empty response')

        if (!isExpectedTransientFailure) {
            console.warn('expandProfileAliases failed:', message)
        }
        return FALLBACK
    }
}

/**
 * Analyze resume/profile text and extract structured data with normalization.
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

    if (raw.skills && Array.isArray(raw.skills)) {
        raw.skills = raw.skills
            .map(s => ({
                name: normalizeSkillName(s.name || s),
                level: ['beginner', 'intermediate', 'expert'].includes(s.level) ? s.level : 'intermediate',
                years: Math.max(0, parseInt(s.years) || 0),
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
        raw.experience = raw.experience
            .map(exp => ({
                title: (exp.title || '').trim(),
                company: (exp.company || '').trim(),
                duration: (exp.duration || '').trim(),
                description: (exp.description || '').trim(),
            }))
            .filter(exp => exp.title || exp.company)
    } else {
        raw.experience = []
    }

    if (raw.education && Array.isArray(raw.education)) {
        raw.education = raw.education
            .map(edu => ({
                degree: (edu.degree || '').trim(),
                normalizedLevel: normalizeEducationLevel(edu.degree),
                school: (edu.school || '').trim(),
                year: (edu.year || '').toString().trim(),
            }))
            .filter(edu => edu.degree || edu.school)
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
 * Generate qualitative match analysis for a job/profile pair.
 * Deterministic scoring remains the source of truth for the actual score.
 */
export const calculateJobMatch = async (job, profile, deterministicResults = null) => {
    const skillsKey = [...(profile.predefined_skills || []), ...(profile.skills || [])]
        .map(s => typeof s === 'string' ? s : s.name)
        .sort()
        .join(',')
    const cacheKey = `match_${job.id}_${skillsKey}`
    const cached = getCached(cacheKey)
    if (cached && cached.skillBreakdown?.length > 0) return cached

    const det = deterministicResults || calculateDeterministicScore(job, profile)
    const jobRequirements = job.requirements?.join(', ') || job.required_skills?.join(', ') || 'Not specified'
    const workExpStr = profile.work_experiences
        ?.map(w => {
            const parts = [`${w.position || w.title || ''} at ${w.company || ''}`]
            if (w.duration) parts.push(`(${w.duration})`)
            return parts.join(' ')
        })
        .filter(s => s.trim() !== 'at')
        .join('; ') || profile.experience || 'Not specified'
    const certStr = (profile.certifications || []).filter(Boolean).join(', ') || 'None'
    const langStr = (profile.languages || [])
        .map(l => typeof l === 'string' ? l : `${l.language} (${l.proficiency})`)
        .join(', ') || 'Not specified'
    const inferredSoftSkills = det.inferredSoftSkills?.length
        ? det.inferredSoftSkills.map(item => `${item.requirement} <- ${item.inferredSkill}: ${item.recruiterReason}`).join('; ')
        : 'None'
    const candidateSignals = det.candidateSignals?.length
        ? det.candidateSignals.map(item => `${item.type}: ${item.detail}`).join('; ')
        : 'None'
    const rebrandingSuggestions = det.rebrandingSuggestions?.length
        ? det.rebrandingSuggestions.join(' | ')
        : 'None'
    const overqualificationSignal = det.overqualificationSignal
        ? `${det.overqualificationSignal.title}: ${det.overqualificationSignal.detail}`
        : 'None'

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
Skills: ${[...(profile.predefined_skills || []), ...(profile.skills || [])].map(s => typeof s === 'string' ? s : s.name).join(', ') || 'Not specified'}
Work Experience: ${workExpStr}
Education: ${profile.highest_education || profile.education || 'Not specified'}${profile.course_or_field ? ` - ${profile.course_or_field}` : ''}
Certifications: ${certStr}
Languages: ${langStr}
Location: ${(profile.preferred_local_locations || []).filter(Boolean).join(', ') || profile.city || 'Not specified'}

MATCH RESULTS (already computed - your analysis MUST be consistent with these):
Match Score: ${det.matchScore}/100 (${det.matchLevel})
Matched Skills: ${det.matchingSkills?.length > 0 ? det.matchingSkills.join(', ') : 'None'}
Missing Skills: ${det.missingSkills?.length > 0 ? det.missingSkills.join(', ') : 'None'}
Technical Competency Score: ${det.technicalCompetencyScore ?? det.skillScore ?? 0}/100
Inferred Soft Skills Score: ${det.inferredSoftSkillScore ?? 0}/100
Baseline Score: ${det.baselineScore ?? det.educationScore ?? 0}/100
Inferred Soft Skills: ${inferredSoftSkills}
Candidate Signals: ${candidateSignals}
Overqualification Signal: ${overqualificationSignal}
Rebranding Suggestions: ${rebrandingSuggestions}

IMPORTANT:
- The matched/missing skills above are FINAL. Do NOT contradict them.
- If a skill is listed as matched, treat it as a strength.
- If a skill is listed as missing, treat it as a gap, but coach the candidate by reframing their existing background toward that requirement.
- If there is a High-Precision Candidate or overqualification signal, explicitly use that language and do NOT present the candidate as underqualified for baseline detail work.
- Write like a professional recruiter: concise, credible, and human. Avoid robotic phrasing.

Return valid JSON in this exact format:
{
    "explanation": "2-3 sentence recruiter-style explanation. Highlight strengths, mention any gaps with nuance, and use the overqualification/high-precision framing when provided.",
    "skillBreakdown": [
        {"category": "Technical Competency", "score": 80, "detail": "Brief recruiter-style note on technical alignment and experience relevance"},
        {"category": "Inferred Soft Skills", "score": 100, "detail": "Brief note on inferred strengths such as attention to detail or analytical thinking"},
        {"category": "Baseline Readiness", "score": 70, "detail": "Brief note on education and baseline requirements"}
    ],
    "actionItems": [
        {"action": "Specific rebranding or positioning step tied to the candidate's current strengths", "type": "course|certification|experience|portfolio|positioning", "priority": "high|medium|low"},
        {"action": "Another specific step grounded in their existing background", "type": "course|certification|experience|portfolio|positioning", "priority": "high|medium|low"}
    ],
    "improvementTips": ["Practical recruiter-style tip based on current skills", "Another practical tip"]
}`

    const response = await callAI(prompt)
    const result = parseAIJSON(response)

    const matched = {
        explanation: result.explanation || 'Could not generate explanation.',
        skillBreakdown: (result.skillBreakdown || []).map(sb => ({
            category: sb.category || 'General',
            score: Math.min(100, Math.max(0, parseInt(sb.score) || 0)),
            detail: sb.detail || '',
        })),
        actionItems: (result.actionItems || [])
            .map(ai => ({
                action: ai.action || '',
                type: ai.type || 'experience',
                priority: ai.priority || 'medium',
            }))
            .filter(ai => ai.action),
        improvementTips: result.improvementTips || [],
    }

    setCache(cacheKey, matched)
    return matched
}

const SCORING_RUBRIC = `SCORING RULES:
- Use semantic skill matching: recognize related skills even if names differ (e.g. "Welding" <-> "Metal Fabrication", "Driving" <-> "Logistics", "Cooking" <-> "Food Preparation", "React" <-> "Frontend Development")
- Weight: Technical Competency 50%, Inferred Soft Skills 20%, Education + Baseline Requirements 30%
- Technical competency blends direct skill alignment with relevant experience.
- Inferred soft skills can be awarded from adjacent evidence. Example: Programming or Graphic Design should be treated as full evidence for Attention to Detail and Analytical Thinking.
- Education and baseline requirements such as typing, data entry fundamentals, and high school completion should never dominate the score.
- If a candidate with development or design capability applies to a lower-tier precision role such as data entry, do not frame them as lacking skills. Treat them as a High-Precision Candidate whose background exceeds the job's detail requirements.
- Final score rubric: 80-100 Excellent, 60-79 Good, 40-59 Fair, 0-39 Low
- If there is a gap, give repositioning advice based on the candidate's current background. Do not give generic advice like "develop this skill" unless absolutely unavoidable.

CRITICAL: Base your analysis on the ACTUAL candidate data provided. Do NOT claim the candidate lacks qualifications they already have. If the candidate's education meets or exceeds the job requirement, do NOT list education as a gap or suggest they need a degree they already hold. The same applies to skills, experience, certifications, and all other profile data - acknowledge what the candidate already has.`

/**
 * Quick skill extraction without full analysis.
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

export {
    calculateDeterministicScore,
    deduplicateSkills,
    normalizeEducationLevel,
    normalizeSkillName,
    VALID_EDUCATION_LEVELS,
}

/**
 * Deep-scans a jobseeker's full profile context (course, vocational training,
 * work experience) with an LLM and returns up to 15 specialized skills that
 * the deterministic rules may have missed.
 *
 * Returns [] on any error so the UI can degrade gracefully.
 *
 * @param {object} formData - Registration form state (Step 4 + Step 5 data)
 * @returns {Promise<string[]>}
 */
export const deepAnalyzeProfileSkills = async (formData = {}) => {
    const course = formData.course_or_field || ''
    const vocational = (formData.vocational_training || [])
        .map(t => [t.course_name, t.skills_acquired].filter(Boolean).join(': '))
        .filter(Boolean)
        .join('; ')
    const experiences = (formData.work_experiences || [])
        .map(e => {
            const parts = [e.position, e.company].filter(Boolean).join(' at ')
            return parts
        })
        .filter(Boolean)
        .join(', ')

    if (!course && !vocational && !experiences) return []

    const contextLines = []
    if (course) contextLines.push(`Course/Field of Study: ${course}`)
    if (vocational) contextLines.push(`Vocational/Technical Training: ${vocational}`)
    if (experiences) contextLines.push(`Work Experience: ${experiences}`)

    const prompt = `You are a professional career analyst. Based on the following jobseeker background, extract up to 15 specialized technical and soft skills that are most relevant for employment in the Philippines.

${contextLines.join('\n')}

Rules:
- Return ONLY a JSON object with a single key "skills" containing an array of strings.
- Each skill should be a short, normalized phrase (2-4 words max).
- Prioritize technical/vocational skills over generic ones.
- Do not repeat obvious skills like "Communication" unless clearly specialized.
- Example output: {"skills": ["Preventative Maintenance", "Safety Compliance", "Tool Calibration"]}`

    try {
        const raw = await callAI(prompt, { timeoutMs: 20000, maxTokens: 512 })
        const parsed = safeParseAIJSON(raw)
        if (!parsed.ok) return []
        const skills = parsed.data?.skills
        if (!Array.isArray(skills)) return []
        return skills
            .map(s => (typeof s === 'string' ? s.trim() : ''))
            .filter(s => s.length > 0 && s.length < 60)
            .slice(0, 15)
    } catch {
        return []
    }
}

export default {
    analyzeResume,
    calculateJobMatch,
    quickExtractSkills,
    normalizeSkillName,
    deduplicateSkills,
    normalizeEducationLevel,
    calculateDeterministicScore,
    expandProfileAliases,
    deepAnalyzeProfileSkills,
}
