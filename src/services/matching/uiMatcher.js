import {
    calculateDeterministicScore,
    hierarchyCoversRequirement,
    skillMatches,
    synonymMatches,
} from './deterministicScore'

const normalizeTextKey = (value) => String(value || '').trim().toLowerCase()

const dedupeStrings = (values = []) => {
    const seen = new Set()
    return values.filter(value => {
        const key = normalizeTextKey(value)
        if (!key || seen.has(key)) return false
        seen.add(key)
        return true
    })
}

export const sanitizeSkillText = (value) =>
    (typeof value === 'string' ? value : String(value || ''))
        .replace(/\.+$/, '')
        .replace(/^and\s+/i, '')
        .trim()

export const getProfileSkills = (userData = {}) =>
    dedupeStrings(
        [...(userData?.predefined_skills || []), ...(userData?.skills || [])]
            .map(skill => typeof skill === 'string' ? skill : skill?.name)
            .map(sanitizeSkillText)
            .filter(Boolean),
    )

export const normalizeMatchResult = (item = {}) => ({
    matchScore: Number(item.finalScore ?? item.matchScore ?? 0),
    matchLevel: item.matchLevel || 'Low',
    confidenceScore: Number(item.confidenceScore ?? 0),
    semanticScore: Number(item.semanticScore ?? 0),
    hybridSkillScore: Number(item.hybridSkillScore ?? 0),
    experienceScore: Number(item.experienceScore ?? 0),
    educationScore: Number(item.educationScore ?? 0),
    technicalCompetencyScore: Number(item.technicalCompetencyScore ?? 0),
    inferredSoftSkillScore: Number(item.inferredSoftSkillScore ?? 0),
    baselineScore: Number(item.baselineScore ?? 0),
    supportScore: Number(item.supportScore ?? 0),
    matchingSkills: Array.isArray(item.matchingSkills) ? item.matchingSkills : [],
    relatedSkills: Array.isArray(item.relatedSkills) ? item.relatedSkills : [],
    missingSkills: Array.isArray(item.missingSkills) ? item.missingSkills : [],
    inferredSoftSkills: Array.isArray(item.inferredSoftSkills) ? item.inferredSoftSkills : [],
    candidateSignals: Array.isArray(item.candidateSignals) ? item.candidateSignals : [],
    overqualificationSignal: item.overqualificationSignal || null,
    rebrandingSuggestions: Array.isArray(item.rebrandingSuggestions) ? item.rebrandingSuggestions : [],
    preferredSkillBonus: Number(item.preferredSkillBonus ?? 0),
    requiredSkillSummary: item.requiredSkillSummary || {
        total: 0,
        exact: 0,
        partial: 0,
        related: 0,
        missing: 0,
        strongCoverage: 0,
    },
    scoreComposition: item.scoreComposition || {
        requiredSkillScore: 0,
        supportScore: 0,
        preferredBonus: 0,
        coverageCap: 35,
        baseScoreBeforeCap: 0,
    },
    explanation: item.explanation || '',
    skillBreakdown: Array.isArray(item.skillBreakdown) ? item.skillBreakdown : [],
    evidence: Array.isArray(item.evidence) ? item.evidence : [],
    gaps: Array.isArray(item.gaps) ? item.gaps : [],
    actionItems: Array.isArray(item.actionItems) ? item.actionItems : [],
    improvementTips: Array.isArray(item.improvementTips) ? item.improvementTips : [],
    detailError: item.detailError === true,
})

export const buildDeterministicMatch = (job, userData) => {
    const deterministic = calculateDeterministicScore(job, userData)

    return normalizeMatchResult({
        ...deterministic,
        explanation: '',
        skillBreakdown: deterministic.skillBreakdown || [],
        evidence: deterministic.evidence || [],
        gaps: deterministic.gaps || [],
        actionItems: [],
        improvementTips: [],
    })
}

const pickArray = (...arrays) => arrays.find(array => Array.isArray(array) && array.length > 0) || []

const pickDefined = (...values) => values.find(value => value !== undefined && value !== null)

