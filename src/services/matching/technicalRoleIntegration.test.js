import { describe, expect, it } from 'vitest'
import { calculateDeterministicScore } from './deterministicScore'

// Synthetic profile: only "Hardware Troubleshooting" — zero software skills
const hardwareProfile = {
  predefined_skills: ['Hardware Troubleshooting'],
  skills: [],
  skill_aliases: {},
  work_experiences: [],
  experience_categories: ['IT Support'],
  highest_education: 'College Graduate',
  course_or_field: '',
  languages: [],
  date_of_birth: null,
}

const reactDeveloperJob = {
  title: 'React Developer',
  category: 'Software Development',
  requirements: ['React', 'JavaScript', 'HTML', 'CSS', 'Git'],
  required_skills: ['React', 'JavaScript', 'HTML', 'CSS', 'Git'],
  preferred_skills: ['TypeScript', 'Node.js'],
  experience_level: 'mid',
  education_level: 'College Graduate',
}

const technicalSupportJob = {
  title: 'Technical Support Representative',
  category: 'IT Support',
  requirements: ['Hardware Troubleshooting', 'Customer Service', 'Computer Literacy'],
  required_skills: ['Hardware Troubleshooting', 'Customer Service', 'Computer Literacy'],
  preferred_skills: [],
  experience_level: 'entry',
  education_level: 'College Graduate',
}

describe('headline success metric — Hardware candidate vs technical roles', () => {
  it('scores < 40 against React Developer (deterministic layer)', () => {
    const result = calculateDeterministicScore(reactDeveloperJob, hardwareProfile)
    expect(result.matchScore).toBeLessThan(40)
  })

  it('scores > 50 against Technical Support (deterministic layer)', () => {
    const result = calculateDeterministicScore(technicalSupportJob, hardwareProfile)
    expect(result.matchScore).toBeGreaterThan(50)
  })

  it('React Developer match has React in missingSkills', () => {
    const result = calculateDeterministicScore(reactDeveloperJob, hardwareProfile)
    expect(result.missingSkills.some((s) => /react/i.test(s))).toBe(true)
  })

  it('React Developer match has JavaScript in missingSkills', () => {
    const result = calculateDeterministicScore(reactDeveloperJob, hardwareProfile)
    expect(result.missingSkills.some((s) => /javascript/i.test(s))).toBe(true)
  })

  it('Technical Support match has Hardware Troubleshooting in matchingSkills', () => {
    const result = calculateDeterministicScore(technicalSupportJob, hardwareProfile)
    expect(result.matchingSkills.some((s) => /hardware/i.test(s))).toBe(true)
  })
})
