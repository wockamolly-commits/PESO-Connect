import { describe, it, expect } from 'vitest'
import { generateSuggestedSkills, getSkillsForPosition, getSkillsForCourse, getSkillsForTraining } from './skillRecommender'
import coursesData from '../data/courses.json'

describe('generateSuggestedSkills', () => {
  it('returns empty result for blank input', () => {
    const result = generateSuggestedSkills({})
    expect(result.suggestions).toEqual([])
    expect(result.predefinedToCheck).toEqual([])
    expect(result.reasons).toEqual([])
  })

  it('maps a nursing course + staff nurse position to healthcare skills', () => {
    const result = generateSuggestedSkills({
      course_or_field: 'Bachelor of Science in Nursing',
      work_experiences: [{ position: 'Staff Nurse' }],
    })
    expect(result.suggestions).toContain('Patient Care')
    expect(result.suggestions).toContain('Clinical Assessment')
    expect(result.suggestions).toContain('First Aid')
    expect(result.reasons).toContain('Bachelor of Science in Nursing')
    expect(result.reasons).toContain('Staff Nurse')
  })

  it('maps CS course to programming skills and adds Computer Literate predefined', () => {
    const result = generateSuggestedSkills({
      course_or_field: 'Bachelor of Science in Computer Science',
    })
    expect(result.suggestions).toContain('Programming')
    expect(result.suggestions).toContain('Web Development')
    expect(result.predefinedToCheck).toContain('Computer Literate')
  })

  it('maps trades experience to predefined skills', () => {
    const result = generateSuggestedSkills({
      work_experiences: [
        { position: 'Electrician Helper' },
        { position: 'Carpenter' },
      ],
    })
    expect(result.predefinedToCheck).toEqual(
      expect.arrayContaining(['Electrician', 'Carpentry Work'])
    )
  })

  it('maps TESDA vocational training courses', () => {
    const result = generateSuggestedSkills({
      vocational_training: [
        { course: 'Shielded Metal Arc Welding NC II' },
        { course: 'Caregiving NC II' },
      ],
    })
    expect(result.suggestions).toEqual(
      expect.arrayContaining(['Welding', 'Arc Welding', 'Patient Care', 'First Aid'])
    )
    expect(result.predefinedToCheck).toContain('Domestic Chores')
  })

  it('deduplicates skills across multiple signals', () => {
    const result = generateSuggestedSkills({
      course_or_field: 'BSN Nursing',
      work_experiences: [{ position: 'Nurse' }],
      vocational_training: [{ course: 'Caregiving' }],
    })
    const uniq = new Set(result.suggestions)
    expect(uniq.size).toBe(result.suggestions.length)
  })

  it('never returns a predefined skill inside suggestions (avoids duplication)', () => {
    const result = generateSuggestedSkills({
      work_experiences: [{ position: 'Electrician' }, { position: 'Driver' }],
    })
    const predefined = ['Auto Mechanic', 'Beautician', 'Carpentry Work', 'Computer Literate',
      'Domestic Chores', 'Driver', 'Electrician', 'Embroidery', 'Gardening', 'Masonry',
      'Painter/Artist', 'Painting Jobs', 'Photography', 'Plumbing', 'Sewing/Dresses',
      'Stenography', 'Tailoring']
    result.suggestions.forEach(s => expect(predefined).not.toContain(s))
  })

  it('tolerates missing/malformed array fields', () => {
    expect(() => generateSuggestedSkills({
      work_experiences: null,
      vocational_training: undefined,
      preferred_occupations: 'not-an-array',
    })).not.toThrow()
  })

  it('returns grouped suggestions (core / practical / soft) for a course', () => {
    const result = generateSuggestedSkills({
      course_or_field: 'Bachelor of Science in Psychology',
    })
    expect(result.groups).toBeDefined()
    expect(result.groups.core.length).toBeGreaterThan(0)
    expect(result.groups.practical).toEqual(
      expect.arrayContaining(['Customer Service', 'HR Support', 'Interviewing Skills', 'Case Handling'])
    )
    expect(result.groups.soft).toEqual(
      expect.arrayContaining(['Empathy', 'Active Listening'])
    )
  })

  it('injects universal soft skills whenever a signal exists', () => {
    const result = generateSuggestedSkills({
      course_or_field: 'Bachelor of Science in Computer Science',
    })
    expect(result.groups.soft).toEqual(
      expect.arrayContaining(['Communication Skills', 'Teamwork', 'Adaptability'])
    )
  })

  it('omits soft skills entirely when there is no signal', () => {
    const result = generateSuggestedSkills({})
    expect(result.groups.core).toEqual([])
    expect(result.groups.practical).toEqual([])
    expect(result.groups.soft).toEqual([])
  })

  it('keeps skills in exactly one group (core > practical > soft)', () => {
    const result = generateSuggestedSkills({
      course_or_field: 'Bachelor of Science in Nursing',
      work_experiences: [{ position: 'Staff Nurse' }],
    })
    const { core, practical, soft } = result.groups
    const all = [...core, ...practical, ...soft]
    expect(new Set(all).size).toBe(all.length)
  })

  it('uses preferred_occupations as a fallback signal', () => {
    const result = generateSuggestedSkills({
      preferred_occupations: ['Cashier', 'Cook'],
    })
    expect(result.suggestions).toEqual(
      expect.arrayContaining(['Cashiering', 'Cooking'])
    )
  })
})

