import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'

// Mock Firebase
const mockAddDoc = vi.fn()
vi.mock('../../config/firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  addDoc: (...args) => mockAddDoc(...args),
}))

// Mock useAuth
const mockUseAuth = vi.fn()
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

import PostJobWizard from './PostJob'

function renderPostJob() {
  return render(
    <BrowserRouter>
      <PostJobWizard />
    </BrowserRouter>
  )
}

// Helper to navigate past step 1
async function fillAndPassStep1(user) {
  await user.type(
    screen.getByPlaceholderText('e.g. Electrician, Plumber, Welder'),
    'Plumber'
  )
  await user.click(screen.getByText('Skilled Trades'))
  await user.click(screen.getByRole('button', { name: /continue/i }))

  // Wait for step 2 to render (salary placeholder is step-2-only)
  await waitFor(() => {
    expect(screen.getByPlaceholderText('Minimum')).toBeInTheDocument()
  })
}

describe('PostJob wizard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({
      currentUser: { uid: 'emp-1' },
      userData: { name: 'Test Employer', role: 'employer', is_verified: true },
      isVerified: () => true,
    })
  })

  it('shows verification required when employer is not verified', () => {
    mockUseAuth.mockReturnValue({
      currentUser: { uid: 'emp-1' },
      userData: { name: 'Test', role: 'employer', is_verified: false },
      isVerified: () => false,
    })

    renderPostJob()

    expect(screen.getByText('Verification Required')).toBeInTheDocument()
  })

  it('renders step 1 (Basic Info) by default', () => {
    renderPostJob()

    expect(screen.getByText('Basic Information')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('e.g. Electrician, Plumber, Welder')).toBeInTheDocument()
    // Category buttons should be visible
    expect(screen.getByText('Skilled Trades')).toBeInTheDocument()
    expect(screen.getByText('Hospitality')).toBeInTheDocument()
  })

  it('validates step 1 requires title and category', async () => {
    const user = userEvent.setup()
    renderPostJob()

    await user.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => {
      expect(screen.getByText('Job title is required')).toBeInTheDocument()
      expect(screen.getByText('Please select a category')).toBeInTheDocument()
    })
  })

  it('proceeds to step 2 when step 1 is valid', async () => {
    const user = userEvent.setup()
    renderPostJob()

    await user.type(
      screen.getByPlaceholderText('e.g. Electrician, Plumber, Welder'),
      'Senior Plumber'
    )
    await user.click(screen.getByText('Skilled Trades'))
    await user.click(screen.getByRole('button', { name: /continue/i }))

    // Step 2 content: salary fields
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Minimum')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Maximum')).toBeInTheDocument()
    })
  })

  it('validates step 2 requires salary and description', async () => {
    const user = userEvent.setup()
    renderPostJob()

    await fillAndPassStep1(user)

    // Try to proceed step 2 without data
    await user.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => {
      expect(screen.getByText(/valid minimum salary/i)).toBeInTheDocument()
    })
  })

  it('can navigate back from step 2 to step 1', async () => {
    const user = userEvent.setup()
    renderPostJob()

    await fillAndPassStep1(user)

    // Go back
    await user.click(screen.getByRole('button', { name: /back/i }))

    await waitFor(() => {
      expect(screen.getByDisplayValue('Plumber')).toBeInTheDocument()
    })
  })
})
