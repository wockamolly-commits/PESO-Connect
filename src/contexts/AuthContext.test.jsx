import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// ── Supabase auth mock functions ──────────────────────────────────────────────
const mockSignInWithPassword = vi.fn()
const mockSignUp = vi.fn()
const mockSignOut = vi.fn()
const mockOnAuthStateChange = vi.fn()
const mockResetPasswordForEmail = vi.fn()
const mockRpc = vi.fn()

// ── Supabase DB mock (chained builder: from().select().eq().single()) ─────────
const mockSingle = vi.fn()
const mockEq = vi.fn()
const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdateEq = vi.fn()
const mockUpdate = vi.fn()
const mockFrom = vi.fn()

mockSelect.mockReturnValue({ eq: mockEq })
mockEq.mockReturnValue({ single: mockSingle, eq: mockEq })
mockInsert.mockResolvedValue({ error: null })
mockUpdateEq.mockResolvedValue({ error: null })
mockUpdate.mockReturnValue({ eq: mockUpdateEq })
mockFrom.mockReturnValue({ select: mockSelect, insert: mockInsert, update: mockUpdate })

vi.mock('../config/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args) => mockSignInWithPassword(...args),
      signUp: (...args) => mockSignUp(...args),
      signOut: (...args) => mockSignOut(...args),
      onAuthStateChange: (...args) => mockOnAuthStateChange(...args),
      resetPasswordForEmail: (...args) => mockResetPasswordForEmail(...args),
    },
    from: (...args) => mockFrom(...args),
    rpc: (...args) => mockRpc(...args),
  },
}))

// Mock email service (unchanged)
vi.mock('../services/emailService', () => ({
  sendJobseekerRegistrationEmail: vi.fn().mockResolvedValue(true),
  sendEmployerRegistrationEmail: vi.fn().mockResolvedValue(true),
}))

// Import AFTER mocks are defined
import { AuthProvider, useAuth } from './AuthContext'

