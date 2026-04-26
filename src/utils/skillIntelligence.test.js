import { describe, it, expect } from 'vitest'
import {
    filterByExperienceLevel,
    deduplicateSkillFamilies,
    getSmartPreferredSuggestions,
    getCrossCategorySkills,
    getCompanionSuggestions,
    SKILL_TIERS,
} from './skillIntelligence'

describe('filterByExperienceLevel', () => {
    it('keeps entry skills for entry-level job', () => {
        const skills = ['Welding', 'Food Preparation']
        expect(filterByExperienceLevel(skills, 'entry')).toEqual(skills)
    })

    it('drops senior skills from entry-level job', () => {
        // 4 skills so that filtering out 1 senior leaves 3 (no fallback)
        const skills = ['Welding', 'Site Supervision', 'Cooking', 'Food Preparation']
        const result = filterByExperienceLevel(skills, 'entry')
        expect(result).not.toContain('Site Supervision')
        expect(result).toContain('Welding')
        expect(result).toContain('Cooking')
    })

    it('drops senior but keeps mid for 1-3 year job', () => {
        // 4 skills so that filtering out 1 senior leaves 3 (no fallback)
        const skills = ['Welding', 'PLC Programming', 'Site Supervision', 'Cooking']
        const result = filterByExperienceLevel(skills, '1-3')
        expect(result).toContain('PLC Programming')
        expect(result).not.toContain('Site Supervision')
    })

    it('allows all tiers for 5+ year job', () => {
        const skills = ['Welding', 'PLC Programming', 'Site Supervision']
        expect(filterByExperienceLevel(skills, '5+')).toEqual(skills)
    })

    it('falls back to unfiltered input when result would have fewer than 3 skills', () => {
        // Only 2 skills, and one is senior — filtered would leave only 1 → triggers fallback
        const skills = ['Welding', 'Site Supervision']
        const result = filterByExperienceLevel(skills, 'entry')
        expect(result).toEqual(skills)
    })

    it('returns original list when level is null or undefined', () => {
        const skills = ['Welding', 'Site Supervision']
        expect(filterByExperienceLevel(skills, null)).toEqual(skills)
        expect(filterByExperienceLevel(skills, undefined)).toEqual(skills)
    })

    it('treats untagged skills as entry (always allowed)', () => {
        // 'Harvesting' is not in SKILL_TIERS, so it counts as entry
        const skills = ['Harvesting', 'Farming', 'Post-Harvest Handling']
        const result = filterByExperienceLevel(skills, 'entry')
        expect(result).toEqual(skills)
    })
})

describe('deduplicateSkillFamilies', () => {
    it('suppresses family siblings when canonical is already in existingSkills', () => {
        const candidates = ['Arc Welding', 'MIG Welding', 'Carpentry']
        const result = deduplicateSkillFamilies(candidates, ['Welding'])
        expect(result).not.toContain('Arc Welding')
        expect(result).not.toContain('MIG Welding')
        expect(result).toContain('Carpentry')
    })

    it('suppresses canonical when a variant is in existingSkills', () => {
        const candidates = ['Welding', 'Carpentry']
        const result = deduplicateSkillFamilies(candidates, ['Arc Welding'])
        expect(result).not.toContain('Welding')
        expect(result).toContain('Carpentry')
    })

    it('passes through skills not in any family', () => {
        const candidates = ['Customer Service', 'Food Safety']
        const result = deduplicateSkillFamilies(candidates, [])
        expect(result).toEqual(candidates)
    })

    it('returns empty array when all candidates are suppressed', () => {
        const candidates = ['Arc Welding', 'MIG Welding', 'TIG Welding']
        const result = deduplicateSkillFamilies(candidates, ['Welding'])
        expect(result).toEqual([])
    })

    it('is safe with empty candidates or existingSkills', () => {
        expect(deduplicateSkillFamilies([], ['Welding'])).toEqual([])
        expect(deduplicateSkillFamilies(['Carpentry'], [])).toEqual(['Carpentry'])
    })
})

