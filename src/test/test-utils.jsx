import { render } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../contexts/AuthContext'

/**
 * Custom render that wraps components with Router and AuthProvider.
 * Use for components that need routing/auth context.
 */
export function renderWithProviders(ui, options = {}) {
  const { route = '/', ...renderOptions } = options

  window.history.pushState({}, 'Test page', route)

  function Wrapper({ children }) {
    return (
      <AuthProvider>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </AuthProvider>
    )
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

/**
 * Render with only Router (no AuthProvider) - for components that
 * receive auth via props or don't need auth.
 */
export function renderWithRouter(ui, options = {}) {
  const { route = '/', ...renderOptions } = options

  window.history.pushState({}, 'Test page', route)

  function Wrapper({ children }) {
    return <BrowserRouter>{children}</BrowserRouter>
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// Re-export everything from testing-library
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'
