// Mock Firebase Auth
import { vi } from 'vitest'

// --- Auth mocks ---
export const mockSignInWithEmailAndPassword = vi.fn()
export const mockCreateUserWithEmailAndPassword = vi.fn()
export const mockSignOut = vi.fn()
export const mockOnAuthStateChanged = vi.fn()
export const mockDeleteUser = vi.fn()

// --- Firestore mocks ---
export const mockGetDoc = vi.fn()
export const mockSetDoc = vi.fn()
export const mockAddDoc = vi.fn()
export const mockUpdateDoc = vi.fn()
export const mockDeleteDoc = vi.fn()
export const mockOnSnapshot = vi.fn()
export const mockQuery = vi.fn((...args) => ({ _query: args }))
export const mockWhere = vi.fn((...args) => ({ _where: args }))
export const mockOrderBy = vi.fn((...args) => ({ _orderBy: args }))
export const mockLimit = vi.fn((n) => ({ _limit: n }))
export const mockGetDocs = vi.fn()
export const mockDoc = vi.fn((_db, collection, id) => ({ _collection: collection, _id: id }))
export const mockCollection = vi.fn((_db, name) => ({ _name: name }))
export const mockServerTimestamp = vi.fn(() => new Date().toISOString())

// --- Storage mocks ---
export const mockRef = vi.fn()
export const mockUploadBytes = vi.fn()
export const mockGetDownloadURL = vi.fn()

// Mock firebase/auth module
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({})),
  signInWithEmailAndPassword: (...args) => mockSignInWithEmailAndPassword(...args),
  createUserWithEmailAndPassword: (...args) => mockCreateUserWithEmailAndPassword(...args),
  signOut: (...args) => mockSignOut(...args),
  onAuthStateChanged: (...args) => mockOnAuthStateChanged(...args),
}))

// Mock firebase/firestore module
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  doc: (...args) => mockDoc(...args),
  collection: (...args) => mockCollection(...args),
  getDoc: (...args) => mockGetDoc(...args),
  getDocs: (...args) => mockGetDocs(...args),
  setDoc: (...args) => mockSetDoc(...args),
  addDoc: (...args) => mockAddDoc(...args),
  updateDoc: (...args) => mockUpdateDoc(...args),
  deleteDoc: (...args) => mockDeleteDoc(...args),
  onSnapshot: (...args) => mockOnSnapshot(...args),
  query: (...args) => mockQuery(...args),
  where: (...args) => mockWhere(...args),
  orderBy: (...args) => mockOrderBy(...args),
  limit: (...args) => mockLimit(...args),
  serverTimestamp: () => mockServerTimestamp(),
  Timestamp: {
    now: () => ({ seconds: Date.now() / 1000, nanoseconds: 0 }),
    fromDate: (date) => ({ seconds: date.getTime() / 1000, nanoseconds: 0 }),
  },
}))

// Mock firebase/storage module
vi.mock('firebase/storage', () => ({
  getStorage: vi.fn(() => ({})),
  ref: (...args) => mockRef(...args),
  uploadBytes: (...args) => mockUploadBytes(...args),
  getDownloadURL: (...args) => mockGetDownloadURL(...args),
}))

// Mock the firebase config module itself
vi.mock('../../config/firebase', () => ({
  auth: {},
  db: {},
  storage: {},
}))

// Helper to reset all Firebase mocks
export const resetAllFirebaseMocks = () => {
  mockSignInWithEmailAndPassword.mockReset()
  mockCreateUserWithEmailAndPassword.mockReset()
  mockSignOut.mockReset()
  mockOnAuthStateChanged.mockReset()
  mockDeleteUser.mockReset()
  mockGetDoc.mockReset()
  mockSetDoc.mockReset()
  mockAddDoc.mockReset()
  mockUpdateDoc.mockReset()
  mockDeleteDoc.mockReset()
  mockOnSnapshot.mockReset()
  mockGetDocs.mockReset()
  mockDoc.mockReset()
  mockCollection.mockReset()
  mockRef.mockReset()
  mockUploadBytes.mockReset()
  mockGetDownloadURL.mockReset()
}