export const mergeMatchResult = ({ fallback = null, hybrid = null, detail = null } = {}) => {
    const merged = normalizeMatchResult({
        ...(fallback || {}),
        ...(hybrid || {}),
        ...(detail || {}),
        matchScore: pickDefined(detail?.matchScore, hybrid?.matchScore, fallback?.matchScore),
        finalScore: pickDefined(detail?.finalScore, hybrid?.finalScore, fallback?.finalScore),
        matchLevel: pickDefined(detail?.matchLevel, hybrid?.matchLevel, fallback?.matchLevel),
        confidenceScore: pickDefined(detail?.confidenceScore, hybrid?.confidenceScore, fallback?.confidenceScore),
        semanticScore: pickDefined(detail?.semanticScore, hybrid?.semanticScore, fallback?.semanticScore),
        hybridSkillScore: pickDefined(detail?.hybridSkillScore, hybrid?.hybridSkillScore, fallback?.hybridSkillScore),
        experienceScore: pickDefined(detail?.experienceScore, hybrid?.experienceScore, fallback?.experienceScore),
        educationScore: pickDefined(detail?.educationScore, hybrid?.educationScore, fallback?.educationScore),
        technicalCompetencyScore: pickDefined(detail?.technicalCompetencyScore, hybrid?.technicalCompetencyScore, fallback?.technicalCompetencyScore),
        inferredSoftSkillScore: pickDefined(detail?.inferredSoftSkillScore, hybrid?.inferredSoftSkillScore, fallback?.inferredSoftSkillScore),
        baselineScore: pickDefined(detail?.baselineScore, hybrid?.baselineScore, fallback?.baselineScore),
        supportScore: pickDefined(detail?.supportScore, hybrid?.supportScore, fallback?.supportScore),
        preferredSkillBonus: pickDefined(detail?.preferredSkillBonus, hybrid?.preferredSkillBonus, fallback?.preferredSkillBonus),
        matchingSkills: pickArray(detail?.matchingSkills, hybrid?.matchingSkills, fallback?.matchingSkills),
        relatedSkills: pickArray(detail?.relatedSkills, hybrid?.relatedSkills, fallback?.relatedSkills),
        missingSkills: pickArray(detail?.missingSkills, hybrid?.missingSkills, fallback?.missingSkills),
        inferredSoftSkills: pickArray(detail?.inferredSoftSkills, hybrid?.inferredSoftSkills, fallback?.inferredSoftSkills),
        candidateSignals: pickArray(detail?.candidateSignals, hybrid?.candidateSignals, fallback?.candidateSignals),
        rebrandingSuggestions: pickArray(detail?.rebrandingSuggestions, hybrid?.rebrandingSuggestions, fallback?.rebrandingSuggestions),
        requiredSkillSummary: pickDefined(detail?.requiredSkillSummary, hybrid?.requiredSkillSummary, fallback?.requiredSkillSummary),
        scoreComposition: pickDefined(detail?.scoreComposition, hybrid?.scoreComposition, fallback?.scoreComposition),
        overqualificationSignal: detail?.overqualificationSignal || hybrid?.overqualificationSignal || fallback?.overqualificationSignal || null,
        detailError: detail?.detailError ?? hybrid?.detailError ?? fallback?.detailError ?? false,
    })

    merged.explanation =
        (detail?.explanation && String(detail.explanation).trim())
        || (hybrid?.explanation && String(hybrid.explanation).trim())
        || (fallback?.explanation && String(fallback.explanation).trim())
        || ''
    merged.skillBreakdown = pickArray(detail?.skillBreakdown, hybrid?.skillBreakdown, fallback?.skillBreakdown)
    merged.evidence = pickArray(detail?.evidence, hybrid?.evidence, fallback?.evidence)
    merged.gaps = pickArray(detail?.gaps, hybrid?.gaps, fallback?.gaps)
    merged.actionItems = pickArray(detail?.actionItems, hybrid?.actionItems, fallback?.actionItems)
    merged.improvementTips = pickArray(detail?.improvementTips, hybrid?.improvementTips, fallback?.improvementTips)

    return merged
}

