import { useCallback, useEffect, useRef, useState } from 'react'
import {
    generateMatchExplanation,
    getJobMatchesForUser,
} from '../services/matchingService'
import { fetchJobDetailMatch } from '../services/matching/jobDetailMatch'
import {
    buildDeterministicMatch,
    getProfileSkills,
    mergeMatchResult,
} from '../services/matching/uiMatcher'

const HYBRID_MATCHING_ENABLED =
    import.meta.env.VITE_ENABLE_HYBRID_MATCHING === 'true' ||
    import.meta.env.VITE_ENABLE_EDGE_MATCHING === 'true'

const isGlueExplanation = (text) => {
    if (typeof text !== 'string') return false
    const sentences = text.split(/(?<=\.)\s+/).map(s => s.trim()).filter(Boolean)
    if (sentences.length === 0) return false
    const stubPrefix = /^Matched(\s+(evidence:|directly from|your|from|college using|\w+\s+using))/i
    const stubExact = /^No match justification found\.?$/i
    return sentences.every(s => stubPrefix.test(s) || stubExact.test(s))
}

const isStubExplanationResponse = (response) =>
    response?.status === 'stub' ||
    response?.source === 'stub' ||
    response?.explanation === 'This is a placeholder explanation response. Replace this function with a backend Cohere prompt that uses finalized scores only.' ||
    isGlueExplanation(response?.explanation)

const canLoadMatches = ({ currentUser, userData, isJobseeker }) =>
    Boolean(currentUser && isJobseeker?.() && getProfileSkills(userData).length > 0)

export const useJobListingsMatches = ({
    jobs = [],
    currentUser,
    userData,
    isJobseeker,
    filters = {},
}) => {
    const [matchScores, setMatchScores] = useState({})
    const [loadingMatchScores, setLoadingMatchScores] = useState(false)

    useEffect(() => {
        if (!jobs.length || !canLoadMatches({ currentUser, userData, isJobseeker })) {
            setMatchScores({})
            setLoadingMatchScores(false)
            return
        }

        let isCancelled = false
        const fallbackScores = Object.fromEntries(
            jobs.map(job => [job.id, buildDeterministicMatch(job, userData)]),
        )
        setMatchScores({})
        setLoadingMatchScores(true)

        if (!HYBRID_MATCHING_ENABLED) {
            setMatchScores(fallbackScores)
            setLoadingMatchScores(false)
            return
        }

        const loadHybridScores = async () => {
            try {
                const { results } = await getJobMatchesForUser({
                    userId: currentUser.uid,
                    filters,
                    limit: Math.max(jobs.length, 20),
                })

                if (isCancelled) return

                const hybridById = Object.fromEntries(
                    results.filter(result => result?.jobId).map(result => [result.jobId, result.normalized || result]),
                )
                const merged = Object.fromEntries(
                    jobs.map(job => [
                        job.id,
                        mergeMatchResult({
                            fallback: fallbackScores[job.id],
                            hybrid: hybridById[job.id],
                        }),
                    ]),
                )

                setMatchScores(merged)
            } catch (error) {
                console.warn('Hybrid job match fetch failed, using deterministic fallback:', error.message)
                if (!isCancelled) setMatchScores(fallbackScores)
            } finally {
                if (!isCancelled) setLoadingMatchScores(false)
            }
        }

        loadHybridScores()

        return () => {
            isCancelled = true
        }
    }, [jobs, currentUser, userData, isJobseeker, filters.category, filters.location, filters.type, filters.salaryMin, filters.salaryMax])

    return { matchScores, loadingMatchScores }
}

export const useJobDetailMatch = ({
    job,
    currentUser,
    userData,
    isJobseeker,
}) => {
    const [matchData, setMatchData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [loadingExplanation, setLoadingExplanation] = useState(false)
    const fetchIdRef = useRef(0)

    const load = useCallback(async () => {
        if (!job || !canLoadMatches({ currentUser, userData, isJobseeker })) {
            setMatchData(null)
            setLoading(false)
            setError(null)
            return
        }

        if (!HYBRID_MATCHING_ENABLED) {
            setMatchData(buildDeterministicMatch(job, userData))
            setLoading(false)
            setError(null)
            return
        }

        const fetchId = ++fetchIdRef.current
        setLoading(true)
        setError(null)

        try {
            const result = await fetchJobDetailMatch({
                userId: currentUser.uid,
                jobId: job.id,
            })
            if (fetchId !== fetchIdRef.current) return
            setMatchData(result)
        } catch (err) {
            if (fetchId !== fetchIdRef.current) return
            console.warn('Job detail match fetch failed:', err.message)
            setError(err)
            setMatchData(null)
        } finally {
            if (fetchId === fetchIdRef.current) setLoading(false)
        }
    }, [job, currentUser, userData, isJobseeker])

    useEffect(() => {
        load()
        return () => {
            fetchIdRef.current += 1
        }
    }, [load])

    const loadExplanation = useCallback(async () => {
        if (!job || !userData || !currentUser || !matchData) return

        setLoadingExplanation(true)
        try {
            const response = await generateMatchExplanation({
                userId: currentUser.uid,
                jobId: job.id,
                scores: matchData,
                matchingSkills: matchData.matchingSkills || [],
                missingSkills: matchData.missingSkills || [],
                evidence: matchData.evidence || [],
                gaps: matchData.gaps || [],
            })

            if (response?.explanation && !isStubExplanationResponse(response)) {
                setMatchData(prev => prev ? {
                    ...prev,
                    explanation: response.explanation,
                    scoreAttribution: response.scoreAttribution || prev.scoreAttribution,
                    skillBreakdown: prev.skillBreakdown,
                    explanationBreakdown: response.skillBreakdown || prev.explanationBreakdown,
                } : prev)
            }
        } catch (err) {
            console.warn('Match explanation fetch failed:', err.message)
        } finally {
            setLoadingExplanation(false)
        }
    }, [job, userData, currentUser, matchData])

    return {
        matchData,
        loading,
        error,
        refetch: load,
        loadingExplanation,
        loadExplanation,
    }
}