function wrapper({ children }) {
  return <AuthProvider>{children}</AuthProvider>
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Reset builder chain mocks
    mockSelect.mockReturnValue({ eq: mockEq })
    mockEq.mockReturnValue({ single: mockSingle, eq: mockEq })
    mockInsert.mockResolvedValue({ error: null })
    mockUpdateEq.mockResolvedValue({ error: null })
    mockUpdate.mockReturnValue({ eq: mockUpdateEq })
    mockFrom.mockReturnValue({ select: mockSelect, insert: mockInsert, update: mockUpdate })

    // Default: no user signed in
    mockOnAuthStateChange.mockImplementation((callback) => {
      callback('INITIAL_SESSION', null)
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    })
  })

  it('starts with no user after loading completes', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.currentUser).toBeNull()
    expect(result.current.userData).toBeNull()
  })

  describe('login', () => {
    it('calls signInWithPassword with correct args', async () => {
      const mockUser = { id: 'user-1', email: 'test@test.com' }
      mockSignInWithPassword.mockResolvedValue({ data: { user: mockUser }, error: null })

      const { result } = renderHook(() => useAuth(), { wrapper })
      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        const user = await result.current.login('test@test.com', 'password123')
        expect(user.uid).toBe('user-1')
      })

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@test.com',
        password: 'password123',
      })
    })

    it('throws on invalid credentials', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null },
        error: new Error('Invalid login credentials'),
      })

      const { result } = renderHook(() => useAuth(), { wrapper })
      await waitFor(() => expect(result.current.loading).toBe(false))

      await expect(
        act(() => result.current.login('bad@test.com', 'wrong'))
      ).rejects.toThrow('Invalid login credentials')
    })
  })

  describe('logout', () => {
    it('calls signOut and clears user state', async () => {
      const mockUser = { id: 'user-1', email: 'test@test.com' }

      mockOnAuthStateChange.mockImplementation((callback) => {
        callback('SIGNED_IN', { user: mockUser })
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      })
      mockSingle.mockResolvedValue({
        data: { id: 'user-1', role: 'jobseeker', is_verified: false },
        error: null,
      })
      mockSignOut.mockResolvedValue({ error: null })

      const { result } = renderHook(() => useAuth(), { wrapper })
      await waitFor(() => expect(result.current.loading).toBe(false))
      expect(result.current.currentUser).toBeTruthy()

      await act(async () => {
        await result.current.logout()
      })

      expect(mockSignOut).toHaveBeenCalled()
      expect(result.current.currentUser).toBeNull()
      expect(result.current.userData).toBeNull()
    })
  })

  describe('register (legacy)', () => {
    it('creates user and inserts profile row', async () => {
      const mockUser = { id: 'new-user-1', email: 'new@test.com' }
      mockSignUp.mockResolvedValue({ data: { user: mockUser }, error: null })
      mockInsert.mockResolvedValue({ error: null })

      const { result } = renderHook(() => useAuth(), { wrapper })
      await waitFor(() => expect(result.current.loading).toBe(false))

      let response
      await act(async () => {
        response = await result.current.register(
          'new@test.com',
          'password123',
          'jobseeker',
          'John Doe',
          ['plumbing']
        )
      })

      expect(mockSignUp).toHaveBeenCalledWith({ email: 'new@test.com', password: 'password123' })
      expect(mockInsert).toHaveBeenCalled()
      expect(response.user.uid).toBe('new-user-1')
      expect(response.userData.role).toBe('jobseeker')
      expect(response.userData.name).toBe('John Doe')
      expect(response.userData.is_verified).toBe(false)
      expect(response.userData.skills).toEqual(['plumbing'])
    })
  })

  describe('role and verification helpers', () => {
    function setupSignedInUser(userData) {
      const mockUser = { id: userData.uid || userData.id, email: userData.email || 'u@test.com' }

      mockOnAuthStateChange.mockImplementation((callback) => {
        callback('SIGNED_IN', { user: mockUser })
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      })

      mockSingle.mockResolvedValue({ data: userData, error: null })
    }

    it('detects employer role correctly', async () => {
      setupSignedInUser({
        uid: 'emp-1',
        role: 'employer',
        is_verified: true,
        name: 'Employer User',
      })

      const { result } = renderHook(() => useAuth(), { wrapper })
      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(result.current.isEmployer()).toBe(true)
      expect(result.current.isJobseeker()).toBe(false)
      expect(result.current.isAdmin()).toBe(false)
      expect(result.current.hasRole('employer')).toBe(true)
      expect(result.current.isVerified()).toBe(true)
    })

    it('detects admin role correctly', async () => {
      setupSignedInUser({ uid: 'admin-1', role: 'admin', is_verified: true })

      const { result } = renderHook(() => useAuth(), { wrapper })
      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(result.current.isAdmin()).toBe(true)
      expect(result.current.isEmployer()).toBe(false)
      expect(result.current.isJobseeker()).toBe(false)
    })

    it('detects jobseeker role correctly', async () => {
      setupSignedInUser({ uid: 'js-1', role: 'jobseeker', is_verified: false })

      const { result } = renderHook(() => useAuth(), { wrapper })
      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(result.current.isJobseeker()).toBe(true)
      expect(result.current.isVerified()).toBe(false)
    })

    it('isVerified returns false when is_verified is false', async () => {
      setupSignedInUser({ uid: 'js-2', role: 'jobseeker', is_verified: false })

      const { result } = renderHook(() => useAuth(), { wrapper })
      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(result.current.isVerified()).toBe(false)
    })

    it('isVerified returns true when is_verified is true', async () => {
      setupSignedInUser({ uid: 'emp-2', role: 'employer', is_verified: true })

      const { result } = renderHook(() => useAuth(), { wrapper })
      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(result.current.isVerified()).toBe(true)
    })
  })

})
