import { describe, it, expect, vi } from 'vitest'

vi.mock('@react-pdf/renderer', () => {
  const React = require('react')
  const createComponent = (name) => ({ children, ...props }) =>
    React.createElement(name === 'Document' || name === 'Page' || name === 'View' ? 'div' : 'span', {
      'data-testid': name.toLowerCase(),
      ...props,
    }, children)
  return {
    Document: createComponent('Document'),
    Page: createComponent('Page'),
    View: createComponent('View'),
    Text: createComponent('Text'),
    Image: createComponent('Image'),
    Link: ({ children, src, ...props }) =>
      React.createElement('a', { href: src, ...props }, children),
    StyleSheet: { create: (s) => s },
  }
})

import { render } from '@testing-library/react'
import ResumeDocument from './ResumeDocument'

const fullUserData = {
  first_name: 'Juan',
  middle_name: 'Santos',
  surname: 'Dela Cruz',
  suffix: 'Jr.',
  email: 'juan@example.com',
  mobile_number: '0917-123-4567',
  street_address: '123 Mabini St.',
  barangay: 'Poblacion',
  city: 'Makati',
  province: 'Metro Manila',
  sex: 'Male',
  civil_status: 'Single',
  date_of_birth: '2000-02-15',
  religion: 'Roman Catholic',
  profile_photo: 'https://example.com/photo.jpg',
  predefined_skills: ['Computer Literate'],
  skills: ['JavaScript', 'React', 'Node.js'],
  languages: [
    { language: 'English', proficiency: 'Fluent' },
    { language: 'Filipino', proficiency: 'Native' },
  ],
  work_experiences: [
    {
      company: 'TechCorp',
      position: 'Frontend Developer',
      year_started: '2023',
      year_ended: '',
      employment_status: 'Permanent',
      address: 'Taguig City',
    },
  ],
  highest_education: 'Tertiary',
  school_name: 'UP Diliman',
  course_or_field: 'Computer Science',
  year_graduated: '2022',
  vocational_training: [
    {
      course: 'Web Development NC III',
      institution: 'TESDA',
      hours: '120',
      skills_acquired: 'HTML, CSS, JavaScript',
      certificate_level: 'NC III',
    },
  ],
  professional_licenses: [
    { name: 'PRC License', number: '12345', valid_until: '2027-05-01' },
  ],
  civil_service_eligibility: 'Professional',
  civil_service_date: '2023-08-15',
  certifications: ['AWS Certified'],
  portfolio_url: 'https://juan.dev',
  preferred_job_type: ['full-time', 'contractual'],
  preferred_occupations: ['Frontend Developer', 'Web Developer'],
  preferred_local_locations: ['Makati', 'Taguig'],
  preferred_overseas_locations: ['Singapore'],
  expected_salary_min: '20000',
  expected_salary_max: '35000',
  willing_to_relocate: 'yes',
  employment_status: 'Employed',
}

describe('ResumeDocument', () => {
  it('renders normalized resume data without crashing', () => {
    const { container } = render(<ResumeDocument userData={fullUserData} />)
    expect(container.textContent).toContain('Juan Santos Dela Cruz Jr.')
    expect(container.textContent).toContain('juan@example.com')
    expect(container.textContent).toContain('Computer Literate')
    expect(container.textContent).toContain('Frontend Developer')
    expect(container.textContent).toContain('TechCorp')
    expect(container.textContent).toContain('2023 - Present')
    expect(container.textContent).toContain('P E R S O N A L   P R O F I L E')
    expect(container.textContent).toContain('W O R K   E X P E R I E N C E')
    expect(container.textContent).toContain('E D U C A T I O N')
    expect(container.textContent).toContain('V O C A T I O N A L   T R A I N I N G')
    expect(container.textContent).toContain('C A R E E R   P R E F E R E N C E S')
    expect(container.textContent).toContain('Tertiary — Computer Science')
    expect(container.textContent).toContain('Web Development NC III')
    expect(container.textContent).toContain('PRC License')
    expect(container.textContent).toContain('AWS Certified')
    expect(container.textContent).toContain('SEX')
    expect(container.textContent).toContain('Male')
    expect(container.textContent).toContain('CIVIL STATUS')
    expect(container.textContent).toContain('Single')
    expect(container.textContent).toContain('TARGET ROLES Frontend Developer | Web Developer')
  })

  it('renders initials when profile_photo is null', () => {
    const data = { ...fullUserData, profile_photo: null }
    const { container } = render(<ResumeDocument userData={data} />)
    expect(container.textContent).toContain('JJ')
  })

  it('omits work experience section when empty', () => {
    const data = { ...fullUserData, work_experiences: [] }
    const { container } = render(<ResumeDocument userData={data} />)
    expect(container.textContent).not.toContain('Work Experience')
  })

  it('omits licenses and certifications section when both are empty', () => {
    const data = {
      ...fullUserData,
      professional_licenses: [],
      certifications: [],
      civil_service_eligibility: '',
      civil_service_date: '',
    }
    const { container } = render(<ResumeDocument userData={data} />)
    expect(container.textContent).not.toContain('Licenses and Certifications')
  })

  it('renders full address in the contact block', () => {
    const { container } = render(<ResumeDocument userData={fullUserData} />)
    expect(container.textContent).toContain('123 Mabini St., Poblacion, Makati, Metro Manila')
  })

  it('handles null userData gracefully', () => {
    const { container } = render(<ResumeDocument userData={null} />)
    expect(container).toBeTruthy()
  })
})