const findBreakdownEntry = (breakdown = [], label = '') => {
    const normalizedLabel = normalizeTextKey(label)
    if (!normalizedLabel) return null

    return breakdown.find(entry => normalizeTextKey(entry?.label) === normalizedLabel)
        || breakdown.find(entry => {
            const entryLabel = normalizeTextKey(entry?.label)
            return entryLabel && (entryLabel.includes(normalizedLabel) || normalizedLabel.includes(entryLabel))
        })
        || null
}

export const getRequirementStatus = (match = null, requirement = '') => {
    const breakdown = Array.isArray(match?.skillBreakdown) ? match.skillBreakdown : []
    const breakdownEntry = findBreakdownEntry(breakdown, requirement)
    if (breakdownEntry?.status) return breakdownEntry.status

    const requirementKey = normalizeTextKey(requirement)

    const evidenceMatch = (Array.isArray(match?.evidence) ? match.evidence : []).find(item => {
        const jobValue = normalizeTextKey(item?.jobValue)
        return jobValue && (jobValue === requirementKey || jobValue.includes(requirementKey) || requirementKey.includes(jobValue))
    })
    if (evidenceMatch) {
        return normalizeTextKey(evidenceMatch.matchMode) === 'partial' ? 'partial' : 'match'
    }

    const gapMatch = (Array.isArray(match?.gaps) ? match.gaps : []).find(item => {
        const jobValue = normalizeTextKey(item?.jobValue)
        return jobValue && (jobValue === requirementKey || jobValue.includes(requirementKey) || requirementKey.includes(jobValue))
    })
    if (gapMatch) return 'gap'

    const directMatch = (Array.isArray(match?.matchingSkills) ? match.matchingSkills : [])
        .some(skill => normalizeTextKey(skill) === requirementKey)
    if (directMatch) return 'match'

    const directGap = (Array.isArray(match?.missingSkills) ? match.missingSkills : [])
        .some(skill => normalizeTextKey(skill) === requirementKey)
    if (directGap) return 'gap'

    return null
}

export const getPreferredMatchLabels = (match = null, preferredSkills = []) => {
    const preferredMap = new Map(preferredSkills.map(skill => [normalizeTextKey(skill), skill]))

    const fromBreakdown = (Array.isArray(match?.skillBreakdown) ? match.skillBreakdown : [])
        .filter(entry => entry?.tier === 'preferred' && (entry?.status === 'match' || entry?.status === 'partial'))
        .map(entry => entry.label)

    if (fromBreakdown.length > 0) return dedupeStrings(fromBreakdown)

    const fromEvidence = (Array.isArray(match?.evidence) ? match.evidence : [])
        .map(item => preferredMap.get(normalizeTextKey(item?.jobValue)))
        .filter(Boolean)

    return dedupeStrings(fromEvidence)
}

export const getSkillGapLabels = (match = null) => {
    const breakdownGaps = (Array.isArray(match?.skillBreakdown) ? match.skillBreakdown : [])
        .filter(entry => entry?.kind === 'skill' && entry?.status === 'gap')
        .map(entry => entry.label)

    if (breakdownGaps.length > 0) return dedupeStrings(breakdownGaps)

    const evidenceGaps = (Array.isArray(match?.gaps) ? match.gaps : [])
        .map(item => item?.jobValue)
        .filter(Boolean)

    return dedupeStrings(evidenceGaps.length > 0 ? evidenceGaps : match?.missingSkills || [])
}

export const getBucketBreakdownEntries = (match = null) =>
    (Array.isArray(match?.skillBreakdown) ? match.skillBreakdown : [])
        .filter(entry => typeof entry?.category === 'string' && entry.category.trim())
        .map(entry => {
            const rawScore = typeof entry?.score === 'number' && Number.isFinite(entry.score) ? entry.score : 0
            const normalizedScore = rawScore <= 1 ? Math.round(rawScore * 100) : Math.round(rawScore)
            return {
                ...entry,
                category: entry.category.trim(),
                normalizedScore: Math.max(0, Math.min(100, normalizedScore)),
            }
        })

export const getSafeExplanation = (match = null) => {
    const explanation = typeof match?.explanation === 'string' ? match.explanation.trim() : ''
    if (!explanation) return ''
    if (explanation === 'No match justification found.') return explanation

    const hasSupportingContext =
        (Array.isArray(match?.evidence) && match.evidence.length > 0) ||
        (Array.isArray(match?.skillBreakdown) && match.skillBreakdown.length > 0)

    return hasSupportingContext ? explanation : ''
}

