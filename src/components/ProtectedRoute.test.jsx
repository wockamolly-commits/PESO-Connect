import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'

// Mock useAuth - we'll change return values per test
const mockUseAuth = vi.fn()
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

function renderProtected({
  requireVerified = false,
  allowedRoles = [],
  initialRoute = '/protected',
} = {}) {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route
          path="/protected"
          element={
            <ProtectedRoute requireVerified={requireVerified} allowedRoles={allowedRoles}>
              <div>Protected Content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/unauthorized" element={<div>Unauthorized Page</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockUseAuth.mockReset()
  })

  it('shows loading spinner when auth is loading', () => {
    mockUseAuth.mockReturnValue({
      currentUser: null,
      userData: null,
      loading: true,
      isVerified: () => false,
    })

    renderProtected()

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('redirects to /login when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      currentUser: null,
      userData: null,
      loading: false,
      isVerified: () => false,
    })

    renderProtected()

    expect(screen.getByText('Login Page')).toBeInTheDocument()
  })

  it('renders children when user is authenticated', () => {
    mockUseAuth.mockReturnValue({
      currentUser: { uid: 'user-1' },
      userData: { role: 'jobseeker' },
      loading: false,
      isVerified: () => true,
    })

    renderProtected()

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('redirects to /unauthorized when user role is not in allowedRoles', () => {
    mockUseAuth.mockReturnValue({
      currentUser: { uid: 'user-1' },
      userData: { role: 'jobseeker' },
      loading: false,
      isVerified: () => false,
    })

    renderProtected({ allowedRoles: ['admin'] })

    expect(screen.getByText('Unauthorized Page')).toBeInTheDocument()
  })

  it('allows access when user role is in allowedRoles', () => {
    mockUseAuth.mockReturnValue({
      currentUser: { uid: 'emp-1' },
      userData: { role: 'employer' },
      loading: false,
      isVerified: () => true,
    })

    renderProtected({ allowedRoles: ['employer', 'admin'] })

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('shows pending verification message when requireVerified and not verified', () => {
    mockUseAuth.mockReturnValue({
      currentUser: { uid: 'emp-1' },
      userData: { role: 'employer', employer_status: 'pending' },
      loading: false,
      isVerified: () => false,
    })

    renderProtected({ requireVerified: true })

    expect(screen.getByText('Account Pending Verification')).toBeInTheDocument()
  })

  it('shows rejection message with reason when employer is rejected', () => {
    mockUseAuth.mockReturnValue({
      currentUser: { uid: 'emp-1' },
      userData: {
        role: 'employer',
        employer_status: 'rejected',
        rejection_reason: 'Invalid business permit',
      },
      loading: false,
      isVerified: () => false,
    })

    renderProtected({ requireVerified: true })

    expect(screen.getByText('Registration Rejected')).toBeInTheDocument()
    expect(screen.getByText(/invalid business permit/i)).toBeInTheDocument()
  })

  it('renders children when requireVerified and user is verified', () => {
    mockUseAuth.mockReturnValue({
      currentUser: { uid: 'emp-1' },
      userData: { role: 'employer', is_verified: true },
      loading: false,
      isVerified: () => true,
    })

    renderProtected({ requireVerified: true, allowedRoles: ['employer'] })

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })
})