describe('getSkillsForPosition', () => {
  it('returns empty array for blank/invalid input', () => {
    expect(getSkillsForPosition('')).toEqual([])
    expect(getSkillsForPosition('   ')).toEqual([])
    expect(getSkillsForPosition(null)).toEqual([])
    expect(getSkillsForPosition(undefined)).toEqual([])
  })

  it('suggests healthcare skills for "Staff Nurse"', () => {
    const skills = getSkillsForPosition('Staff Nurse')
    expect(skills).toContain('Patient Care')
    expect(skills).toContain('First Aid')
  })

  it('surfaces matching predefined skills first for "Electrician"', () => {
    const skills = getSkillsForPosition('Electrician Helper')
    expect(skills[0]).toBe('Electrician')
  })

  it('caps results at 6 to keep inline UI compact', () => {
    const skills = getSkillsForPosition('Staff Nurse')
    expect(skills.length).toBeLessThanOrEqual(6)
  })

  it('returns empty array for unknown position', () => {
    expect(getSkillsForPosition('Unicorn Whisperer')).toEqual([])
  })
})

describe('getSkillsForCourse', () => {
  it('returns empty for blank input', () => {
    expect(getSkillsForCourse('')).toEqual([])
    expect(getSkillsForCourse(null)).toEqual([])
  })

  it('maps BS Nursing to healthcare skills', () => {
    const skills = getSkillsForCourse('Bachelor of Science in Nursing')
    expect(skills).toContain('Patient Care')
    expect(skills.length).toBeLessThanOrEqual(6)
  })

  it('maps Home Economics to domestic predefined skills first', () => {
    const skills = getSkillsForCourse('Home Economics')
    expect(skills.slice(0, 3)).toEqual(expect.arrayContaining(['Domestic Chores']))
  })

  it('covers every course in courses.json (coverage regression guard)', () => {
    const allCourses = [
      ...coursesData.seniorHigh.flatMap(c => c.courses),
      ...coursesData.tertiary.flatMap(c => c.courses),
      ...coursesData.graduate.flatMap(c => c.courses),
    ]
    const uncovered = allCourses.filter(course => getSkillsForCourse(course).length === 0)
    expect(uncovered).toEqual([])
  })

  it('is case- and whitespace-insensitive for exact matches', () => {
    const canonical = getSkillsForCourse('Bachelor of Science in Nursing')
    const messy = getSkillsForCourse('  bachelor   of  science in nursing  ')
    expect(messy).toEqual(canonical)
  })

  it('Medical Technology routes to lab skills, not generic clinical', () => {
    const skills = getSkillsForCourse('Bachelor of Science in Medical Technology')
    expect(skills).toContain('Laboratory Testing')
    expect(skills).toContain('Specimen Handling')
  })

  it('Industrial Engineering returns IE skills, not mechanical', () => {
    const skills = getSkillsForCourse('Bachelor of Science in Industrial Engineering')
    expect(skills).toContain('Process Improvement')
    expect(skills).not.toContain('HVAC')
  })

  it('Chemical Engineering returns chemical/lab skills', () => {
    const skills = getSkillsForCourse('Bachelor of Science in Chemical Engineering')
    expect(skills).toContain('Chemical Process Control')
    expect(skills).toContain('Laboratory Testing')
  })

  it('MBA returns leadership/management skills', () => {
    const skills = getSkillsForCourse('Master of Business Administration (MBA)')
    expect(skills).toContain('Leadership')
    expect(skills).toContain('Project Management')
  })

  it('Tourism Management returns hospitality skills', () => {
    const skills = getSkillsForCourse('Bachelor of Science in Tourism Management')
    expect(skills).toContain('Customer Service')
    expect(skills).toContain('Tour Coordination')
  })

  it('STEM strand returns scientific method skills (not just filler)', () => {
    const skills = getSkillsForCourse('STEM (Science, Technology, Engineering and Mathematics)')
    expect(skills).toContain('Scientific Method')
    expect(skills).toContain('Research Methods')
  })

  it('Philosophy returns critical thinking and writing', () => {
    const skills = getSkillsForCourse('Bachelor of Arts in Philosophy')
    expect(skills).toContain('Critical Thinking')
    expect(skills).toContain('Academic Writing')
  })

  it('Geology returns geoscience skills', () => {
    const skills = getSkillsForCourse('Bachelor of Science in Geology')
    expect(skills).toContain('Geological Mapping')
  })

  it('Interior Design returns design/CAD skills', () => {
    const skills = getSkillsForCourse('Bachelor of Science in Interior Design')
    expect(skills).toContain('Interior Design')
    expect(skills).toContain('AutoCAD')
  })

  it('Occupational Therapy is distinct from Physical Therapy', () => {
    const skills = getSkillsForCourse('Bachelor of Science in Occupational Therapy')
    expect(skills).toContain('Occupational Therapy')
  })

  it('unknown free-text course falls back gracefully (may be empty)', () => {
    const skills = getSkillsForCourse('Bachelor of Underwater Basket Weaving')
    expect(Array.isArray(skills)).toBe(true)
  })
})

describe('getSkillsForTraining', () => {
  it('returns empty for blank input', () => {
    expect(getSkillsForTraining('')).toEqual([])
  })

  it('maps welding training to welding-family skills', () => {
    const skills = getSkillsForTraining('Shielded Metal Arc Welding NC II')
    expect(skills).toEqual(expect.arrayContaining(['Welding', 'Arc Welding']))
  })

  it('maps caregiving training to care skills with predefined first', () => {
    const skills = getSkillsForTraining('Caregiving NC II')
    expect(skills).toContain('Domestic Chores')
    expect(skills).toContain('Patient Care')
  })
})
