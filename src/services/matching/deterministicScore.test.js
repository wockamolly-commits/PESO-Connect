import { describe, expect, it } from 'vitest'
import {
    calculateDeterministicScore,
    computeEducationScore,
    computeExperienceScore,
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
            status: 'match',
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

        expect(result.matchingSkills).toEqual([])
        expect(result.relatedSkills).toEqual(['Problem Solving'])
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

    it('caps zero-strong-required-match jobs at 35 even with support signals', () => {
        const result = calculateDeterministicScore(
            {
                title: 'Junior Full Stack Developer',
                category: 'Information Technology',
                requirements: ['React', 'API Development', 'JavaScript'],
                preferred_skills: ['TypeScript'],
                education_level: 'College Graduate',
                experience_level: 'entry',
            },
            {
                skills: ['Graphic Design'],
                experience_categories: ['retail'],
                highest_education: 'College Graduate',
                course_or_field: 'Bachelor of Science in Computer Science',
            },
        )

        expect(result.matchScore).toBeLessThanOrEqual(35)
        expect(result.requiredSkillSummary).toEqual(expect.objectContaining({
            total: 3,
            exact: 0,
            partial: 0,
            related: 0,
            missing: 3,
            strongCoverage: 0,
        }))
        expect(result.matchingSkills).toEqual([])
        expect(result.relatedSkills).toEqual([])
    })

    it('keeps preferred skills as a small bonus that cannot break the coverage cap', () => {
        const result = calculateDeterministicScore(
            {
                title: 'Developer',
                requirements: ['React', 'API Development'],
                preferred_skills: ['TypeScript', 'GraphQL', 'Docker'],
            },
            {
                skills: ['React', 'TypeScript', 'GraphQL', 'Docker'],
            },
        )

        expect(result.preferredSkillBonus).toBeLessThanOrEqual(5)
        expect(result.matchScore).toBeLessThanOrEqual(result.scoreComposition.coverageCap)
    })

    it('treats related-only evidence as transferable instead of a strong required match', () => {
        const result = calculateDeterministicScore(
            {
                title: 'Office Assistant',
                requirements: ['Administrative Support'],
            },
            {
                skills: ['Data Entry'],
            },
        )

        expect(result.matchingSkills).toEqual([])
        expect(result.relatedSkills).toEqual(['Administrative Support'])
        expect(result.skillBreakdown).toEqual(expect.arrayContaining([
            expect.objectContaining({
                label: 'Administrative Support',
                matchType: 'related',
                status: 'partial',
                score: 0.4,
            }),
        ]))
    })

    it('does not treat concrete admin tasks as transferable from unrelated high-precision backgrounds', () => {
        const result = calculateDeterministicScore(
            {
                title: 'E-commerce Catalog Specialist',
                category: 'Retail',
                requirements: ['Data Entry', 'MS Office', 'Product Knowledge'],
                education_level: 'College Graduate',
            },
            {
                skills: ['Graphic Design', 'Programming'],
                highest_education: 'College Graduate',
                experience_categories: ['it'],
            },
        )

        expect(result.relatedSkills).toEqual([])
        expect(result.missingSkills).toEqual(['Data Entry', 'MS Office', 'Product Knowledge'])
    })

    it('deduplicates normalized requirements before scoring', () => {
        const result = calculateDeterministicScore(
            {
                title: 'Office Assistant',
                requirements: ['Excel', 'MS Excel', ' excel '],
            },
            {
                skills: ['Microsoft Excel'],
            },
        )

        expect(result.requiredSkillSummary.total).toBe(1)
        expect(result.matchingSkills).toEqual(['Excel'])
    })

    it('raises scores smoothly as strong required-skill coverage improves', () => {
        const job = {
            title: 'Frontend Developer',
            requirements: ['React', 'JavaScript', 'API Development', 'HTML/CSS'],
            education_level: 'College Graduate',
            experience_level: 'entry',
            category: 'Information Technology',
        }

        const none = calculateDeterministicScore(job, {
            skills: ['Graphic Design'],
            highest_education: 'College Graduate',
            experience_categories: ['retail'],
        })
        const oneStrong = calculateDeterministicScore(job, {
            skills: ['React'],
            highest_education: 'College Graduate',
            experience_categories: ['retail'],
        })
        const twoStrong = calculateDeterministicScore(job, {
            skills: ['React', 'JavaScript'],
            highest_education: 'College Graduate',
            experience_categories: ['retail'],
        })

        expect(none.matchScore).toBeLessThan(oneStrong.matchScore)
        expect(oneStrong.matchScore).toBeLessThan(twoStrong.matchScore)
        expect(oneStrong.matchScore - none.matchScore).toBeLessThanOrEqual(25)
        expect(twoStrong.matchScore - oneStrong.matchScore).toBeLessThanOrEqual(20)
    })
})

