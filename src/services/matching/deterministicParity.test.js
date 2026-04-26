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
        expect(shared.skillBreakdown).toEqual(frontend.skillBreakdown)
    })
})
