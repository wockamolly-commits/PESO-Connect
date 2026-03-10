import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'

// Mock Supabase
const mockSupabaseResponse = vi.fn()
vi.mock('../config/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => mockSupabaseResponse(),
        }),
      }),
    }),
  },
}))

// Mock useAuth
const mockUseAuth = vi.fn()
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

import MyApplications from './MyApplications'

function renderMyApplications() {
  return render(
    <BrowserRouter>
      <MyApplications />
    </BrowserRouter>
  )
}

describe('MyApplications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows empty state when no applications exist', async () => {
    mockUseAuth.mockReturnValue({ currentUser: { uid: 'user-1' } })
    mockSupabaseResponse.mockReturnValue({ data: [], error: null })

    renderMyApplications()

    await waitFor(() => {
      expect(screen.getByText(/you have not applied to any jobs yet/i)).toBeInTheDocument()
    })

    expect(screen.getByRole('link', { name: /browse jobs/i })).toBeInTheDocument()
  })

  it('displays applications with correct data', async () => {
    mockUseAuth.mockReturnValue({ currentUser: { uid: 'user-1' } })
    mockSupabaseResponse.mockReturnValue({
      data: [
        {
          id: 'app-1',
          job_id: 'job-1',
          job_title: 'Senior Plumber',
          user_id: 'user-1',
          status: 'pending',
          created_at: '2026-01-15T00:00:00.000Z',
        },
        {
          id: 'app-2',
          job_id: 'job-2',
          job_title: 'Electrician',
          user_id: 'user-1',
          status: 'shortlisted',
          created_at: '2026-01-10T00:00:00.000Z',
        },
      ],
      error: null,
    })

    renderMyApplications()

    await waitFor(() => {
      expect(screen.getByText('Senior Plumber')).toBeInTheDocument()
    })

    expect(screen.getByText('Electrician')).toBeInTheDocument()
  })

  it('displays correct stats', async () => {
    mockUseAuth.mockReturnValue({ currentUser: { uid: 'user-1' } })
    mockSupabaseResponse.mockReturnValue({
      data: [
        { id: 'a1', job_title: 'Job 1', status: 'pending', created_at: '2026-01-01' },
        { id: 'a2', job_title: 'Job 2', status: 'shortlisted', created_at: '2026-01-02' },
        { id: 'a3', job_title: 'Job 3', status: 'hired', created_at: '2026-01-03' },
      ],
      error: null,
    })

    renderMyApplications()

    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument() // Total
    })

    // Check individual stats exist
    expect(screen.getByText('Total Applied')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.getByText('Shortlisted')).toBeInTheDocument()
    expect(screen.getByText('Hired')).toBeInTheDocument()
  })

  it('shows loading skeleton initially', () => {
    mockUseAuth.mockReturnValue({ currentUser: { uid: 'user-1' } })
    mockSupabaseResponse.mockReturnValue(new Promise(() => {})) // never resolves

    renderMyApplications()

    // Skeleton loading cards have animate-pulse class
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })
})