describe('computeEducationScore - field relevance support', () => {
    const technicalJob = { title: 'React Developer', category: '', required_skills: [], education_level: 'College Graduate' }
    const nonTechnicalJob = { title: 'Teacher', category: '', required_skills: [], education_level: 'College Graduate' }
    const noEducationRequirementTechnicalJob = { title: 'Junior Full Stack Developer', category: 'Information Technology', required_skills: ['React'], education_level: '' }
    const noEducationRequirementTradesJob = { title: 'Heavy Equipment Operator', category: 'Skilled Trades', required_skills: ['Valid driver license'], education_level: '' }

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

    it('grants full education score for aligned technical fields', () => {
        expect(computeEducationScore(technicalJob, userWithTechField)).toBe(100)
    })

    it('blends level fit with unrelated field alignment for technical jobs', () => {
        expect(computeEducationScore(technicalJob, userWithUnrelatedField)).toBe(68)
    })

    it('treats missing course_or_field as unknown instead of forcing a penalty', () => {
        expect(computeEducationScore(technicalJob, userWithEmptyField)).toBe(100)
        expect(computeEducationScore(technicalJob, userWithNullField)).toBe(100)
    })

    it('also reduces clearly unrelated nontechnical jobs when the field is clearly different', () => {
        expect(computeEducationScore(nonTechnicalJob, userWithUnrelatedField)).toBe(68)
    })

    it('uses field relevance directly when the job has no explicit education requirement', () => {
        expect(computeEducationScore(noEducationRequirementTechnicalJob, userWithTechField)).toBe(100)
        expect(computeEducationScore(noEducationRequirementTechnicalJob, userWithUnrelatedField)).toBe(20)
        expect(computeEducationScore(noEducationRequirementTradesJob, userWithTechField)).toBe(20)
    })

    it('still blends underqualification with field relevance instead of ignoring it', () => {
        const slightlyUnderqualifiedUser = {
            highest_education: 'College Undergraduate',
            course_or_field: 'Tourism Management',
        }
        expect(computeEducationScore(technicalJob, slightlyUnderqualifiedUser)).toBe(56)
    })
})

describe('course and field relevance ranking', () => {
    it('keeps course-aligned technical roles above unrelated operator roles when required skill coverage is equally weak', () => {
        const profile = {
            skills: ['Graphic Design', 'Hardware Troubleshooting', 'PC Assembly', 'Vector Illustration'],
            highest_education: 'College Graduate',
            course_or_field: 'Bachelor of Science in Computer Science',
            experience_categories: [],
            work_experiences: [],
        }

        const relatedTechnicalRole = calculateDeterministicScore(
            {
                title: 'Junior Full Stack Developer',
                category: 'Information Technology',
                requirements: ['React', 'API Development', 'Database Management', 'JavaScript'],
                education_level: '',
                experience_level: 'entry',
            },
            profile,
        )

        const unrelatedOperatorRole = calculateDeterministicScore(
            {
                title: 'Heavy Equipment Operator',
                category: 'Skilled Trades',
                requirements: ['TESDA NC II Heavy Equipment Operation', 'Valid driver license', 'Physically fit'],
                education_level: '',
                experience_level: '',
            },
            profile,
        )

        expect(relatedTechnicalRole.requiredSkillSummary.strongCoverage).toBe(0)
        expect(unrelatedOperatorRole.requiredSkillSummary.strongCoverage).toBe(0)
        expect(relatedTechnicalRole.matchScore).toBeGreaterThan(unrelatedOperatorRole.matchScore)
        expect(relatedTechnicalRole.educationScore).toBeGreaterThan(unrelatedOperatorRole.educationScore)
    })
})

describe('computeExperienceScore - tiered adjacent bonus', () => {
    const technicalJob = { title: 'IT Support Specialist', category: 'Information Technology', required_skills: [], experience_level: '' }
    const nonTechnicalJob = { title: 'Hotel Staff', category: 'Hospitality', required_skills: [], experience_level: '' }

    const userAdjacentCategory = { experience_categories: ['Retail'], work_experiences: [] }
    const userExactCategory = { experience_categories: ['Information Technology'], work_experiences: [] }
    const userNoCategory = { experience_categories: [], work_experiences: [] }

    it('grants 100 for exact category match (any job type)', () => {
        expect(computeExperienceScore(technicalJob, userExactCategory, { isTechnical: true, hasCoreTechnicalSkill: false })).toBe(100)
    })

    it('grants 50 for adjacent + technical + has core skill rule-hit', () => {
        expect(computeExperienceScore(technicalJob, userAdjacentCategory, { isTechnical: true, hasCoreTechnicalSkill: true })).toBe(50)
    })

    it('grants 25 for adjacent + technical + NO core skill rule-hit', () => {
        expect(computeExperienceScore(technicalJob, userAdjacentCategory, { isTechnical: true, hasCoreTechnicalSkill: false })).toBe(25)
    })

    it('grants 50 for adjacent + non-technical (unchanged behavior)', () => {
        expect(computeExperienceScore(nonTechnicalJob, userAdjacentCategory, { isTechnical: false, hasCoreTechnicalSkill: false })).toBe(50)
    })

    it('grants 20 for no category match', () => {
        expect(computeExperienceScore(technicalJob, userNoCategory, { isTechnical: true, hasCoreTechnicalSkill: false })).toBe(20)
    })

    it('accepts no opts argument (backward compatible)', () => {
        const score = computeExperienceScore(nonTechnicalJob, userAdjacentCategory)
        expect(typeof score).toBe('number')
        expect(score).toBe(50)
    })
})
