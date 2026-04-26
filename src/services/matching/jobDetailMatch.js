import { getSingleJobMatch } from '../matchingService'

const normalizeKey = (value) =>
    String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[\s._/\\-]+/g, ' ')
        .replace(/[^\p{Letter}\p{Number} +#]/gu, '')
        .trim()

const asArray = (value) => (Array.isArray(value) ? value : [])

export const fetchJobDetailMatch = async ({ userId, jobId }) => {
    if (!userId || !jobId) throw new Error('userId and jobId are required')
    return getSingleJobMatch({ userId, jobId })
}

export const getRequirementStatusFromBreakdown = (breakdown, requirement) => {
    const key = normalizeKey(requirement)
    if (!key) return null

    const entries = asArray(breakdown)
    const exact = entries.find(entry => normalizeKey(entry?.label) === key)
    if (exact?.status) return exact.status

    return null
}

const skillEntriesByStatus = (breakdown, status) =>
    asArray(breakdown)
        .filter(entry => entry?.kind === 'skill' && entry?.status === status)

export const getStrengths = (breakdown) =>
    skillEntriesByStatus(breakdown, 'match').map(entry => ({
        label: entry.label,
        matchedSkill: entry.matchedSkill || '',
        supportingSkills: asArray(entry.supportingSkills),
        reason: entry.reason || '',
        tier: entry.tier || 'required',
    }))

export const getRelatedMatches = (breakdown) =>
    skillEntriesByStatus(breakdown, 'partial').map(entry => ({
        label: entry.label,
        matchedSkill: entry.matchedSkill || '',
        supportingSkills: asArray(entry.supportingSkills),
        reason: entry.reason || '',
        matchType: entry.matchType || 'related',
        tier: entry.tier || 'required',
    }))

export const getSkillGaps = (breakdown) =>
    skillEntriesByStatus(breakdown, 'gap')
        .filter(entry => entry?.tier !== 'preferred')
        .map(entry => entry.label)

export const getPreferredBonus = (breakdown, preferredSkills = []) => {
    const preferredKeys = new Set(asArray(preferredSkills).map(normalizeKey).filter(Boolean))
    return asArray(breakdown)
        .filter(entry =>
            entry?.tier === 'preferred' &&
            (entry?.status === 'match' || entry?.status === 'partial') &&
            (preferredKeys.size === 0 || preferredKeys.has(normalizeKey(entry.label))),
        )
        .map(entry => entry.label)
}

const STATUS_WEIGHT = { match: 1, partial: 0.5, gap: 0 }

const bucketScore = (entries) => {
    if (!entries.length) return null
    const total = entries.reduce((sum, entry) => sum + (STATUS_WEIGHT[entry?.status] ?? 0), 0)
    return Math.round((total / entries.length) * 100)
}

// Buckets are derived from the authoritative skillBreakdown so the bars
// can never contradict the per-requirement pill colors shown elsewhere
// on the page. Status weights: match=1, partial=0.5, gap=0.
export const getBucketBreakdown = (match) => {
    const breakdown = asArray(match?.skillBreakdown)
    if (breakdown.length === 0) return []

    const groups = [
        {
            category: 'Required Skills',
            key: 'required_skills',
            entries: breakdown.filter(e => e?.kind === 'skill' && e?.tier === 'required'),
        },
        {
            category: 'Preferred Skills',
            key: 'preferred_skills',
            entries: breakdown.filter(e => e?.kind === 'skill' && e?.tier === 'preferred'),
        },
        {
            category: 'Education',
            key: 'education',
            entries: breakdown.filter(e => e?.kind === 'education'),
        },
        {
            category: 'Languages',
            key: 'languages',
            entries: breakdown.filter(e => e?.kind === 'language'),
        },
    ]

    return groups
        .map(group => ({
            category: group.category,
            key: group.key,
            entryCount: group.entries.length,
            normalizedScore: bucketScore(group.entries),
        }))
        .filter(group => group.entryCount > 0 && group.normalizedScore !== null)
}

export const evaluateApplicationEligibility = ({ job = {}, match = null } = {}) => {
    const requirements = asArray(job?.requirements)
    const breakdown = asArray(match?.skillBreakdown)
    const statuses = requirements.map(requirement => ({
        requirement,
        status: getRequirementStatusFromBreakdown(breakdown, requirement),
    }))

    const positiveStatuses = statuses.filter(item => item.status === 'match' || item.status === 'partial')
    const hasMatchData = Boolean(match) && breakdown.length > 0
    const requiresJustification =
        job?.filter_mode === 'flexible' && requirements.length > 0 && hasMatchData && positiveStatuses.length === 0
    const canApply =
        job?.filter_mode !== 'strict' ||
        requirements.length === 0 ||
        !hasMatchData ||
        positiveStatuses.length > 0

    return {
        statuses,
        positiveStatuses,
        requiresJustification,
        canApply,
        blockingReason: canApply ? '' : 'Your profile does not currently match the requirements for this position.',
    }
}

// The backend `generate-match-explanation` edge function currently returns
// a rule-based stub that stitches phrases like "Matched evidence: X. Matched
// Y using Z." — NOT a real LLM narrative. Until that function is rewritten
// to call Cohere chat for a proper summary, reject anything whose sentences
// are all of that stub form so the UI doesn't pretend it's an AI summary.
const isStubGlueExplanation = (text) => {
    const sentences = text
        .split(/(?<=\.)\s+/)
        .map(s => s.trim())
        .filter(Boolean)
    if (sentences.length === 0) return false
    const stubPrefix = /^Matched(\s+(evidence:|directly from|your|from|college using|\w+\s+using))/i
    const stubExact = /^No match justification found\.?$/i
    return sentences.every(s => stubPrefix.test(s) || stubExact.test(s))
}

export const getSafeExplanation = (match) => {
    const explanation = typeof match?.explanation === 'string' ? match.explanation.trim() : ''
    if (!explanation) return ''
    if (isStubGlueExplanation(explanation)) return ''
    const hasBreakdown = asArray(match?.skillBreakdown).length > 0
    return hasBreakdown ? explanation : ''
}

export const __test = { normalizeKey }
