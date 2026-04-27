import { describe, it, expect } from 'vitest'
import { buildResumeExportData, normalizeResumeData } from './resumeExport'

describe('resumeExport', () => {
  it('buildResumeExportData prefers live edit values and keeps auth-only fields', () => {
    const base = {
      email: 'saved@example.com',
      first_name: 'Saved',
      surname: 'User',
      profile_photo: 'https://example.com/old.jpg',
    }
    const override = {
      first_name: 'Live',
      middle_name: 'Draft',
      surname: 'User',
      skills: ['React'],
      profile_photo: '',
    }

    const result = buildResumeExportData(base, override)

    expect(result.email).toBe('saved@example.com')
    expect(result.full_name).toBe('Live Draft User')
    expect(result.profile_photo).toBe('https://example.com/old.jpg')
  })

  it('normalizeResumeData combines predefined and custom skills and formats related fields', () => {
    const result = normalizeResumeData({
      predefined_skills: ['Computer Literate'],
      skills: ['React', 'react'],
      sex: 'Male',
      civil_status: 'Single',
      date_of_birth: '2000-02-15',
      religion: 'Roman Catholic',
      work_experiences: [{ position: 'Developer', company: 'Acme', year_started: '2020', year_ended: '' }],
      professional_licenses: [{ name: 'PRC', number: '123', valid_until: '2026-06-01' }],
      vocational_training: [{ course: 'NC II', institution: 'TESDA', hours: '40' }],
      preferred_job_type: ['full-time'],
    })

    expect(result.skills).toEqual(['Computer Literate', 'React'])
    expect(result.workExperiences[0].duration).toBe('2020 - Present')
    expect(result.professionalLicenses[0].validUntil).toContain('2026')
    expect(result.vocationalTraining[0].course).toBe('NC II')
    expect(result.preferredJobTypes).toEqual(['Full Time'])
    expect(result.sex).toBe('Male')
    expect(result.civilStatus).toBe('Single')
    expect(result.dateOfBirth).toContain('2000')
  })
})
