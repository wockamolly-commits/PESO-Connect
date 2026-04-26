import { describe, expect, it } from 'vitest'
import {
    buildDeterministicMatch,
    evaluateApplicationEligibility,
    getMatchHighlights,
    getRequirementStatus,
    mergeMatchResult,
    normalizeMatchResult,
} from './uiMatcher'

describe('uiMatcher', () => {
    it('normalizes deterministic fallback results into the shared contract', () => {
        const match = buildDeterministicMatch(
            {
                title: 'Junior Full Stack Developer',
                requirements: ['React', 'JavaScript'],
                preferred_skills: ['TypeScript'],
            },
            {
                skills: ['React'],
            },
        )

        expect(match).toEqual(expect.objectContaining({
            matchScore: expect.any(Number),
            matchLevel: expect.any(String),
            matchingSkills: expect.any(Array),
            missingSkills: expect.any(Array),
            evidence: expect.any(Array),
            gaps: expect.any(Array),
            skillBreakdown: expect.any(Array),
            actionItems: expect.any(Array),
            detailError: false,
        }))
    })

    it('keeps deterministic requirement statuses aligned with its breakdown and evidence', () => {
        const match = buildDeterministicMatch(
            {
                title: 'Office Assistant',
                requirements: ['Excel', 'Administrative Support', 'Adobe Illustrator'],
            },
            {
                skills: ['MS Excel', 'Data Entry'],
            },
        )

        expect(getRequirementStatus(match, 'Excel')).toBe('match')
        expect(getRequirementStatus(match, 'Administrative Support')).toBe('partial')
        expect(getRequirementStatus(match, 'Adobe Illustrator')).toBe('gap')
    })

    it('merges hybrid and detail data over fallback while preserving arrays', () => {
        const fallback = normalizeMatchResult({
            matchScore: 32,
            explanation: '',
            matchingSkills: ['React'],
            missingSkills: ['TypeScript'],
        })
        const hybrid = normalizeMatchResult({
            matchScore: 48,
            explanation: 'Hybrid score',
            evidence: [{ jobValue: 'React', matchMode: 'match' }],
        })
        const detail = {
            explanation: 'Detailed explanation',
            skillBreakdown: [{ label: 'React', status: 'match' }],
            actionItems: ['Build a portfolio app'],
        }

        const merged = mergeMatchResult({ fallback, hybrid, detail })

        expect(merged.matchScore).toBe(48)
        expect(merged.explanation).toBe('Detailed explanation')
        expect(merged.evidence).toEqual([{ jobValue: 'React', matchMode: 'match' }])
        expect(merged.skillBreakdown).toEqual([{ label: 'React', status: 'match' }])
        expect(merged.actionItems).toEqual(['Build a portfolio app'])
    })

    it('derives stable requirement statuses from breakdown, evidence, and gaps', () => {
        const match = normalizeMatchResult({
            skillBreakdown: [
                { label: 'React', status: 'match' },
            ],
            evidence: [
                { jobValue: 'JavaScript', matchMode: 'partial' },
            ],
            gaps: [
                { jobValue: 'TypeScript' },
            ],
        })

        expect(getRequirementStatus(match, 'React')).toBe('match')
        expect(getRequirementStatus(match, 'JavaScript')).toBe('partial')
        expect(getRequirementStatus(match, 'TypeScript')).toBe('gap')
    })

    it('prioritizes actual matched profile skills and separates supporting evidence', () => {
        const highlights = getMatchHighlights({
            match: normalizeMatchResult({
                matchingSkills: ['Graphic Design'],
                preferredSkillBonus: 1,
                evidence: [
                    { jobField: 'education', candidateValue: 'College Graduate' },
                    { jobField: 'languages', candidateValue: 'English' },
                    { jobField: 'signals', candidateValue: 'Problem Solving' },
                ],
            }),
            userData: {
                skills: ['Graphic Design', 'Video Editing'],
            },
            job: {
                preferred_skills: ['Graphic Design'],
            },
        })

        expect(highlights.matchedProfileSkills).toEqual(['Graphic Design'])
        expect(highlights.educationEvidence).toEqual(['College Graduate'])
        expect(highlights.languageEvidence).toEqual(['English'])
        expect(highlights.otherEvidence).toEqual(['Problem Solving'])
    })

    it('uses shared eligibility rules for strict and flexible jobs', () => {
        const noMatch = normalizeMatchResult({
            gaps: [{ jobValue: 'React' }],
            missingSkills: ['React'],
        })
        const partialMatch = normalizeMatchResult({
            evidence: [{ jobValue: 'React', matchMode: 'partial' }],
        })

        expect(evaluateApplicationEligibility({
            job: { filter_mode: 'strict', requirements: ['React'] },
            match: noMatch,
        })).toEqual(expect.objectContaining({
            canApply: false,
            requiresJustification: false,
        }))

        expect(evaluateApplicationEligibility({
            job: { filter_mode: 'flexible', requirements: ['React'] },
            match: noMatch,
        })).toEqual(expect.objectContaining({
            canApply: true,
            requiresJustification: true,
        }))

        expect(evaluateApplicationEligibility({
            job: { filter_mode: 'strict', requirements: ['React'] },
            match: partialMatch,
        })).toEqual(expect.objectContaining({
            canApply: true,
            requiresJustification: false,
        }))
    })
})
