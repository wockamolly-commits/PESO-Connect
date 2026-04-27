import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import PendingReverificationBadge from './PendingReverificationBadge'

describe('PendingReverificationBadge', () => {
    it('renders the text label by default', () => {
        render(<PendingReverificationBadge />)

        const badge = screen.getByLabelText('Pending reverification')
        expect(badge).toBeInTheDocument()
        expect(screen.getByText('Pending reverification')).toBeInTheDocument()
        expect(badge.closest('[title]')).toHaveAttribute('title', "This user's profile has recent changes under review by PESO staff.")
        expect(badge).toHaveClass('badge')
    })

    it('renders compact variant as a hover-only status dot', () => {
        render(<PendingReverificationBadge variant="compact" />)

        expect(screen.getByLabelText('Pending reverification')).toBeInTheDocument()
        expect(screen.getByRole('tooltip')).toHaveTextContent('Pending reverification')
    })
})
