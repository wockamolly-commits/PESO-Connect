import { describe, it, expect, vi, beforeEach } from 'vitest'

// We need to mock import.meta.env before importing the module
// Reset modules for each test to get fresh env values
describe('emailService', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  describe('sendEmail', () => {
    it('returns false when email notifications are disabled', async () => {
      vi.stubEnv('VITE_EMAIL_NOTIFICATIONS_ENABLED', 'false')
      vi.stubEnv('VITE_EMAILJS_SERVICE_ID', '')
      vi.stubEnv('VITE_EMAILJS_PUBLIC_KEY', '')

      const { sendEmail } = await import('./emailService')
      const result = await sendEmail('JOBSEEKER_REGISTRATION', { email: 'test@test.com' })
      expect(result).toBe(false)

      vi.unstubAllEnvs()
    })

    it('returns false for invalid template type when enabled but missing config', async () => {
      vi.stubEnv('VITE_EMAIL_NOTIFICATIONS_ENABLED', 'true')
      vi.stubEnv('VITE_EMAILJS_SERVICE_ID', '')
      vi.stubEnv('VITE_EMAILJS_PUBLIC_KEY', '')

      const { sendEmail } = await import('./emailService')
      const result = await sendEmail('INVALID_TEMPLATE', { email: 'test@test.com' })
      // Returns false because serviceId is empty
      expect(result).toBe(false)

      vi.unstubAllEnvs()
    })
  })

  describe('helper functions', () => {
    it('sendJobseekerRegistrationEmail calls sendEmail with correct template', async () => {
      vi.stubEnv('VITE_EMAIL_NOTIFICATIONS_ENABLED', 'false')

      const { sendJobseekerRegistrationEmail } = await import('./emailService')
      const result = await sendJobseekerRegistrationEmail({
        email: 'test@test.com',
        full_name: 'John Doe',
      })
      // Should return false (notifications disabled)
      expect(result).toBe(false)

      vi.unstubAllEnvs()
    })

    it('sendEmployerRegistrationEmail calls sendEmail with correct template', async () => {
      vi.stubEnv('VITE_EMAIL_NOTIFICATIONS_ENABLED', 'false')

      const { sendEmployerRegistrationEmail } = await import('./emailService')
      const result = await sendEmployerRegistrationEmail({
        email: 'employer@test.com',
        representative_name: 'Jane Doe',
        company_name: 'Acme',
      })
      expect(result).toBe(false)

      vi.unstubAllEnvs()
    })

    it('sendJobseekerVerifiedEmail calls sendEmail with correct template', async () => {
      vi.stubEnv('VITE_EMAIL_NOTIFICATIONS_ENABLED', 'false')

      const { sendJobseekerVerifiedEmail } = await import('./emailService')
      const result = await sendJobseekerVerifiedEmail({
        email: 'test@test.com',
        full_name: 'John Doe',
      })
      expect(result).toBe(false)

      vi.unstubAllEnvs()
    })

    it('sendEmployerApprovedEmail calls sendEmail with correct template', async () => {
      vi.stubEnv('VITE_EMAIL_NOTIFICATIONS_ENABLED', 'false')

      const { sendEmployerApprovedEmail } = await import('./emailService')
      const result = await sendEmployerApprovedEmail({
        email: 'emp@test.com',
        representative_name: 'Jane',
        company_name: 'Acme',
      })
      expect(result).toBe(false)

      vi.unstubAllEnvs()
    })

    it('sendJobseekerRejectedEmail calls sendEmail with correct template', async () => {
      vi.stubEnv('VITE_EMAIL_NOTIFICATIONS_ENABLED', 'false')

      const { sendJobseekerRejectedEmail } = await import('./emailService')
      const result = await sendJobseekerRejectedEmail({
        email: 'test@test.com',
        full_name: 'John',
        rejection_reason: 'Incomplete documents',
      })
      expect(result).toBe(false)

      vi.unstubAllEnvs()
    })

    it('sendEmployerRejectedEmail calls sendEmail with correct template', async () => {
      vi.stubEnv('VITE_EMAIL_NOTIFICATIONS_ENABLED', 'false')

      const { sendEmployerRejectedEmail } = await import('./emailService')
      const result = await sendEmployerRejectedEmail({
        email: 'emp@test.com',
        representative_name: 'Jane',
        company_name: 'Acme',
        rejection_reason: 'Invalid permit',
      })
      expect(result).toBe(false)

      vi.unstubAllEnvs()
    })
  })
})
