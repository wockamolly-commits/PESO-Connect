import { describe, expect, it } from 'vitest'
import {
    calculateDeterministicScore as calculateFrontendScore,
    matchRequirementToSkillSet as matchFrontendRequirement,
} from './deterministicScore'
import {
    calculateDeterministicScore as calculateSharedScore,
    matchRequirementToSkillSet as matchSharedRequirement,
} from '../../../supabase/functions/_shared/deterministicScore.ts'

describe('deterministic scoring parity', () => {
    it('keeps frontend and shared scorer match tiers aligned', () => {
        const scenarios = [
            { requirement: 'Excel', skills: ['MS Excel'] },
            { requirement: 'REST API Development', skills: ['API Development'] },
            { requirement: 'Metal Fabrication', skills: ['Welding'] },
            { requirement: 'Administrative Support', skills: ['Data Entry'] },
            { requirement: 'Problem Solving', skills: ['Hardware Troubleshooting'] },
            { requirement: 'Adobe Illustrator', skills: ['Adobe Photoshop'] },
        ]

        scenarios.forEach(({ requirement, skills }) => {
            expect(matchFrontendRequirement(requirement, skills)).toEqual(matchSharedRequirement(requirement, skills))
        })
    })

    it('keeps aggregate score outputs aligned between frontend and shared scorer', () => {
        const job = {
            title: 'Office Assistant',
            category: 'Retail',
            requirements: ['Excel', 'Administrative Support', 'Typing 40 WPM'],
            experience_level: 'entry',
        }
        const userData = {
            skills: ['MS Excel', 'Data Entry', 'Typing Skills'],
            experience_categories: ['retail'],
        }

        const frontend = calculateFrontendScore(job, userData)
        const shared = calculateSharedScore(job, userData)

        expect(shared.matchScore).toBe(frontend.matchScore)
        expect(shared.technicalRequirementScore).toBe(frontend.technicalRequirementScore)
        expect(shared.matchingSkills).toEqual(frontend.matchingSkills)
        expect(shared.relatedSkills).toEqual(frontend.relatedSkills)
        expect(shared.missingSkills).toEqual(frontend.missingSkills)
        expect(shared.requiredSkillSummary).toEqual(frontend.requiredSkillSummary)
        expect(shared.skillBreakdown).toEqual(frontend.skillBreakdown)
    })

    it('keeps field-relevance adjustments aligned between frontend and shared scorer', () => {
        const relatedJob = {
            title: 'Junior Full Stack Developer',
            category: 'Information Technology',
            requirements: ['React', 'API Development', 'JavaScript'],
            education_level: '',
            experience_level: 'entry',
        }
        const unrelatedJob = {
            title: 'Heavy Equipment Operator',
            category: 'Skilled Trades',
            requirements: ['TESDA NC II Heavy Equipment Operation', 'Valid driver license'],
            education_level: '',
        }
        const userData = {
            skills: ['Graphic Design', 'Hardware Troubleshooting'],
            highest_education: 'College Graduate',
            course_or_field: 'Bachelor of Science in Computer Science',
            experience_categories: [],
            work_experiences: [],
        }

        const relatedFrontend = calculateFrontendScore(relatedJob, userData)
        const relatedShared = calculateSharedScore(relatedJob, userData)
        const unrelatedFrontend = calculateFrontendScore(unrelatedJob, userData)
        const unrelatedShared = calculateSharedScore(unrelatedJob, userData)

        expect(relatedShared).toMatchObject({
            matchScore: relatedFrontend.matchScore,
            educationScore: relatedFrontend.educationScore,
            fieldAlignmentScore: relatedFrontend.fieldAlignmentScore,
            fieldAlignmentRelation: relatedFrontend.fieldAlignmentRelation,
        })
        expect(unrelatedShared).toMatchObject({
            matchScore: unrelatedFrontend.matchScore,
            educationScore: unrelatedFrontend.educationScore,
            fieldAlignmentScore: unrelatedFrontend.fieldAlignmentScore,
            fieldAlignmentRelation: unrelatedFrontend.fieldAlignmentRelation,
        })
    })

    it('keeps course_strand preferred-alignment bonus aligned between scorers', () => {
        const job = {
            title: 'IT Support Specialist',
            category: 'Information Technology',
            requirements: ['Customer Service'],
            experience_level: 'entry',
            education_level: 'high-school',
            course_strand: 'ICT, ABM, or related track',
        }
        const userData = {
            skills: ['Customer Service'],
            highest_education: 'High School Graduate',
            course_or_field: 'Information Technology',
            work_experiences: [],
            experience_categories: [],
        }

        const frontend = calculateFrontendScore(job, userData)
        const shared = calculateSharedScore(job, userData)

        expect(shared.matchScore).toBe(frontend.matchScore)
        expect(shared.preferredAlignmentBonus).toBe(frontend.preferredAlignmentBonus)
        expect(shared.courseStrandAlignment.relation).toBe(frontend.courseStrandAlignment.relation)
    })
})