describe('getSmartPreferredSuggestions', () => {
    it('returns empty array when requiredSkills is empty', () => {
        expect(getSmartPreferredSuggestions([], { category: 'trades', experienceLevel: 'entry' })).toEqual([])
        expect(getSmartPreferredSuggestions(null, {})).toEqual([])
        expect(getSmartPreferredSuggestions(undefined, {})).toEqual([])
    })

    it('returns companion preferred skills for a known required skill', () => {
        const result = getSmartPreferredSuggestions(['Welding'], { category: 'trades', experienceLevel: '5+' })
        const skills = result.map(r => r.skill)
        expect(skills).toContain('Safety Officer')
        expect(skills).toContain('TESDA NC II')
        expect(skills).toContain('Pipe Fitting')
    })

    it('ranks by complementCount descending', () => {
        // Safety Officer appears in both Welding and Masonry preferred companions
        const result = getSmartPreferredSuggestions(['Welding', 'Masonry'], { category: 'trades', experienceLevel: '5+' })
        const safetyOfficer = result.find(r => r.skill === 'Safety Officer')
        expect(safetyOfficer).toBeDefined()
        expect(safetyOfficer.complementCount).toBeGreaterThanOrEqual(2)
        // Highest-count item should be first
        if (result.length > 1) {
            expect(result[0].complementCount).toBeGreaterThanOrEqual(result[1].complementCount)
        }
    })

    it('excludes skills already in existingPreferred', () => {
        const result = getSmartPreferredSuggestions(['Welding'], {
            category: 'trades',
            experienceLevel: '5+',
            existingPreferred: ['Safety Officer'],
        })
        expect(result.map(r => r.skill)).not.toContain('Safety Officer')
    })

    it('excludes skills already in requiredSkills', () => {
        const result = getSmartPreferredSuggestions(['Welding', 'TESDA NC II'], { category: 'trades', experienceLevel: '5+' })
        expect(result.map(r => r.skill)).not.toContain('TESDA NC II')
    })

    it('includes reason string naming the source required skill', () => {
        const result = getSmartPreferredSuggestions(['Welding'], { category: 'trades', experienceLevel: '5+' })
        const item = result.find(r => r.skill === 'Safety Officer')
        expect(item?.reason).toContain('Welding')
    })
})

describe('getCrossCategorySkills', () => {
    it('returns empty for empty title', () => {
        expect(getCrossCategorySkills('', 'hospitality')).toEqual([])
        expect(getCrossCategorySkills(null, 'hospitality')).toEqual([])
    })

    it('fires manager trigger without whenPrimary restriction', () => {
        const result = getCrossCategorySkills('Operations Manager', 'energy')
        expect(result).toContain('Team Supervision')
        expect(result).toContain('KPI Tracking')
    })

    it('fires restaurant trigger only when primaryCategory is hospitality', () => {
        const hospitalityResult = getCrossCategorySkills('Restaurant Supervisor', 'hospitality')
        expect(hospitalityResult).toContain('Team Supervision')

        const retailResult = getCrossCategorySkills('Restaurant Supervisor', 'retail')
        // manager trigger still fires (no whenPrimary), but restaurant trigger does not
        const retailHasRestaurantItems = retailResult.includes('Staff Scheduling')
        // Staff Scheduling comes from restaurant trigger (hospitality only) — must not appear for retail
        // Note: it might appear via manager trigger if we ever add it there, so check restaurant-specific logic
        // The restaurant trigger has whenPrimary: ['hospitality'] — should not fire for retail
        const restaurantTriggerOnly = ['Staff Scheduling']
        const fired = restaurantTriggerOnly.filter(s => retailResult.includes(s))
        expect(fired).toEqual([])
    })

    it('fires technician trigger only when primaryCategory matches whenPrimary', () => {
        const energyResult = getCrossCategorySkills('Solar Technician', 'energy')
        expect(energyResult).toContain('Blueprint Reading')

        const retailResult = getCrossCategorySkills('Solar Technician', 'retail')
        expect(retailResult).not.toContain('Blueprint Reading')
    })

    it('deduplicates skills when multiple triggers fire', () => {
        const result = getCrossCategorySkills('IT Systems Manager', 'it')
        const unique = new Set(result)
        expect(unique.size).toBe(result.length)
    })
})

describe('getCompanionSuggestions', () => {
    it('returns empty for empty requiredSkills', () => {
        expect(getCompanionSuggestions([], 'trades')).toEqual([])
    })

    it('returns required-mode companions for a known skill', () => {
        const result = getCompanionSuggestions(['Welding'], 'trades')
        expect(result).toContain('Blueprint Reading')
        expect(result).toContain('Steel Fabrication')
    })

    it('does not return preferred-mode companions', () => {
        const result = getCompanionSuggestions(['Welding'], 'trades')
        // 'Safety Officer' is in preferred, not required — must not appear here
        expect(result).not.toContain('Safety Officer')
    })

    it('aggregates companions from multiple required skills without duplicates', () => {
        const result = getCompanionSuggestions(['Welding', 'Plumbing'], 'trades')
        const unique = new Set(result)
        expect(unique.size).toBe(result.length)
    })

    it('returns empty for unknown skills', () => {
        expect(getCompanionSuggestions(['UnknownSkill'], 'trades')).toEqual([])
    })
})
