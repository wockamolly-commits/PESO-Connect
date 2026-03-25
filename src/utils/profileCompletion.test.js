// src/utils/profileCompletion.test.js
import { describe, it, expect } from 'vitest'
import { calculateCompletion } from './profileCompletion'

describe('calculateCompletion', () => {
    it('returns 0% for empty jobseeker', () => {
        const result = calculateCompletion({ role: 'user', subtype: 'jobseeker' })
        expect(result.percentage).toBe(0)
        expect(result.missing.length).toBeGreaterThan(0)
    })

    it('returns 100% for complete jobseeker', () => {
        const result = calculateCompletion({
            role: 'user',
            subtype: 'jobseeker',
            profile_photo: 'data:image/jpeg;base64,abc',
            full_name: 'Juan Dela Cruz',
            date_of_birth: '1995-01-01',
            barangay: 'San Roque',
            city: 'Manila',
            province: 'Metro Manila',
            mobile_number: '09171234567',
            preferred_job_type: ['full-time'],
            preferred_job_location: 'Manila',
            highest_education: 'College Graduate',
            school_name: 'UP',
            skills: ['Excel', 'Word', 'PowerPoint'],
            work_experiences: [{ company: 'DOLE', position: 'Clerk', duration: '2020-2022' }],
            resume_url: 'data:application/pdf;base64,abc',
            certifications: ['PRC License'],
            portfolio_url: 'https://example.com'
        })
        expect(result.percentage).toBe(100)
        expect(result.missing).toEqual([])
    })

    it('calculates partial jobseeker correctly', () => {
        const result = calculateCompletion({
            role: 'user',
            subtype: 'jobseeker',
            full_name: 'Juan',
            date_of_birth: '1995-01-01',
            city: 'Manila',
            province: 'Metro Manila',
            mobile_number: '09171234567',
            skills: ['Excel']
        })
        expect(result.percentage).toBeGreaterThan(0)
        expect(result.percentage).toBeLessThan(100)
        expect(result.missing.some(m => m.key === 'profile_photo')).toBe(true)
    })

    it('returns 0% for empty employer', () => {
        const result = calculateCompletion({ role: 'employer' })
        expect(result.percentage).toBe(0)
    })

    it('returns 100% for complete employer', () => {
        const result = calculateCompletion({
            role: 'employer',
            company_name: 'ACME Corp',
            employer_type: 'company',
            business_address: '123 Main St',
            nature_of_business: 'Manufacturing',
            representative_name: 'Juan',
            representative_position: 'HR Manager',
            business_permit_url: 'data:image/jpeg;base64,abc',
            gov_id_url: 'data:image/jpeg;base64,abc',
            contact_email: 'test@example.com',
            contact_number: '09171234567',
            company_description: 'We make things',
            profile_photo: 'data:image/jpeg;base64,abc',
            company_website: 'https://acme.com'
        })
        expect(result.percentage).toBe(100)
        expect(result.missing).toEqual([])
    })

    it('returns 0% for empty homeowner', () => {
        const result = calculateCompletion({ role: 'user', subtype: 'homeowner' })
        expect(result.percentage).toBe(0)
    })

    it('returns 100% for complete homeowner', () => {
        const result = calculateCompletion({
            role: 'user',
            subtype: 'homeowner',
            full_name: 'Maria Santos',
            contact_number: '09171234567',
            profile_photo: 'data:image/jpeg;base64,abc',
            barangay: 'San Roque',
            city: 'Manila',
            province: 'Metro Manila',
            bio: 'Homeowner looking for services',
            service_preferences: ['Plumbing', 'Cleaning']
        })
        expect(result.percentage).toBe(100)
        expect(result.missing).toEqual([])
    })

    it('returns empty result for unknown role', () => {
        const result = calculateCompletion({ role: 'unknown' })
        expect(result.percentage).toBe(0)
        expect(result.missing).toEqual([])
    })
})
