import { Plus, X, Briefcase, Award, Shield, Calendar } from 'lucide-react'
import { FloatingLabelInput } from '../forms/FloatingLabelInput'
import { SearchableSelect } from '../forms/SearchableSelect'
import { AnimatedSection } from '../forms/AnimatedSection'
import { Tooltip } from '../forms/Tooltip'
import TagInput from '../forms/TagInput'
import ResumeUpload from '../common/ResumeUpload'

const PREDEFINED_SKILLS = [
  'Auto Mechanic', 'Beautician', 'Carpentry Work', 'Computer Literate',
  'Domestic Chores', 'Driver', 'Electrician', 'Embroidery',
  'Gardening', 'Masonry', 'Painter/Artist', 'Painting Jobs',
  'Photography', 'Plumbing', 'Sewing/Dresses', 'Stenography',
  'Tailoring'
]

const WORK_STATUS_OPTIONS = ['Permanent', 'Contractual', 'Part-time', 'Probationary']

const EMPTY_EXPERIENCE = { company: '', address: '', position: '', months: '', employment_status: '' }
const EMPTY_LICENSE = { name: '', number: '', valid_until: '' }

function Step5SkillsExperience({ formData, handleChange, setFormData, userId, errors = {} }) {
  const predefinedSkills = formData.predefined_skills || []

  const togglePredefinedSkill = (skill) => {
    const updated = predefinedSkills.includes(skill)
      ? predefinedSkills.filter(s => s !== skill)
      : [...predefinedSkills, skill]
    setFormData(prev => ({ ...prev, predefined_skills: updated }))
  }

  const experiences = formData.work_experiences || []
  const addExperience = () => {
    if (experiences.length >= 5) return
    setFormData(prev => ({ ...prev, work_experiences: [...(prev.work_experiences || []), { ...EMPTY_EXPERIENCE }] }))
  }
  const updateExperience = (index, field, value) => {
    setFormData(prev => {
      const updated = [...(prev.work_experiences || [])]
      updated[index] = { ...updated[index], [field]: value }
      return { ...prev, work_experiences: updated }
    })
  }
  const removeExperience = (index) => {
    setFormData(prev => ({ ...prev, work_experiences: (prev.work_experiences || []).filter((_, i) => i !== index) }))
  }

  const licenses = formData.professional_licenses || []
  const addLicense = () => {
    if (licenses.length >= 2) return
    setFormData(prev => ({ ...prev, professional_licenses: [...(prev.professional_licenses || []), { ...EMPTY_LICENSE }] }))
  }
  const updateLicense = (index, field, value) => {
    setFormData(prev => {
      const updated = [...(prev.professional_licenses || [])]
      updated[index] = { ...updated[index], [field]: value }
      return { ...prev, professional_licenses: updated }
    })
  }
  const removeLicense = (index) => {
    setFormData(prev => ({ ...prev, professional_licenses: (prev.professional_licenses || []).filter((_, i) => i !== index) }))
  }

  const handleCertificateUpload = (e) => {
    const files = Array.from(e.target.files)
    files.forEach(file => {
      if (file.size > 2 * 1024 * 1024) return
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          certificate_urls: [...(prev.certificate_urls || []), { name: file.name, data: reader.result, type: file.type }]
        }))
      }
      reader.readAsDataURL(file)
    })
  }

  const removeCertificateFile = (index) => {
    setFormData(prev => ({ ...prev, certificate_urls: (prev.certificate_urls || []).filter((_, i) => i !== index) }))
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-800">Skills</h3>
      <p className="text-sm text-gray-500">Select skills you have or add your own below. At least 1 skill required.</p>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {PREDEFINED_SKILLS.map(skill => (
          <label key={skill} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
            <input type="checkbox" checked={predefinedSkills.includes(skill)} onChange={() => togglePredefinedSkill(skill)}
              className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
            <span className="text-sm text-gray-700">{skill}</span>
          </label>
        ))}
      </div>

      <div>
        <label className="label">Additional Skills</label>
        <TagInput tags={formData.skills || []} setTags={(tags) => setFormData(prev => ({ ...prev, skills: tags }))}
          placeholder="Type a skill and press Enter..." tagClassName="bg-primary-100 text-primary-700" removeClassName="hover:text-primary-900" />
      </div>
      {errors.skills && <p className="text-sm text-red-500">{errors.skills}</p>}

      <div className="pt-4 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Professional Licenses
          <Tooltip text="PRC-issued licenses such as nursing, engineering, teaching, etc." />
        </h3>
        <p className="text-sm text-gray-500 mb-4">Optional — add up to 2 licenses.</p>

        {licenses.map((lic, index) => (
          <div key={index} className="relative p-4 bg-gray-50 rounded-xl mb-4 animate-scale-in">
            <button type="button" onClick={() => removeLicense(index)} className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 transition-colors">
              <X className="w-5 h-5" />
            </button>
            <p className="text-sm font-medium text-gray-600 mb-3">License {index + 1}</p>
            <div className="space-y-3">
              <FloatingLabelInput label="License Name (PRC)" name={`lic_name_${index}`} value={lic.name} onChange={(e) => updateLicense(index, 'name', e.target.value)} icon={Award} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FloatingLabelInput label="License Number" name={`lic_num_${index}`} value={lic.number} onChange={(e) => updateLicense(index, 'number', e.target.value)} />
                <FloatingLabelInput label="Valid Until" name={`lic_valid_${index}`} value={lic.valid_until} onChange={(e) => updateLicense(index, 'valid_until', e.target.value)} type="date" icon={Calendar} />
              </div>
            </div>
          </div>
        ))}

        {licenses.length < 2 && (
          <button type="button" onClick={addLicense} className="flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium text-sm transition-colors">
            <Plus className="w-4 h-4" /> Add License
          </button>
        )}
      </div>

      <div className="pt-4 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Civil Service Eligibility
          <Tooltip text="Government exams you've passed (e.g., Professional, Sub-professional, Career Service)." />
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FloatingLabelInput label="Eligibility" name="civil_service_eligibility" value={formData.civil_service_eligibility} onChange={handleChange} icon={Shield} />
          <FloatingLabelInput label="Date Taken" name="civil_service_date" value={formData.civil_service_date} onChange={handleChange} type="date" icon={Calendar} />
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Work Experience</h3>
        <p className="text-sm text-gray-500 mb-4">Optional — add up to 5 entries. Start with the most recent.</p>

        {experiences.map((exp, index) => (
          <div key={index} className="relative p-4 bg-gray-50 rounded-xl mb-4 animate-scale-in">
            <button type="button" onClick={() => removeExperience(index)} className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 transition-colors">
              <X className="w-5 h-5" />
            </button>
            <p className="text-sm font-medium text-gray-600 mb-3">Experience {index + 1}</p>
            <div className="space-y-3">
              <FloatingLabelInput label="Company Name" name={`exp_company_${index}`} value={exp.company} onChange={(e) => updateExperience(index, 'company', e.target.value)} icon={Briefcase} required error={errors[`exp_company_${index}`]} />
              <FloatingLabelInput label="Address (City/Municipality)" name={`exp_address_${index}`} value={exp.address} onChange={(e) => updateExperience(index, 'address', e.target.value)} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FloatingLabelInput label="Position" name={`exp_position_${index}`} value={exp.position} onChange={(e) => updateExperience(index, 'position', e.target.value)} required error={errors[`exp_position_${index}`]} />
                <FloatingLabelInput label="Number of Months" name={`exp_months_${index}`} value={exp.months} onChange={(e) => updateExperience(index, 'months', e.target.value)} type="number" inputMode="numeric" min="1" />
              </div>
              <SearchableSelect label="Employment Status" name={`exp_status_${index}`} value={exp.employment_status} onChange={(e) => updateExperience(index, 'employment_status', e.target.value)} options={WORK_STATUS_OPTIONS} />
            </div>
          </div>
        ))}

        {experiences.length < 5 && (
          <button type="button" onClick={addExperience} className="flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium text-sm transition-colors">
            <Plus className="w-4 h-4" /> Add Work Experience
          </button>
        )}
      </div>

      <div className="pt-4 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Resume & Documents</h3>

        {userId && (
          <div className="mb-4">
            <label className="label">Resume <span className="text-red-500">*</span></label>
            <ResumeUpload userId={userId} storagePath={`${userId}/resume.pdf`}
              onUploadComplete={(url) => setFormData(prev => ({ ...prev, resume_url: url }))} existingUrl={formData.resume_url} />
            {errors.resume_url && <p className="mt-1 text-sm text-red-500">{errors.resume_url}</p>}
          </div>
        )}

        <FloatingLabelInput label="Portfolio URL" name="portfolio_url" value={formData.portfolio_url} onChange={handleChange} placeholder="https://..." />

        <div className="mt-4">
          <label className="label">Supporting Documents (Certificates)</label>
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-primary-400 transition-colors">
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" multiple onChange={handleCertificateUpload} className="hidden" id="cert-upload" />
            <label htmlFor="cert-upload" className="cursor-pointer">
              <Award className="w-10 h-10 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Click to upload certificates</p>
              <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG — max 2MB each</p>
            </label>
          </div>
          {(formData.certificate_urls || []).length > 0 && (
            <div className="mt-3 space-y-2">
              {formData.certificate_urls.map((file, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-700 truncate">{file.name}</span>
                  <button type="button" onClick={() => removeCertificateFile(i)} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export { Step5SkillsExperience, PREDEFINED_SKILLS, WORK_STATUS_OPTIONS }
