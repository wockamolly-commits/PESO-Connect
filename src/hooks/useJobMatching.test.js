import { renderHook, waitFor, act } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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

import { useJobListingsMatches } from './useJobMatching'
import { getJobMatchesForUser } from '../services/matchingService'
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
