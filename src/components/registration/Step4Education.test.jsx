import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Step4Education } from './Step4Education'

vi.mock('../common/CertificateUpload', () => ({
    default: ({ onChange, inputId }) => (
        <button type="button" data-testid={inputId} onClick={() => onChange([{ path: 'user-1/certs/certificate.pdf' }])}>
            Mock upload
        </button>
    ),
}))

const baseFormData = {
    userId: 'user-1',
    currently_in_school: false,
    highest_education: 'Tertiary',
    school_name: 'Test School',
    course_or_field: '',
    year_graduated: '',
    did_not_graduate: false,
    education_level_reached: '',
    year_last_attended: '',
    vocational_training: [
        {
            course: 'NC II Electrical Installation',
            institution: 'TESDA',
            hours: '40',
            skills_acquired: 'Wiring',
            certificate_level: 'NC II',
            certificate_path: '',
        },
    ],
}

describe('Step4Education', () => {
    it('shows the inline validation error when certificates are missing', () => {
        render(
            <Step4Education
                formData={baseFormData}
                handleChange={vi.fn()}
                setFormData={vi.fn()}
                errors={{ vocational_training_certificates: 'Each training entry requires a certificate upload before you can continue.' }}
            />
        )

        expect(screen.getByText('Each training entry requires a certificate upload before you can continue.')).toBeInTheDocument()
        expect(screen.getByText('Proof of Completion Required')).toBeInTheDocument()
    })

    it('stores the uploaded certificate path inside the selected training entry', () => {
        const setFormData = vi.fn((updater) => updater(baseFormData))

        render(
            <Step4Education
                formData={baseFormData}
                handleChange={vi.fn()}
                setFormData={setFormData}
                errors={{}}
            />
        )

        fireEvent.click(screen.getByTestId('training-certificate-0'))

        expect(setFormData).toHaveBeenCalled()
        const updater = setFormData.mock.calls[0][0]
        const next = updater(baseFormData)
        expect(next.vocational_training[0].certificate_path).toBe('user-1/certs/certificate.pdf')
    })
})
