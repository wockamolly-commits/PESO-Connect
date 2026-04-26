import { describe, expect, it } from 'vitest'
import {
    evaluateApplicationEligibility,
    getBucketBreakdown,
    getPreferredBonus,
    getRelatedMatches,
    getRequirementStatusFromBreakdown,
    getSafeExplanation,
    getSkillGaps,
    getStrengths,
} from './jobDetailMatch'

const breakdown = [
    { label: 'React', kind: 'skill', tier: 'required', status: 'match', score: 1, matchedSkill: 'React' },
    { label: 'API Development', kind: 'skill', tier: 'required', status: 'partial', score: 0.6, matchedSkill: 'REST APIs', reason: 'REST APIs supports API Development.' },
    { label: 'GraphQL', kind: 'skill', tier: 'required', status: 'gap', score: 0.1 },
    { label: 'TypeScript', kind: 'skill', tier: 'preferred', status: 'match', score: 0.95 },
    { label: 'Postgres', kind: 'skill', tier: 'preferred', status: 'gap', score: 0.05 },
]

describe('getRequirementStatusFromBreakdown', () => {
    it('returns the exact status for a matching label', () => {
        expect(getRequirementStatusFromBreakdown(breakdown, 'React')).toBe('match')
        expect(getRequirementStatusFromBreakdown(breakdown, 'API Development')).toBe('partial')
        expect(getRequirementStatusFromBreakdown(breakdown, 'GraphQL')).toBe('gap')
    })

    it('is case and whitespace tolerant', () => {
        expect(getRequirementStatusFromBreakdown(breakdown, '  react  ')).toBe('match')
        expect(getRequirementStatusFromBreakdown(breakdown, 'api_development')).toBe('partial')
    })

    it('returns null for unknown requirements (no substring fallback)', () => {
        expect(getRequirementStatusFromBreakdown(breakdown, 'React Native')).toBeNull()
        expect(getRequirementStatusFromBreakdown(breakdown, 'API')).toBeNull()
        expect(getRequirementStatusFromBreakdown(breakdown, '')).toBeNull()
        expect(getRequirementStatusFromBreakdown([], 'React')).toBeNull()
    })
})

describe('strength / related / gap extractors', () => {
    it('getStrengths returns only required+preferred entries with status=match', () => {
        const strengths = getStrengths(breakdown)
        expect(strengths.map(s => s.label)).toEqual(['React', 'TypeScript'])
    })

    it('getRelatedMatches returns entries with status=partial', () => {
        const related = getRelatedMatches(breakdown)
        expect(related).toHaveLength(1)
        expect(related[0]).toMatchObject({ label: 'API Development', matchedSkill: 'REST APIs' })
    })

    it('getSkillGaps excludes preferred-tier gaps', () => {
        expect(getSkillGaps(breakdown)).toEqual(['GraphQL'])
    })
})

describe('getPreferredBonus', () => {
    it('returns preferred-tier labels with match or partial status', () => {
        expect(getPreferredBonus(breakdown, ['TypeScript', 'Postgres'])).toEqual(['TypeScript'])
    })

    it('filters by provided preferred list when given', () => {
        expect(getPreferredBonus(breakdown, ['Postgres'])).toEqual([])
    })

    it('returns all preferred matches when list is empty', () => {
        expect(getPreferredBonus(breakdown, [])).toEqual(['TypeScript'])
    })
})

describe('getBucketBreakdown', () => {
    it('derives bucket percentages from the authoritative skillBreakdown (match=1, partial=0.5, gap=0)', () => {
        const result = getBucketBreakdown({
            skillBreakdown: [
                { label: 'React', kind: 'skill', tier: 'required', status: 'match' },
                { label: 'API', kind: 'skill', tier: 'required', status: 'partial' },
                { label: 'GraphQL', kind: 'skill', tier: 'required', status: 'gap' },
                { label: 'GraphQL2', kind: 'skill', tier: 'required', status: 'gap' },
                { label: 'TypeScript', kind: 'skill', tier: 'preferred', status: 'match' },
                { label: 'Bachelor degree', kind: 'education', tier: 'required', status: 'match' },
            ],
        })

        expect(result).toEqual([
            { category: 'Required Skills', key: 'required_skills', entryCount: 4, normalizedScore: 38 },
            { category: 'Preferred Skills', key: 'preferred_skills', entryCount: 1, normalizedScore: 100 },
            { category: 'Education', key: 'education', entryCount: 1, normalizedScore: 100 },
        ])
    })

    it('omits buckets with no entries in the breakdown', () => {
        const result = getBucketBreakdown({
            skillBreakdown: [
                { label: 'React', kind: 'skill', tier: 'required', status: 'match' },
            ],
        })
        expect(result.map(b => b.key)).toEqual(['required_skills'])
    })

    it('returns an empty list for null match or empty breakdown', () => {
        expect(getBucketBreakdown(null)).toEqual([])
        expect(getBucketBreakdown({ skillBreakdown: [] })).toEqual([])
    })
})

describe('getSafeExplanation', () => {
    const match = { skillBreakdown: [{ label: 'React', kind: 'skill', tier: 'required', status: 'match' }] }

    it('returns a genuine narrative explanation', () => {
        const explanation = 'Your React background is a strong fit, though you may want to brush up on GraphQL for the API work.'
        expect(getSafeExplanation({ ...match, explanation })).toBe(explanation)
    })

    it('suppresses stub glue text from generate-match-explanation', () => {
        const glue = 'Matched evidence: Problem Solving. Matched college using Tertiary. Matched evidence: English.'
        expect(getSafeExplanation({ ...match, explanation: glue })).toBe('')
    })

    it('suppresses the "No match justification found." stub', () => {
        expect(getSafeExplanation({ ...match, explanation: 'No match justification found.' })).toBe('')
    })

    it('returns empty when no breakdown is present', () => {
        expect(getSafeExplanation({ skillBreakdown: [], explanation: 'Genuine narrative here.' })).toBe('')
    })
})

describe('evaluateApplicationEligibility', () => {
    const requirements = ['React', 'GraphQL']

    it('blocks strict jobs when every requirement is a gap', () => {
        const result = evaluateApplicationEligibility({
            job: { filter_mode: 'strict', requirements },
            match: { skillBreakdown: [{ label: 'React', kind: 'skill', tier: 'required', status: 'gap' }, { label: 'GraphQL', kind: 'skill', tier: 'required', status: 'gap' }] },
        })
        expect(result.canApply).toBe(false)
        expect(result.blockingReason).toBeTruthy()
    })

    it('allows strict jobs when any requirement is match or partial', () => {
        const result = evaluateApplicationEligibility({
            job: { filter_mode: 'strict', requirements },
            match: { skillBreakdown: breakdown },
        })
        expect(result.canApply).toBe(true)
    })

    it('requires justification on flexible jobs with no direct positive match', () => {
        const result = evaluateApplicationEligibility({
            job: { filter_mode: 'flexible', requirements: ['React'] },
            match: { skillBreakdown: [{ label: 'React', kind: 'skill', tier: 'required', status: 'gap' }] },
        })
        expect(result.requiresJustification).toBe(true)
        expect(result.canApply).toBe(true)
    })

    it('does not block or require justification when match data is unavailable', () => {
        const result = evaluateApplicationEligibility({
            job: { filter_mode: 'strict', requirements },
            match: null,
        })
        expect(result.canApply).toBe(true)
        expect(result.requiresJustification).toBe(false)
    })
})
