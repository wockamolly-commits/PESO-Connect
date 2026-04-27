import { renderHook, waitFor, act } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.hoisted(() => {
    vi.stubEnv('VITE_ENABLE_HYBRID_MATCHING', 'true')
})

vi.mock('../services/matchingService', () => ({
    generateMatchExplanation: vi.fn(),
    getJobMatchesForUser: vi.fn(),
    getSingleJobMatch: vi.fn(),
}))

vi.mock('../services/matching/jobDetailMatch', () => ({
    fetchJobDetailMatch: vi.fn(),
}))

vi.mock('../services/matching/uiMatcher', () => ({
    buildDeterministicMatch: vi.fn(),
    getProfileSkills: vi.fn(),
    mergeMatchResult: vi.fn(),
}))

import { useJobListingsMatches, useJobDetailMatch } from './useJobMatching'
import { generateMatchExplanation, getJobMatchesForUser } from '../services/matchingService'
import { fetchJobDetailMatch } from '../services/matching/jobDetailMatch'
import {
    buildDeterministicMatch,
    getProfileSkills,
    mergeMatchResult,
} from '../services/matching/uiMatcher'

describe('useJobListingsMatches', () => {
    const jobs = [{ id: 'job-1', title: 'Junior Full Stack Developer' }]
    const currentUser = { uid: 'user-1' }
    const userData = { skills: ['React'] }
    const isJobseeker = () => true

    beforeEach(() => {
        vi.clearAllMocks()
        getProfileSkills.mockReturnValue(['React'])
        buildDeterministicMatch.mockReturnValue({
            matchScore: 100,
            matchingSkills: ['React'],
        })
        mergeMatchResult.mockImplementation(({ hybrid, fallback }) => hybrid || fallback)
    })

    it('does not expose deterministic fallback scores before the first hybrid response resolves', async () => {
        let resolveMatches
        getJobMatchesForUser.mockReturnValue(
            new Promise((resolve) => {
                resolveMatches = resolve
            }),
        )

        const { result } = renderHook(() =>
            useJobListingsMatches({
                jobs,
                currentUser,
                userData,
                isJobseeker,
            }),
        )

        await waitFor(() => {
            expect(result.current.loadingMatchScores).toBe(true)
        })

        expect(result.current.matchScores).toEqual({})

        await act(async () => {
            resolveMatches({
                results: [{
                    jobId: 'job-1',
                    normalized: {
                        matchScore: 65,
                        matchingSkills: ['React'],
                    },
                }],
            })
        })

        await waitFor(() => {
            expect(result.current.loadingMatchScores).toBe(false)
        })

        expect(result.current.matchScores).toEqual({
            'job-1': {
                matchScore: 65,
                matchingSkills: ['React'],
            },
        })
    })
})

describe('useJobDetailMatch loadExplanation', () => {
    const job = { id: 'job-1', title: 'Junior Full Stack Developer' }
    const currentUser = { uid: 'user-1' }
    const userData = { skills: ['React'] }
    const isJobseeker = () => true

    beforeEach(() => {
        vi.clearAllMocks()
        getProfileSkills.mockReturnValue(['React'])
        buildDeterministicMatch.mockReturnValue({ matchScore: 70, matchingSkills: ['React'] })
        mergeMatchResult.mockImplementation(({ hybrid, fallback }) => hybrid || fallback)
    })

    it('forwards scoreAttribution from the explanation response onto matchData', async () => {
        fetchJobDetailMatch.mockResolvedValue({
            matchScore: 70,
            matchingSkills: ['React'],
            missingSkills: [],
            skillBreakdown: [],
        })

        const attribution = {
            exact: { points: 50, percent: 60, count: 1, skills: ['React'] },
            related: { points: 0, percent: 0, count: 0, skills: [] },
            support: { points: 15, percent: 25, detail: '' },
            missing: { lostPoints: 10, percent: 15, count: 1, skills: ['Node.js'] },
            preferredBonus: { points: 0, skills: [] },
        }

        generateMatchExplanation.mockResolvedValue({
            explanation: 'You scored 70/100 — a Good fit for this role.',
            scoreAttribution: attribution,
            skillBreakdown: [{ category: 'Exact Matches', score: 60, detail: '...' }],
            status: 'deterministic',
        })

        const { result } = renderHook(() =>
            useJobDetailMatch({ job, currentUser, userData, isJobseeker }),
        )

        await waitFor(() => {
            expect(result.current.matchData?.matchScore).toBe(70)
        })

        await act(async () => {
            await result.current.loadExplanation()
        })

        expect(result.current.matchData.explanation).toMatch(/You scored 70\/100/)
        expect(result.current.matchData.scoreAttribution).toEqual(attribution)
    })
})
