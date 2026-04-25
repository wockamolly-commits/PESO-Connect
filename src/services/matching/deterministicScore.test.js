import { describe, expect, it } from 'vitest'
import {
    calculateDeterministicScore,
    computeEducationScore,
    deduplicateSkills,
    matchRequirementToSkillSet,
    normalizeSkillKey,
} from './deterministicScore'

describe('deterministicScore', () => {
    it('normalizes canonical skill variants before matching', () => {
        expect(normalizeSkillKey(' knowledge of MS Excel skills ')).toBe('excel')

        const match = matchRequirementToSkillSet('Excel', ['MS Excel'])
        expect(match).toEqual(expect.objectContaining({
            matched: true,
            matchType: 'exact',
            status: 'match',
        }))
    })

    it('treats strong phrase overlap as a partial match', () => {
        const match = matchRequirementToSkillSet('REST API Development', ['API Development'])

        expect(match).toEqual(expect.objectContaining({
            matched: true,
            matchType: 'partial',
            status: 'partial',
        }))
    })

    it('treats curated synonym-family matches as related instead of exact', () => {
        const match = matchRequirementToSkillSet('Metal Fabrication', ['Welding'])

        expect(match).toEqual(expect.objectContaining({
            matched: true,
            matchType: 'related',
            status: 'partial',
        }))
    })

    it('treats hierarchy-family matches as related instead of gaps', () => {
        const match = matchRequirementToSkillSet('Administrative Support', ['Data Entry'])

        expect(match).toEqual(expect.objectContaining({
            matched: true,
            matchType: 'related',
            status: 'partial',
        }))
    })

    it('treats specific troubleshooting skills as related problem-solving matches', () => {
        const match = matchRequirementToSkillSet('Problem Solving', ['Hardware Troubleshooting'])

        expect(match).toEqual(expect.objectContaining({
            matched: true,
            matchType: 'related',
            status: 'partial',
            reason: 'Hardware Troubleshooting supports the broader requirement Problem Solving.',
        }))
    })

    it('keeps unrelated near-miss skills as gaps', () => {
        const match = matchRequirementToSkillSet('Adobe Illustrator', ['Adobe Photoshop'])

        expect(match).toEqual(expect.objectContaining({
            matched: false,
            matchType: 'gap',
            status: 'gap',
        }))
    })

    it('deduplicates repeated raw skill variants using normalized keys', () => {
        expect(deduplicateSkills(['MS Excel', 'excel', 'Microsoft Excel'])).toEqual(['MS Excel'])
    })

    it('returns stable scoring and breakdown for repeated skill variants', () => {
        const job = {
            title: 'Office Assistant',
            requirements: ['Excel', 'Administrative Support'],
        }

        const single = calculateDeterministicScore(job, {
            skills: ['Excel', 'Administrative Support'],
        })

        const repeated = calculateDeterministicScore(job, {
            skills: ['MS Excel', 'Microsoft Excel', 'Admin Support', 'Administrative Support'],
        })

        expect(repeated.technicalRequirementScore).toBe(single.technicalRequirementScore)
        expect(repeated.matchingSkills).toEqual(single.matchingSkills)
        expect(repeated.skillBreakdown).toEqual(expect.arrayContaining([
            expect.objectContaining({ label: 'Excel', status: 'match', matchType: 'exact' }),
            expect.objectContaining({ label: 'Administrative Support', status: 'match', matchType: 'exact' }),
        ]))
        expect(repeated.evidence).toEqual(expect.arrayContaining([
            expect.objectContaining({ jobValue: 'Excel', matchMode: 'match' }),
            expect.objectContaining({ jobValue: 'Administrative Support', matchMode: 'match' }),
        ]))
    })

    it('reduces false negatives for general requirements satisfied by specific technical skills', () => {
        const result = calculateDeterministicScore(
            {
                title: 'IT Support Assistant',
                requirements: ['Problem Solving'],
            },
            {
                skills: ['Hardware Troubleshooting'],
            },
        )

        expect(result.matchingSkills).toEqual(['Problem Solving'])
        expect(result.missingSkills).toEqual([])
        expect(result.skillBreakdown).toEqual(expect.arrayContaining([
            expect.objectContaining({
                label: 'Problem Solving',
                matchType: 'related',
                status: 'partial',
                reason: 'Hardware Troubleshooting supports the broader requirement Problem Solving.',
            }),
        ]))
        expect(result.evidence).toEqual(expect.arrayContaining([
            expect.objectContaining({
                jobValue: 'Problem Solving',
                reason: 'Hardware Troubleshooting supports the broader requirement Problem Solving.',
            }),
        ]))
    })
})

describe('computeEducationScore — field-of-study penalty', () => {
  const technicalJob = { title: 'React Developer', category: '', required_skills: [], education_level: 'College Graduate' }
  const nonTechnicalJob = { title: 'Cashier', category: '', required_skills: [], education_level: 'College Graduate' }

  const userWithTechField = {
    highest_education: 'College Graduate',
    course_or_field: 'Bachelor of Science in Computer Science',
  }
  const userWithUnrelatedField = {
    highest_education: 'College Graduate',
    course_or_field: 'Bachelor of Science in Tourism Management',
  }
  const userWithEmptyField = {
    highest_education: 'College Graduate',
    course_or_field: '',
  }
  const userWithNullField = {
    highest_education: 'College Graduate',
    course_or_field: null,
  }

  it('grants full education score (100) for technical job + technical degree field', () => {
    expect(computeEducationScore(technicalJob, userWithTechField)).toBe(100)
  })

  it('applies 0.7x penalty (→70) for technical job + unrelated degree field', () => {
    expect(computeEducationScore(technicalJob, userWithUnrelatedField)).toBe(70)
  })

  it('applies 0.7x penalty (→70) for technical job + empty course_or_field', () => {
    expect(computeEducationScore(technicalJob, userWithEmptyField)).toBe(70)
  })

  it('applies 0.7x penalty (→70) for technical job + null course_or_field', () => {
    expect(computeEducationScore(technicalJob, userWithNullField)).toBe(70)
  })

  it('does NOT apply penalty for non-technical job + unrelated field', () => {
    expect(computeEducationScore(nonTechnicalJob, userWithUnrelatedField)).toBe(100)
  })

  it('does NOT apply penalty for non-technical job + empty field', () => {
    expect(computeEducationScore(nonTechnicalJob, userWithEmptyField)).toBe(100)
  })
})
