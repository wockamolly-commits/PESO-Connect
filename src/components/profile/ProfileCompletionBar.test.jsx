import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import ProfileCompletionBar from './ProfileCompletionBar'

const wrap = (ui) => <BrowserRouter>{ui}</BrowserRouter>

describe('ProfileCompletionBar', () => {
    it('shows percentage text', () => {
        render(wrap(<ProfileCompletionBar percentage={75} missing={[]} editPath="/profile/edit" />))
        expect(screen.getByText('75%')).toBeInTheDocument()
    })

    it('shows missing items as hints', () => {
        const missing = [
            { key: 'photo', label: 'Add a profile photo' },
            { key: 'skills', label: 'Add at least 3 skills' }
        ]
        render(wrap(<ProfileCompletionBar percentage={50} missing={missing} editPath="/profile/edit" />))
        expect(screen.getByText('Add a profile photo')).toBeInTheDocument()
        expect(screen.getByText('Add at least 3 skills')).toBeInTheDocument()
    })

    it('shows green color when percentage >= 67', () => {
        const { container } = render(wrap(<ProfileCompletionBar percentage={80} missing={[]} editPath="/profile/edit" />))
        const bar = container.querySelector('[data-testid="completion-fill"]')
        expect(bar.className).toContain('bg-green')
    })

    it('shows no missing hints when 100%', () => {
        render(wrap(<ProfileCompletionBar percentage={100} missing={[]} editPath="/profile/edit" />))
        expect(screen.getByText('Profile complete!')).toBeInTheDocument()
    })
})
