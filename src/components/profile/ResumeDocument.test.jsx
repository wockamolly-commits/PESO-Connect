import { describe, it, expect, vi } from 'vitest'

// Mock @react-pdf/renderer with simple HTML elements so jsdom can render them
vi.mock('@react-pdf/renderer', () => {
  const React = require('react')
  const createComponent = (name) => ({ children, ...props }) =>
    React.createElement(name === 'Document' || name === 'Page' ? 'div' : 'span', {
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

import { render, screen } from '@testing-library/react'
import ResumeDocument from './ResumeDocument'

const fullUserData = {
  full_name: 'Juan Dela Cruz',
  email: 'juan@example.com',
  mobile_number: '0917-123-4567',
  city: 'Makati',
  province: 'Metro Manila',
  profile_photo: 'https://example.com/photo.jpg',
  skills: ['JavaScript', 'React', 'Node.js'],
  languages: [
    { language: 'English', proficiency: 'Fluent' },
    { language: 'Filipino', proficiency: 'Native' },
  ],
  work_experiences: [
    { company: 'TechCorp', position: 'Frontend Developer', duration: 'Jan 2023 - Present' },
  ],
  highest_education: 'College Graduate',
  school_name: 'UP Diliman',
  course_or_field: 'Computer Science',
  year_graduated: '2022',
  certifications: ['AWS Certified'],
  portfolio_url: 'https://juan.dev',
}

describe('ResumeDocument', () => {
  it('renders with full user data without crashing', () => {
    const { container } = render(<ResumeDocument userData={fullUserData} />)
    expect(container.textContent).toContain('Juan Dela Cruz')
    expect(container.textContent).toContain('juan@example.com')
    expect(container.textContent).toContain('JavaScript')
    expect(container.textContent).toContain('Frontend Developer')
    expect(container.textContent).toContain('College Graduate')
    expect(container.textContent).toContain('AWS Certified')
  })

  it('renders initials when profile_photo is null', () => {
    const data = { ...fullUserData, profile_photo: null }
    const { container } = render(<ResumeDocument userData={data} />)
    expect(container.textContent).toContain('JC')
  })

  it('omits work experience section when empty', () => {
    const data = { ...fullUserData, work_experiences: [] }
    const { container } = render(<ResumeDocument userData={data} />)
    expect(container.textContent).not.toContain('Work Experience')
  })

  it('omits certifications section when empty', () => {
    const data = { ...fullUserData, certifications: [] }
    const { container } = render(<ResumeDocument userData={data} />)
    expect(container.textContent).not.toContain('Certifications')
  })

  it('omits skills section when empty', () => {
    const data = { ...fullUserData, skills: [] }
    const { container } = render(<ResumeDocument userData={data} />)
    expect(container.textContent).not.toContain('Skills')
  })

  it('omits portfolio section when no URL', () => {
    const data = { ...fullUserData, portfolio_url: '' }
    const { container } = render(<ResumeDocument userData={data} />)
    expect(container.textContent).not.toContain('Portfolio')
  })

  it('omits languages section when empty', () => {
    const data = { ...fullUserData, languages: [] }
    const { container } = render(<ResumeDocument userData={data} />)
    expect(container.textContent).not.toContain('Languages')
  })

  it('renders location as city, province', () => {
    const { container } = render(<ResumeDocument userData={fullUserData} />)
    expect(container.textContent).toContain('Makati, Metro Manila')
  })

  it('handles null userData gracefully', () => {
    const { container } = render(<ResumeDocument userData={null} />)
    expect(container).toBeTruthy()
  })
})
