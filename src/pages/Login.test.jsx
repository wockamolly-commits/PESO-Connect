import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import Login from './Login'

// Mock useAuth
const mockLogin = vi.fn()
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
  }),
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

function renderLogin() {
  return render(
    <BrowserRouter>
      <Login />
    </BrowserRouter>
  )
}

describe('Login page', () => {
  beforeEach(() => {
    mockLogin.mockReset()
    mockNavigate.mockReset()
  })

  it('renders email and password fields', () => {
    renderLogin()

    expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument()
  })

  it('renders sign in button', () => {
    renderLogin()

    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('renders register link', () => {
    renderLogin()

    expect(screen.getByRole('link', { name: /register here/i })).toBeInTheDocument()
  })

  it('submits form and navigates on success', async () => {
    const user = userEvent.setup()
    mockLogin.mockResolvedValue({ uid: 'user-1' })

    renderLogin()

    await user.type(screen.getByPlaceholderText('Enter your email'), 'test@example.com')
    await user.type(screen.getByPlaceholderText('Enter your password'), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123')
    })

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('displays error on invalid credentials', async () => {
    const user = userEvent.setup()
    const error = new Error('Invalid credential')
    error.code = 'auth/invalid-credential'
    mockLogin.mockRejectedValue(error)

    renderLogin()

    await user.type(screen.getByPlaceholderText('Enter your email'), 'test@example.com')
    await user.type(screen.getByPlaceholderText('Enter your password'), 'wrong')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument()
    })
  })

  it('displays error on user-not-found', async () => {
    const user = userEvent.setup()
    const error = new Error('User not found')
    error.code = 'auth/user-not-found'
    mockLogin.mockRejectedValue(error)

    renderLogin()

    await user.type(screen.getByPlaceholderText('Enter your email'), 'nobody@example.com')
    await user.type(screen.getByPlaceholderText('Enter your password'), 'pass')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText(/no account found/i)).toBeInTheDocument()
    })
  })

  it('displays rate-limit error', async () => {
    const user = userEvent.setup()
    const error = new Error('Too many requests')
    error.code = 'auth/too-many-requests'
    mockLogin.mockRejectedValue(error)

    renderLogin()

    await user.type(screen.getByPlaceholderText('Enter your email'), 'test@example.com')
    await user.type(screen.getByPlaceholderText('Enter your password'), 'pass')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText(/too many failed attempts/i)).toBeInTheDocument()
    })
  })

  it('toggles password visibility', async () => {
    const user = userEvent.setup()
    renderLogin()

    const passwordInput = screen.getByPlaceholderText('Enter your password')
    expect(passwordInput).toHaveAttribute('type', 'password')

    // Click the toggle button (the button inside the password field)
    const toggleButtons = screen.getAllByRole('button')
    const toggleButton = toggleButtons.find(btn => btn.type === 'button')
    await user.click(toggleButton)

    expect(passwordInput).toHaveAttribute('type', 'text')
  })

  it('disables submit button while loading', async () => {
    const user = userEvent.setup()
    // Never resolve, to keep loading state
    mockLogin.mockImplementation(() => new Promise(() => {}))

    renderLogin()

    await user.type(screen.getByPlaceholderText('Enter your email'), 'test@example.com')
    await user.type(screen.getByPlaceholderText('Enter your password'), 'pass')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText(/signing in/i)).toBeInTheDocument()
    })
  })
})
