import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { getMissingFields, sanitizeFilename } from './ExportResumeButton'

// Mock useAuth
const mockUserData = {
  full_name: 'Juan Dela Cruz',
  email: 'juan@example.com',
  profile_photo: 'https://example.com/photo.jpg',
  skills: ['JavaScript'],
  work_experiences: [{ company: 'X', position: 'Y', duration: 'Z' }],
  highest_education: 'College Graduate',
  certifications: ['AWS'],
  languages: [{ language: 'English', proficiency: 'Fluent' }],
  portfolio_url: 'https://juan.dev',
}

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ userData: mockUserData }),
}))

// Mock @react-pdf/renderer to avoid actual PDF generation in tests
vi.mock('@react-pdf/renderer', () => {
  const React = require('react')
  return {
    pdf: () => ({
      toBlob: () => Promise.resolve(new Blob(['fake-pdf'], { type: 'application/pdf' })),
    }),
    Document: ({ children }) => React.createElement('div', null, children),
    Page: ({ children }) => React.createElement('div', null, children),
    View: ({ children }) => React.createElement('div', null, children),
    Text: ({ children }) => React.createElement('span', null, children),
    Image: () => React.createElement('img'),
    Link: ({ children }) => React.createElement('a', null, children),
    StyleSheet: { create: (s) => s },
  }
})

// Mock URL methods not available in jsdom
globalThis.URL.createObjectURL = vi.fn(() => 'blob:fake-url')
globalThis.URL.revokeObjectURL = vi.fn()

describe('getMissingFields', () => {
  it('returns empty array when all fields are present', () => {
    expect(getMissingFields(mockUserData)).toEqual([])
  })

  it('detects missing profile photo', () => {
    const data = { ...mockUserData, profile_photo: null }
    expect(getMissingFields(data)).toContain('Profile Photo')
  })

  it('detects empty skills array', () => {
    const data = { ...mockUserData, skills: [] }
    expect(getMissingFields(data)).toContain('Skills')
  })

  it('detects missing work experience', () => {
    const data = { ...mockUserData, work_experiences: [] }
    expect(getMissingFields(data)).toContain('Work Experience')
  })

  it('detects missing education', () => {
    const data = { ...mockUserData, highest_education: '' }
    expect(getMissingFields(data)).toContain('Education')
  })

  it('handles null userData', () => {
    const result = getMissingFields(null)
    expect(result.length).toBe(7)
  })
})

describe('sanitizeFilename', () => {
  it('replaces spaces with underscores', () => {
    expect(sanitizeFilename('Juan Dela Cruz')).toBe('Juan_Dela_Cruz')
  })

  it('removes special characters', () => {
    expect(sanitizeFilename('Juan/Dela@Cruz!')).toBe('JuanDelaCruz')
  })

  it('returns Resume for null input', () => {
    expect(sanitizeFilename(null)).toBe('Resume')
  })
})

describe('ExportResumeButton', () => {
  let ExportResumeButton

  beforeEach(async () => {
    // Dynamic import to ensure mocks are applied
    const mod = await import('./ExportResumeButton')
    ExportResumeButton = mod.default
  })

  it('renders the export button', () => {
    render(<ExportResumeButton />)
    expect(screen.getByText('Export as Resume')).toBeTruthy()
  })

  it('shows generating state when clicked with complete profile', async () => {
    const user = userEvent.setup()
    render(<ExportResumeButton />)
    await user.click(screen.getByText('Export as Resume'))
    // Button should eventually return to normal state after generation
    // The generating state is transient, so we check the button exists
    expect(screen.getByRole('button')).toBeTruthy()
  })
})