export const getRequirementMatchReasons = (match = null) =>
    dedupeStrings(
        (Array.isArray(match?.skillBreakdown) ? match.skillBreakdown : [])
            .filter(entry =>
                entry?.kind === 'skill' &&
                (entry?.status === 'match' || entry?.status === 'partial') &&
                typeof entry?.reason === 'string' &&
                entry.reason.trim(),
            )
            .map(entry => {
                const supportingSkills = Array.isArray(entry?.supportingSkills)
                    ? dedupeStrings(entry.supportingSkills)
                    : []
                const supportSuffix = supportingSkills.length > 0
                    ? ` Supporting skills: ${supportingSkills.join(', ')}.`
                    : ''
                return `${entry.label}: ${entry.reason.trim()}${supportSuffix}`
            }),
    )

const requirementMatchesSkill = (requirement, skill, aliases = {}) => {
    if (skillMatches(requirement, skill) || skillMatches(skill, requirement)) return true
    if (synonymMatches(requirement, skill) || synonymMatches(skill, requirement)) return true
    if (hierarchyCoversRequirement(requirement, [skill], aliases)) return true

    const skillAliases = aliases?.[skill] || []
    return skillAliases.some(alias =>
        skillMatches(requirement, alias) ||
        skillMatches(alias, requirement) ||
        synonymMatches(requirement, alias) ||
        synonymMatches(alias, requirement),
    )
}

export const getMatchHighlights = ({ match = null, userData = {}, job = {} } = {}) => {
    const profileSkills = getProfileSkills(userData)
    const aliases = userData?.skill_aliases || {}
    const matchedRequirements = dedupeStrings([
        ...(Array.isArray(match?.matchingSkills) ? match.matchingSkills : []),
        ...getPreferredMatchLabels(match, job?.preferred_skills || []),
    ])

    const matchedProfileSkills = dedupeStrings(
        profileSkills.filter(skill =>
            matchedRequirements.some(requirement => requirementMatchesSkill(requirement, skill, aliases)),
        ),
    )

    const evidence = Array.isArray(match?.evidence) ? match.evidence : []
    const languageEvidence = dedupeStrings(
        evidence
            .filter(item => normalizeTextKey(item?.jobField).includes('language') || normalizeTextKey(item?.candidateField).includes('language'))
            .map(item => item.candidateValue || item.jobValue),
    )
    const educationEvidence = dedupeStrings(
        evidence
            .filter(item => normalizeTextKey(item?.jobField).includes('education') || normalizeTextKey(item?.candidateField).includes('education'))
            .map(item => item.candidateValue || item.jobValue),
    )
    const otherEvidence = dedupeStrings(
        evidence
            .map(item => item.candidateValue || item.jobValue)
            .filter(Boolean)
            .filter(label =>
                !matchedProfileSkills.some(skill => normalizeTextKey(skill) === normalizeTextKey(label)) &&
                !languageEvidence.some(skill => normalizeTextKey(skill) === normalizeTextKey(label)) &&
                !educationEvidence.some(skill => normalizeTextKey(skill) === normalizeTextKey(label)),
            ),
    )

    return {
        matchedProfileSkills,
        languageEvidence,
        educationEvidence,
        otherEvidence,
    }
}

export const evaluateApplicationEligibility = ({ job = {}, match = null } = {}) => {
    const requirements = Array.isArray(job?.requirements) ? job.requirements : []
    const statuses = requirements.map(requirement => ({
        requirement,
        status: getRequirementStatus(match, requirement),
    }))

    const positiveStatuses = statuses.filter(item => item.status === 'match' || item.status === 'partial')
    const requiresJustification = job?.filter_mode === 'flexible' && requirements.length > 0 && positiveStatuses.length === 0
    const canApply =
        job?.filter_mode !== 'strict' ||
        requirements.length === 0 ||
        positiveStatuses.length > 0

    return {
        statuses,
        positiveStatuses,
        requiresJustification,
        canApply,
        blockingReason: canApply ? '' : 'Your profile does not currently match the requirements for this position.',
    }
}
