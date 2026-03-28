import { CheckCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

const CONSENT_ITEMS = [
  { key: 'terms_accepted', label: 'I accept the Terms and Conditions of PESO Connect.' },
  { key: 'data_processing_consent', label: 'I consent to the collection, processing, and storage of my personal data in accordance with the Data Privacy Act of 2012.' },
  { key: 'peso_verification_consent', label: 'I understand that my account requires verification and approval by PESO personnel before I can access all features.' },
  { key: 'info_accuracy_confirmation', label: 'I confirm that all information provided in this registration form is accurate and truthful to the best of my knowledge.' },
  { key: 'dole_authorization', label: 'I authorize DOLE to include my profile in the PESO Employment Information System and use my personal information for employment facilitation. I am also aware that DOLE is not obliged to seek employment on my behalf.' }
]

function SummarySection({ title, children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button type="button" onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left">
        <span className="font-medium text-sm text-gray-700">{title}</span>
        {isOpen ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </button>
      {isOpen && <div className="p-3 text-sm text-gray-600 space-y-1">{children}</div>}
    </div>
  )
}

function Step7Consent({ formData, handleChange, errors = {} }) {
  const displayName = [formData.first_name, formData.middle_name, formData.surname]
    .filter(Boolean).join(' ')
    + (formData.suffix && formData.suffix !== 'None' ? ` ${formData.suffix}` : '')

  return (
    <div className="space-y-6">
      <div className="space-y-4 bg-gray-50 p-6 rounded-xl">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Consent & Authorization</h3>
        {CONSENT_ITEMS.map(item => (
          <label key={item.key} className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" name={item.key} checked={formData[item.key] || false} onChange={handleChange}
              className="mt-1 w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
            <span className="text-sm text-gray-700 leading-relaxed">{item.label}</span>
          </label>
        ))}
        {errors.consent && <p className="text-sm text-red-500">{errors.consent}</p>}
      </div>

      <div className="bg-primary-50 border border-primary-200 rounded-xl p-6">
        <h3 className="font-semibold text-primary-900 mb-3 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-primary-600" /> Registration Summary
        </h3>
        <div className="space-y-2">
          <SummarySection title="Personal Information" defaultOpen>
            <p><strong>Name:</strong> {displayName || '—'}</p>
            <p><strong>Date of Birth:</strong> {formData.date_of_birth || '—'}</p>
            <p><strong>Sex:</strong> {formData.sex || '—'}</p>
            <p><strong>Civil Status:</strong> {formData.civil_status || '—'}</p>
            {formData.is_pwd && <p><strong>PWD:</strong> Yes — {(formData.disability_type || []).join(', ')}</p>}
          </SummarySection>

          <SummarySection title="Contact & Address">
            <p><strong>Address:</strong> {[formData.street_address, formData.barangay, formData.city, formData.province].filter(Boolean).join(', ') || '—'}</p>
            <p><strong>Mobile:</strong> {formData.mobile_number || '—'}</p>
            <p><strong>Email:</strong> {formData.email || '—'}</p>
            <p><strong>Employment:</strong> {formData.employment_status || '—'}</p>
          </SummarySection>

          <SummarySection title="Education & Training">
            <p><strong>Education:</strong> {formData.highest_education || '—'}</p>
            <p><strong>School:</strong> {formData.school_name || '—'}</p>
            {formData.course_or_field && <p><strong>Course:</strong> {formData.course_or_field}</p>}
            {(formData.vocational_training || []).length > 0 && (
              <p><strong>Training:</strong> {formData.vocational_training.map(t => t.course).filter(Boolean).join(', ')}</p>
            )}
          </SummarySection>

          <SummarySection title="Skills & Experience">
            <p><strong>Skills:</strong> {[...(formData.predefined_skills || []), ...(formData.skills || [])].join(', ') || '—'}</p>
            <p><strong>Work Experience:</strong> {(formData.work_experiences || []).length} entries</p>
            <p><strong>Resume:</strong> {formData.resume_url ? 'Uploaded' : 'Not uploaded'}</p>
          </SummarySection>

          <SummarySection title="Job Preferences">
            <p><strong>Job Type:</strong> {(formData.preferred_job_type || []).join(', ') || '—'}</p>
            <p><strong>Occupations:</strong> {(formData.preferred_occupations || []).filter(Boolean).join(', ') || '—'}</p>
            {(formData.languages || []).length > 0 && (
              <p><strong>Languages:</strong> {formData.languages.map(l => `${l.language} (${l.proficiency})`).join(', ')}</p>
            )}
          </SummarySection>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-yellow-800">
            <p>After submitting, your account will be in <strong>pending status</strong>. <strong>PESO personnel will review</strong> your registration and may contact you for verification.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export { Step7Consent, CONSENT_ITEMS }
