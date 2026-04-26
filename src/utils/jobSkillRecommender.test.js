import { describe, expect, it } from 'vitest'
import {
    getSuggestedSkillsFromDescription,
    getSuggestedSkillsFromTitle,
    getSuggestedSkillsFromVocab,
} from './jobSkillRecommender'

describe('jobSkillRecommender', () => {
    it('suggests full-stack web skills for junior web developer roles', () => {
        const titleSkills = getSuggestedSkillsFromTitle('Junior Full Stack Developer', 'it')

        expect(titleSkills).toEqual(expect.arrayContaining([
            'Web Development',
            'API Development',
            'Database Management',
            'JavaScript',
            'Git Version Control',
        ]))
        expect(titleSkills).not.toContain('Mobile App Development')
        expect(titleSkills).not.toContain('Data Entry')
    })

    it('extracts explicit web stack requirements from description without unrelated IT skills', () => {
        const description = `
            We are seeking a passionate Junior Full Stack Developer to build and maintain our web applications.
            Use React.js for responsive frontend components.
            Develop backend APIs and database schemas using Supabase or Firebase.
            Assist in maintaining CI/CD pipelines and deployment.
        `

        const skills = getSuggestedSkillsFromDescription(description)

        expect(skills).toEqual(expect.arrayContaining([
            'Web Development',
            'React',
            'API Development',
            'Database Management',
            'Agile/Scrum',
        ]))
        expect(skills).not.toContain('Data Entry')
        expect(skills).not.toContain('Technical Support')
        expect(skills).not.toContain('Backup and Recovery')
        expect(skills).not.toContain('Mobile App Development')
    })

    it('matches vocabulary conservatively for web developer responsibilities', () => {
        const skills = getSuggestedSkillsFromVocab(
            'Build responsive frontend components with React.js and maintain backend APIs and database schemas.',
            'it'
        )

        expect(skills).toEqual(expect.arrayContaining(['React']))
        expect(skills).not.toContain('Data Entry')
        expect(skills).not.toContain('Mobile App Development')
        expect(skills).not.toContain('Backup and Recovery')
    })

    it('keeps hospitality suggestions focused on restaurant operations', () => {
        const titleSkills = getSuggestedSkillsFromTitle('Restaurant Supervisor', 'hospitality')
        const descriptionSkills = getSuggestedSkillsFromDescription(`
            Supervise restaurant operations, handle guest relations, enforce food safety,
            and manage staff scheduling during daily service.
        `)

        expect(titleSkills).toEqual(expect.arrayContaining([
            'Restaurant Management',
            'Food Cost Control',
            'Staff Scheduling',
        ]))
        expect(descriptionSkills).toEqual(expect.arrayContaining([
            'Guest Relations',
            'Food Safety',
            'Staff Scheduling',
            'Restaurant Management',
        ]))
        expect(descriptionSkills).not.toContain('Mobile App Development')
        expect(descriptionSkills).not.toContain('Data Entry')
    })

    it('does not suggest JavaScript for a Java-only job title', () => {
        const skills = getSuggestedSkillsFromTitle('Java Developer', 'it')
        expect(skills).toContain('Java')
        expect(skills).not.toContain('JavaScript')
    })

    it('does not suggest JavaScript for a Java-only description', () => {
        const skills = getSuggestedSkillsFromDescription(
            'Must have 3 years of Java experience. Will work with Spring Boot and SQL databases.'
        )
        expect(skills).not.toContain('JavaScript')
    })

    it('does suggest JavaScript for a JavaScript description', () => {
        const skills = getSuggestedSkillsFromDescription(
            'Build frontend interfaces using JavaScript and React. Node.js backend experience is a plus.'
        )
        expect(skills).toContain('JavaScript')
        expect(skills).not.toContain('Java')
    })

    it('does not suggest JavaScript for a JavaScript-title job via the Java title pattern', () => {
        const skills = getSuggestedSkillsFromTitle('JavaScript Developer', 'it')
        expect(skills).not.toContain('Java')
        expect(skills).toContain('JavaScript')
    })

    it('keeps skilled-trades suggestions focused on electrical work', () => {
        const titleSkills = getSuggestedSkillsFromTitle('Electrical Technician', 'trades')
        const descriptionSkills = getSuggestedSkillsFromDescription(`
            Install electrical wiring, read blueprints, inspect control panels,
            and follow occupational safety procedures on site.
        `)

        expect(titleSkills).toEqual(expect.arrayContaining([
            'Electrical Work',
            'Electrical Wiring',
        ]))
        expect(descriptionSkills).toEqual(expect.arrayContaining([
            'Electrical Work',
            'Blueprint Reading',
            'Safety Officer',
        ]))
        expect(descriptionSkills).not.toContain('Customer Service')
        expect(descriptionSkills).not.toContain('Data Analysis')
    })
})
