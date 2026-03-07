import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// Define mock functions at module scope (hoisted with vi.mock)
const mockSignInWithEmailAndPassword = vi.fn()
const mockCreateUserWithEmailAndPassword = vi.fn()
const mockSignOut = vi.fn()
const mockOnAuthStateChanged = vi.fn()
const mockSetDoc = vi.fn()
const mockGetDoc = vi.fn()
const mockOnSnapshot = vi.fn()
const mockDoc = vi.fn((_db, _col, _id) => ({ _col, _id }))

// Mock firebase config
vi.mock('../config/firebase', () => ({
  auth: { currentUser: null },
  db: {},
}))

// Mock firebase/auth
vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: (...args) => mockSignInWithEmailAndPassword(...args),
  createUserWithEmailAndPassword: (...args) => mockCreateUserWithEmailAndPassword(...args),
  signOut: (...args) => mockSignOut(...args),
  onAuthStateChanged: (...args) => mockOnAuthStateChanged(...args),
}))

// Mock firebase/firestore
vi.mock('firebase/firestore', () => ({
  doc: (...args) => mockDoc(...args),
  setDoc: (...args) => mockSetDoc(...args),
  getDoc: (...args) => mockGetDoc(...args),
  onSnapshot: (...args) => mockOnSnapshot(...args),
}))

// Mock email service
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
    // Default: no user signed in
    mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
      callback(null)
      return vi.fn()
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
    it('calls signInWithEmailAndPassword with correct args', async () => {
      const mockUser = { uid: 'user-1', email: 'test@test.com' }
      mockSignInWithEmailAndPassword.mockResolvedValue({ user: mockUser })

      const { result } = renderHook(() => useAuth(), { wrapper })
      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        const user = await result.current.login('test@test.com', 'password123')
        expect(user.uid).toBe('user-1')
      })

      expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'test@test.com',
        'password123'
      )
    })

    it('throws on invalid credentials', async () => {
      const firebaseError = new Error('Invalid credential')
      firebaseError.code = 'auth/invalid-credential'
      mockSignInWithEmailAndPassword.mockRejectedValue(firebaseError)

      const { result } = renderHook(() => useAuth(), { wrapper })
      await waitFor(() => expect(result.current.loading).toBe(false))

      await expect(
        act(() => result.current.login('bad@test.com', 'wrong'))
      ).rejects.toThrow('Invalid credential')
    })
  })

  describe('logout', () => {
    it('calls signOut and clears user state', async () => {
      // Start with a signed-in user
      const mockUser = { uid: 'user-1', email: 'test@test.com', reload: vi.fn() }
      mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
        callback(mockUser)
        return vi.fn()
      })
      mockOnSnapshot.mockImplementation((_ref, onNext) => {
        onNext({
          exists: () => true,
          data: () => ({ uid: 'user-1', role: 'jobseeker', is_verified: false }),
        })
        return vi.fn()
      })
      mockSignOut.mockResolvedValue(undefined)

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
    it('creates user and Firestore document', async () => {
      const mockUser = { uid: 'new-user-1', email: 'new@test.com' }
      mockCreateUserWithEmailAndPassword.mockResolvedValue({ user: mockUser })
      mockSetDoc.mockResolvedValue(undefined)

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

      expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'new@test.com',
        'password123'
      )
      expect(mockSetDoc).toHaveBeenCalled()
      expect(response.user.uid).toBe('new-user-1')
      expect(response.userData.role).toBe('jobseeker')
      expect(response.userData.name).toBe('John Doe')
      expect(response.userData.is_verified).toBe(false)
      expect(response.userData.skills).toEqual(['plumbing'])
    })
  })

  describe('role and verification helpers', () => {
    function setupSignedInUser(userData) {
      const mockUser = { uid: userData.uid, email: userData.email || 'u@test.com', reload: vi.fn() }

      mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
        callback(mockUser)
        return vi.fn()
      })

      mockOnSnapshot.mockImplementation((_ref, onNext) => {
        onNext({
          exists: () => true,
          data: () => userData,
        })
        return vi.fn()
      })
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

  describe('registerJobseeker', () => {
    it('creates jobseeker with full profile data', async () => {
      const mockUser = { uid: 'js-new', email: 'jobseeker@test.com' }
      mockCreateUserWithEmailAndPassword.mockResolvedValue({ user: mockUser })
      mockSetDoc.mockResolvedValue(undefined)

      const { result } = renderHook(() => useAuth(), { wrapper })
      await waitFor(() => expect(result.current.loading).toBe(false))

      let response
      await act(async () => {
        response = await result.current.registerJobseeker({
          email: 'jobseeker@test.com',
          password: 'pass123',
          full_name: 'Maria Santos',
          date_of_birth: '1990-01-01',
          city: 'San Carlos',
          province: 'Negros Occidental',
          skills: ['Plumbing', 'Electrical'],
          terms_accepted: true,
        })
      })

      expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalled()
      expect(mockSetDoc).toHaveBeenCalled()
      expect(response.userData.role).toBe('jobseeker')
      expect(response.userData.full_name).toBe('Maria Santos')
      expect(response.userData.is_verified).toBe(false)
      expect(response.userData.jobseeker_status).toBe('pending')
    })
  })

  describe('registerEmployer', () => {
    it('creates employer with company data', async () => {
      const mockUser = { uid: 'emp-new', email: 'employer@test.com' }
      mockCreateUserWithEmailAndPassword.mockResolvedValue({ user: mockUser })
      mockSetDoc.mockResolvedValue(undefined)

      const { result } = renderHook(() => useAuth(), { wrapper })
      await waitFor(() => expect(result.current.loading).toBe(false))

      let response
      await act(async () => {
        response = await result.current.registerEmployer({
          email: 'employer@test.com',
          password: 'pass123',
          company_name: 'Acme Corp',
          representative_name: 'Juan Cruz',
          representative_position: 'HR Manager',
          terms_accepted: true,
        })
      })

      expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalled()
      expect(mockSetDoc).toHaveBeenCalled()
      expect(response.userData.role).toBe('employer')
      expect(response.userData.company_name).toBe('Acme Corp')
      expect(response.userData.is_verified).toBe(false)
      expect(response.userData.employer_status).toBe('pending')
    })
  })
})
