// src/components/profile/ProfilePhotoUpload.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProfilePhotoUpload from './ProfilePhotoUpload'

describe('ProfilePhotoUpload', () => {
    it('shows initials when no photo is provided', () => {
        render(<ProfilePhotoUpload name="Juan Dela Cruz" onPhotoChange={vi.fn()} />)
        expect(screen.getByText('J')).toBeInTheDocument()
    })

    it('shows image when photo URL is provided', () => {
        render(<ProfilePhotoUpload name="Juan" currentPhoto="data:image/jpeg;base64,abc" onPhotoChange={vi.fn()} />)
        const img = screen.getByAltText('Profile photo')
        expect(img).toBeInTheDocument()
        expect(img).toHaveAttribute('src', 'data:image/jpeg;base64,abc')
    })

    it('has a hidden file input', () => {
        render(<ProfilePhotoUpload name="Juan" onPhotoChange={vi.fn()} />)
        const input = document.querySelector('input[type="file"]')
        expect(input).toBeInTheDocument()
        expect(input).toHaveAttribute('accept', 'image/jpeg,image/png')
    })
})
