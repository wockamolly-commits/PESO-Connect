import { describe, expect, it } from 'vitest'
import {
    buildSemanticSkillJudgePrompt,
    normalizeSemanticSkillJudgments,
    scoreFromSemanticMatchType,
} from '../../../supabase/functions/_shared/semanticSkillJudge.ts'

describe('semanticSkillJudge', () => {
    it('maps semantic match types to stable scores', () => {
        expect(scoreFromSemanticMatchType('exact')).toBe(1)
        expect(scoreFromSemanticMatchType('partial')).toBe(0.82)
        expect(scoreFromSemanticMatchType('related')).toBe(0.68)
        expect(scoreFromSemanticMatchType('gap')).toBe(0)
    })

    it('normalizes LLM judgments and fills missing requirements as gaps', () => {
        const result = normalizeSemanticSkillJudgments(
            {
                results: [
                    {
                        requirement: 'Problem Solving',
                        matched: true,
                        matchType: 'related',
                        bestSkill: 'Hardware Troubleshooting',
                        reason: 'Hardware Troubleshooting demonstrates diagnosing faults and resolving issues, which supports problem solving.',
                    },
                ],
            },
            ['Problem Solving', 'TypeScript'],
        )

        expect(result.get('problem solving')).toEqual(expect.objectContaining({
            requirement: 'Problem Solving',
            matched: true,
            matchType: 'related',
            bestSkill: 'Hardware Troubleshooting',
            supportingSkills: ['Hardware Troubleshooting'],
            score: 0.68,
        }))
        expect(result.get('typescript')).toEqual(expect.objectContaining({
            requirement: 'TypeScript',
            matched: false,
            matchType: 'gap',
            supportingSkills: [],
            score: 0,
        }))
    })

    it('builds a prompt that instructs the model about specific-to-general matching', () => {
        const prompt = buildSemanticSkillJudgePrompt({
            requirements: ['Problem Solving'],
            userSkills: ['Hardware Troubleshooting'],
            profileSignals: [],
        })

        expect(prompt).toContain('Hardware Troubleshooting')
        expect(prompt).toContain('Problem Solving')
        expect(prompt).toContain('can support')
    })

    it('includes soft-skill examples and extra profile signals in the prompt', () => {
        const prompt = buildSemanticSkillJudgePrompt({
            requirements: ['Attention to Detail'],
            userSkills: ['Graphic Design'],
            profileSignals: ['Bachelor of Fine Arts', 'Graphic Designer at Studio One'],
        })

        expect(prompt).toContain('Graphic Design')
        expect(prompt).toContain('Attention to Detail')
        expect(prompt).toContain('precision, visual accuracy, layout consistency, and careful revision')
        expect(prompt).toContain('Graphic Designer at Studio One')
    })

    it('keeps all supporting skills returned by the LLM judgment', () => {
        const result = normalizeSemanticSkillJudgments({
            results: [
                {
                    requirement: 'Attention to Detail',
                    matched: true,
                    matchType: 'related',
                    supportingSkills: ['Graphic Design', 'Layout Design', 'Photo Manipulation'],
                    reason: 'These skills rely on precision and careful visual review.',
                },
            ],
        }, ['Attention to Detail'])

        expect(result.get('attention to detail')).toEqual(expect.objectContaining({
            supportingSkills: ['Graphic Design', 'Layout Design', 'Photo Manipulation'],
        }))
    })
})
