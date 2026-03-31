import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Download, Loader2, AlertTriangle } from 'lucide-react'

const FIELD_CHECKS = [
  { key: 'profile_photo', label: 'Profile Photo', check: (v) => !!v },
  { key: 'skills', label: 'Skills', check: (v) => Array.isArray(v) && v.length > 0 },
  { key: 'work_experiences', label: 'Work Experience', check: (v) => Array.isArray(v) && v.length > 0 },
  { key: 'highest_education', label: 'Education', check: (v) => !!v },
  { key: 'certifications', label: 'Certifications', check: (v) => Array.isArray(v) && v.length > 0 },
  { key: 'languages', label: 'Languages', check: (v) => Array.isArray(v) && v.length > 0 },
  { key: 'portfolio_url', label: 'Portfolio', check: (v) => !!v },
]

function getMissingFields(userData) {
  return FIELD_CHECKS.filter(({ key, check }) => !check(userData?.[key]))
    .map(({ label }) => label)
}

function sanitizeFilename(name) {
  if (!name) return 'Resume'
  return name.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_')
}

export default function ExportResumeButton() {
  const { userData } = useAuth()
  const [generating, setGenerating] = useState(false)
  const [showWarning, setShowWarning] = useState(false)
  const [missingFields, setMissingFields] = useState([])
  const [error, setError] = useState(null)

  function handleClick() {
    setError(null)
    const missing = getMissingFields(userData)
    if (missing.length > 0) {
      setMissingFields(missing)
      setShowWarning(true)
    } else {
      generatePdf()
    }
  }

  async function generatePdf() {
    setShowWarning(false)
    setGenerating(true)
    setError(null)
    try {
      const { pdf } = await import('@react-pdf/renderer')
      const { default: ResumeDocument } = await import('./ResumeDocument')
      const blob = await pdf(<ResumeDocument userData={userData} />).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${sanitizeFilename(userData?.display_name || userData?.full_name)}_Resume.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('PDF generation failed:', err)
      setError('Failed to generate resume. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={generating}
        className="btn-secondary flex items-center justify-center gap-2"
      >
        {generating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Download className="w-5 h-5" />
            Export as Resume
          </>
        )}
      </button>

      {error && (
        <p className="text-red-500 text-sm mt-1">{error}</p>
      )}

      {showWarning && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowWarning(false)} />
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-lg text-gray-900">
                  Some sections are incomplete
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  The following sections are missing from your profile:
                </p>
              </div>
            </div>
            <ul className="list-disc list-inside text-sm text-gray-700 ml-9 mb-6">
              {missingFields.map((field) => (
                <li key={field}>{field}</li>
              ))}
            </ul>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowWarning(false)}
                className="btn-secondary px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={generatePdf}
                className="btn-primary px-4 py-2"
              >
                Export Anyway
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

export { getMissingFields, sanitizeFilename }
