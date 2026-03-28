import { useState } from 'react'
import { MapPin, DollarSign, Plus, X, Globe, Languages } from 'lucide-react'
import { FloatingLabelInput } from '../forms/FloatingLabelInput'
import { SearchableSelect } from '../forms/SearchableSelect'
import { AnimatedSection } from '../forms/AnimatedSection'

const JOB_TYPE_OPTIONS = [
  { id: 'full-time', label: 'Full-time' },
  { id: 'part-time', label: 'Part-time' },
  { id: 'contractual', label: 'Contractual' },
  { id: 'on-demand', label: 'On-demand' }
]

const PROFICIENCY_LEVELS = ['Beginner', 'Conversational', 'Proficient', 'Fluent', 'Native']

const EMPTY_LANGUAGE = { language: '', proficiency: '' }

function Step6JobPreferences({ formData, handleChange, setFormData, errors = {} }) {
  const [showOverseas, setShowOverseas] = useState(
    (formData.preferred_overseas_locations || []).some(l => l && l.trim() !== '')
  )

  const handleJobTypeToggle = (typeId) => {
    const current = formData.preferred_job_type || []
    const updated = current.includes(typeId)
      ? current.filter(t => t !== typeId)
      : [...current, typeId]
    setFormData(prev => ({ ...prev, preferred_job_type: updated }))
  }

  const occupations = formData.preferred_occupations || ['', '', '']
  const updateOccupation = (index, value) => {
    setFormData(prev => {
      const updated = [...(prev.preferred_occupations || ['', '', ''])]
      updated[index] = value
      return { ...prev, preferred_occupations: updated }
    })
  }

  const localLocations = formData.preferred_local_locations || ['', '', '']
  const updateLocalLocation = (index, value) => {
    setFormData(prev => {
      const updated = [...(prev.preferred_local_locations || ['', '', ''])]
      updated[index] = value
      return { ...prev, preferred_local_locations: updated }
    })
  }

  const overseasLocations = formData.preferred_overseas_locations || ['', '', '']
  const updateOverseasLocation = (index, value) => {
    setFormData(prev => {
      const updated = [...(prev.preferred_overseas_locations || ['', '', ''])]
      updated[index] = value
      return { ...prev, preferred_overseas_locations: updated }
    })
  }

  const languages = formData.languages || []
  const addLanguage = () => {
    setFormData(prev => ({ ...prev, languages: [...(prev.languages || []), { ...EMPTY_LANGUAGE }] }))
  }
  const updateLanguage = (index, field, value) => {
    setFormData(prev => {
      const updated = [...(prev.languages || [])]
      updated[index] = { ...updated[index], [field]: value }
      return { ...prev, languages: updated }
    })
  }
  const removeLanguage = (index) => {
    setFormData(prev => ({ ...prev, languages: (prev.languages || []).filter((_, i) => i !== index) }))
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-800">Job Preferences</h3>

      <div>
        <label className="label">Preferred Job Type <span className="text-red-500">*</span></label>
        <div className="grid grid-cols-2 gap-3">
          {JOB_TYPE_OPTIONS.map(type => {
            const isSelected = (formData.preferred_job_type || []).includes(type.id)
            return (
              <button key={type.id} type="button" onClick={() => handleJobTypeToggle(type.id)}
                className={`p-4 rounded-xl border-2 text-left transition-all duration-200 flex items-center gap-3 ${isSelected ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected ? 'border-primary-500 bg-primary-500' : 'border-gray-300'}`}>
                  {isSelected && <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                </div>
                <span className={isSelected ? 'text-primary-700 font-medium' : 'text-gray-600'}>{type.label}</span>
              </button>
            )
          })}
        </div>
        {errors.preferred_job_type && <p className="mt-1 text-sm text-red-500">{errors.preferred_job_type}</p>}
      </div>

      <div>
        <label className="label">Preferred Occupation <span className="text-red-500">*</span></label>
        <p className="text-sm text-gray-500 mb-2">Enter up to 3 job titles you're interested in.</p>
        <div className="space-y-3">
          {[0, 1, 2].map(i => (
            <FloatingLabelInput key={i} label={`Occupation ${i + 1}${i === 0 ? ' *' : ''}`} name={`occupation_${i}`}
              value={occupations[i] || ''} onChange={(e) => updateOccupation(i, e.target.value)}
              error={i === 0 ? errors.preferred_occupations : undefined} />
          ))}
        </div>
      </div>

      <div>
        <label className="label flex items-center gap-2"><MapPin className="w-4 h-4" /> Preferred Work Location (Local)</label>
        <div className="space-y-3">
          {[0, 1, 2].map(i => (
            <FloatingLabelInput key={i} label={`City/Municipality ${i + 1}`} name={`local_loc_${i}`}
              value={localLocations[i] || ''} onChange={(e) => updateLocalLocation(i, e.target.value)} />
          ))}
        </div>
      </div>

      <button type="button" onClick={() => setShowOverseas(!showOverseas)}
        className="flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium text-sm transition-colors">
        <Globe className="w-4 h-4" />
        {showOverseas ? 'Hide Overseas Locations' : 'Add Overseas Locations'}
      </button>

      <AnimatedSection show={showOverseas}>
        <div className="mt-4">
          <label className="label flex items-center gap-2"><Globe className="w-4 h-4" /> Preferred Work Location (Overseas)</label>
          <div className="space-y-3">
            {[0, 1, 2].map(i => (
              <FloatingLabelInput key={i} label={`Country ${i + 1}`} name={`overseas_loc_${i}`}
                value={overseasLocations[i] || ''} onChange={(e) => updateOverseasLocation(i, e.target.value)} />
            ))}
          </div>
        </div>
      </AnimatedSection>
      {errors.locations && <p className="mt-1 text-sm text-red-500">{errors.locations}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FloatingLabelInput label="Expected Salary (Min ₱)" name="expected_salary_min" value={formData.expected_salary_min} onChange={handleChange} type="number" inputMode="numeric" min="0" />
        <FloatingLabelInput label="Expected Salary (Max ₱)" name="expected_salary_max" value={formData.expected_salary_max} onChange={handleChange} type="number" inputMode="numeric" min="0" />
      </div>
      {errors.salary && <p className="text-sm text-red-500">{errors.salary}</p>}

      <div>
        <label className="label">Willing to Relocate</label>
        <div className="grid grid-cols-2 gap-3">
          {['yes', 'no'].map(val => (
            <button key={val} type="button" onClick={() => handleChange({ target: { name: 'willing_to_relocate', value: val } })}
              className={`p-3 rounded-xl border-2 text-center transition-all duration-200 ${formData.willing_to_relocate === val ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}>
              {val === 'yes' ? 'Yes' : 'No'}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
          <Languages className="w-5 h-5" /> Language Proficiency
        </h3>
        <p className="text-sm text-gray-500 mb-4">Optional — add languages you speak.</p>

        {languages.map((lang, index) => (
          <div key={index} className="flex items-start gap-3 mb-3 animate-scale-in">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
              <FloatingLabelInput label="Language" name={`lang_name_${index}`} value={lang.language} onChange={(e) => updateLanguage(index, 'language', e.target.value)} required />
              <SearchableSelect label="Proficiency Level" name={`lang_prof_${index}`} value={lang.proficiency} onChange={(e) => updateLanguage(index, 'proficiency', e.target.value)} options={PROFICIENCY_LEVELS} required />
            </div>
            <button type="button" onClick={() => removeLanguage(index)} className="mt-3 p-1 text-gray-400 hover:text-red-500 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        ))}

        <button type="button" onClick={addLanguage} className="flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium text-sm transition-colors">
          <Plus className="w-4 h-4" /> Add Language
        </button>
      </div>
    </div>
  )
}

export { Step6JobPreferences, JOB_TYPE_OPTIONS, PROFICIENCY_LEVELS }
