import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import PendingReverificationBadge from './PendingReverificationBadge'

describe('PendingReverificationBadge', () => {
    it('renders the pending label and tooltip title', () => {
        render(<PendingReverificationBadge />)

        const badge = screen.getByText('Pending Re-verification')
        expect(badge).toBeInTheDocument()
        expect(badge.closest('span')).toHaveAttribute('title', "This user's profile has recent changes under review by PESO staff.")
    })
})
