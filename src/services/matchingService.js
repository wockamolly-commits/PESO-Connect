import { supabase } from '../config/supabase'

const normalizeMatchResult = (item = {}) => ({
    matchScore: Number(item.finalScore ?? item.matchScore ?? 0),
    matchLevel: item.matchLevel || 'Low',
    semanticScore: Number(item.semanticScore ?? 0),
    hybridSkillScore: Number(item.hybridSkillScore ?? 0),
    experienceScore: Number(item.experienceScore ?? 0),
    educationScore: Number(item.educationScore ?? 0),
    technicalCompetencyScore: Number(item.technicalCompetencyScore ?? 0),
    inferredSoftSkillScore: Number(item.inferredSoftSkillScore ?? 0),
    baselineScore: Number(item.baselineScore ?? 0),
    matchingSkills: Array.isArray(item.matchingSkills) ? item.matchingSkills : [],
    missingSkills: Array.isArray(item.missingSkills) ? item.missingSkills : [],
    inferredSoftSkills: Array.isArray(item.inferredSoftSkills) ? item.inferredSoftSkills : [],
    candidateSignals: Array.isArray(item.candidateSignals) ? item.candidateSignals : [],
    overqualificationSignal: item.overqualificationSignal || null,
    rebrandingSuggestions: Array.isArray(item.rebrandingSuggestions) ? item.rebrandingSuggestions : [],
    explanation: item.explanation || '',
    skillBreakdown: Array.isArray(item.skillBreakdown) ? item.skillBreakdown : [],
    actionItems: Array.isArray(item.actionItems) ? item.actionItems : [],
    improvementTips: Array.isArray(item.improvementTips) ? item.improvementTips : [],
})

const invoke = async (functionName, payload) => {
    const { data, error } = await supabase.functions.invoke(functionName, {
        body: payload,
    })

    if (error) {
        throw new Error(error.message || `Failed to invoke ${functionName}`)
    }

    return data
}

export const getJobMatchesForUser = async ({
    userId,
    filters = {},
    limit = 20,
    offset = 0,
    rerank = false,
} = {}) => {
    if (!userId) {
        throw new Error('userId is required')
    }

    const data = await invoke('match-jobs', {
        userId,
        filters,
        limit,
        offset,
        rerank,
    })

    return {
        results: Array.isArray(data?.results)
            ? data.results.map(item => ({
                ...item,
                normalized: normalizeMatchResult(item),
            }))
            : [],
        meta: data?.meta || {},
    }
}

export const getSingleJobMatch = async ({ userId, jobId, rerank = false } = {}) => {
    if (!userId || !jobId) {
        throw new Error('userId and jobId are required')
    }

    const data = await invoke('match-jobs', {
        userId,
        filters: { jobId },
        limit: 1,
        offset: 0,
        rerank,
    })

    const first = data?.results?.[0]
    return first ? normalizeMatchResult(first) : null
}

export const refreshProfileEmbedding = async ({ userId } = {}) => {
    if (!userId) {
        throw new Error('userId is required')
    }
    return invoke('refresh-profile-embedding', { userId })
}

export const refreshJobEmbedding = async ({ jobId } = {}) => {
    if (!jobId) {
        throw new Error('jobId is required')
    }
    return invoke('refresh-job-embedding', { jobId })
}

export const generateMatchExplanation = async ({
    userId,
    jobId,
    scores,
    matchingSkills = [],
    missingSkills = [],
} = {}) => {
    if (!userId || !jobId) {
        throw new Error('userId and jobId are required')
    }

    return invoke('generate-match-explanation', {
        userId,
        jobId,
        scores,
        matchingSkills,
        missingSkills,
    })
}

export { normalizeMatchResult }

export default {
    getJobMatchesForUser,
    getSingleJobMatch,
    refreshProfileEmbedding,
    refreshJobEmbedding,
    generateMatchExplanation,
    normalizeMatchResult,
}
