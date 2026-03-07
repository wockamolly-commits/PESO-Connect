import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

describe('Test framework smoke test', () => {
  it('renders a basic React component', () => {
    function Hello() {
      return <h1>Hello PESO Connect</h1>
    }

    render(<Hello />)
    expect(screen.getByRole('heading')).toHaveTextContent('Hello PESO Connect')
  })

  it('jest-dom matchers work', () => {
    render(<button disabled>Click me</button>)
    expect(screen.getByRole('button')).toBeDisabled()
    expect(screen.getByRole('button')).toHaveTextContent('Click me')
  })
})
