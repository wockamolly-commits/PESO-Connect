import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { Step5SkillsExperience } from './Step5SkillsExperience'

vi.mock('../common/ResumeUpload', () => ({
  default: () => <div data-testid="resume-upload" />,
}))

vi.mock('../../services/skillDemandService', () => ({
  inferCategoryFromProfile: vi.fn(() => null),
  getTopDemandSkills: vi.fn(() => Promise.resolve([])),
}))

vi.mock('../../services/telemetryService', () => ({
  logSkillAcceptance: vi.fn(),
}))

const { deepAnalyzeProfileSkillsMock } = vi.hoisted(() => ({
  deepAnalyzeProfileSkillsMock: vi.fn(),
}))

vi.mock('../../services/geminiService', () => ({
  deepAnalyzeProfileSkills: deepAnalyzeProfileSkillsMock,
}))

vi.mock('../../utils/skillRecommender', () => ({
  generateSuggestedSkills: vi.fn(() => ({
    suggestions: ['Fallback Skill A', 'Fallback Skill B'],
    predefinedToCheck: ['Computer Literate'],
    reasons: ['course match'],
    groups: { core: [], practical: [], soft: [] },
  })),
  getSkillsForPosition: vi.fn(() => []),
}))

function makeFormData(overrides = {}) {
  return {
    predefined_skills: [],
    skills: [],
    work_experiences: [],
    vocational_training: [],
    course_or_field: 'BS Nursing',
    preferred_occupations: [],
    resume_url: '',
    portfolio_url: '',
    ...overrides,
  }
}

function renderStep(overrides = {}) {
  const setFormData = vi.fn()
  const handleChange = vi.fn()
  const setErrors = vi.fn()
  const formData = makeFormData(overrides)
  const utils = render(
    <Step5SkillsExperience
      formData={formData}
      setFormData={setFormData}
      handleChange={handleChange}
      setErrors={setErrors}
      userId="user-1"
      errors={{}}
    />
  )
  return { ...utils, setFormData, handleChange }
}

describe('Step5SkillsExperience — AI skill suggestions', () => {
  beforeEach(() => {
    deepAnalyzeProfileSkillsMock.mockReset()
  })

  it('does not show AI suggestions before the user clicks Generate', () => {
    renderStep()
    expect(screen.queryByText(/AI Suggested Profile Skills/i)).toBeNull()
    expect(screen.queryByText(/Skills To Consider Learning/i)).toBeNull()
    expect(screen.queryByText(/Suggested Skills From Your Profile/i)).toBeNull()
    expect(screen.getByRole('button', { name: /Generate AI skill suggestions/i })).toBeInTheDocument()
  })

  it('renders AI profileSkills and growthSkills after a successful AI response', async () => {
    deepAnalyzeProfileSkillsMock.mockResolvedValue({
      profileSkills: ['Patient Care', 'Vital Signs Monitoring'],
      growthSkills: ['IV Insertion'],
      warnings: [],
    })

    renderStep()
    fireEvent.click(screen.getByRole('button', { name: /Generate AI skill suggestions/i }))

    await waitFor(() => {
      expect(screen.getByText(/AI Suggested Profile Skills/i)).toBeInTheDocument()
    })
    expect(screen.getByText('Patient Care')).toBeInTheDocument()
    expect(screen.getByText('Vital Signs Monitoring')).toBeInTheDocument()

    expect(screen.getByText(/Skills To Consider Learning/i)).toBeInTheDocument()
    expect(
      screen.getByText(/only add them to your profile if you already have them/i)
    ).toBeInTheDocument()
    expect(screen.getByText('IV Insertion')).toBeInTheDocument()
  })

  it('filters out already-selected skills from AI suggestions', async () => {
    deepAnalyzeProfileSkillsMock.mockResolvedValue({
      profileSkills: ['Patient Care', 'Cooking'],
      growthSkills: [],
      warnings: [],
    })

    renderStep({ skills: ['Cooking'] })
    fireEvent.click(screen.getByRole('button', { name: /Generate AI skill suggestions/i }))

    const aiPanelHeader = await screen.findByText(/AI Suggested Profile Skills/i)
    const aiPanel = aiPanelHeader.closest('div')
    expect(aiPanel).toBeTruthy()
    expect(aiPanel.textContent).toContain('Patient Care')
    expect(aiPanel.textContent).not.toContain('Cooking')
  })

  it('shows an empty AI state when AI succeeds without new suggestions', async () => {
    deepAnalyzeProfileSkillsMock.mockResolvedValue({
      profileSkills: [],
      growthSkills: [],
      warnings: [],
    })

    renderStep()
    fireEvent.click(screen.getByRole('button', { name: /Generate AI skill suggestions/i }))

    await waitFor(() => {
      expect(screen.getByText(/No new suggestions\. Add more education or work experience details and try again\./i)).toBeInTheDocument()
    })
    expect(
      screen.queryByText(/AI suggestions were unavailable, so we used your course, training, and work experience/i)
    ).toBeNull()
    expect(screen.queryByText('Fallback Skill A')).toBeNull()
  })

  it('shows deterministic fallback when AI throws', async () => {
    deepAnalyzeProfileSkillsMock.mockRejectedValue(new Error('AI down'))

    renderStep()
    fireEvent.click(screen.getByRole('button', { name: /Generate AI skill suggestions/i }))

    await waitFor(() => {
      expect(screen.getByText(/Suggested Skills From Your Profile/i)).toBeInTheDocument()
    })
    expect(screen.getByText('Fallback Skill A')).toBeInTheDocument()
  })

  it('shows deterministic fallback when the AI helper returns an error result', async () => {
    deepAnalyzeProfileSkillsMock.mockResolvedValue({
      profileSkills: [],
      growthSkills: [],
      softSkills: [],
      warnings: [],
      error: 'AI service error (401): AI request was not authorized. Please sign in again and retry.',
    })

    renderStep()
    fireEvent.click(screen.getByRole('button', { name: /Generate AI skill suggestions/i }))

    await waitFor(() => {
      expect(screen.getByText(/Suggested Skills From Your Profile/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/AI service error \(401\)/i)).toBeInTheDocument()
    expect(screen.getByText('Fallback Skill A')).toBeInTheDocument()
  })
})

describe('Step5SkillsExperience — employer-demand panel', () => {
  beforeEach(() => {
    deepAnalyzeProfileSkillsMock.mockReset()
  })

  it('renders demand-side skills in a separate emerald panel labeled as employer-requested', async () => {
    const skillDemandService = await import('../../services/skillDemandService')
    skillDemandService.inferCategoryFromProfile.mockReturnValue('hospitality')
    skillDemandService.getTopDemandSkills.mockResolvedValue([
      { requirement: 'Food Safety', demand_count: 5 },
      { requirement: 'Table Service', demand_count: 3 },
    ])

    renderStep()

    await waitFor(() => {
      expect(
        screen.getByText(/Commonly requested by employers in hospitality/i)
      ).toBeInTheDocument()
    })
    expect(screen.getByText('Food Safety')).toBeInTheDocument()
    expect(
      screen.getByText(/Based on currently open job postings\. Only add these if you actually have them\./i)
    ).toBeInTheDocument()
  })
})
