import { User, Calendar, Ruler } from 'lucide-react'
import { FloatingLabelInput } from '../forms/FloatingLabelInput'
import { SearchableSelect } from '../forms/SearchableSelect'
import { AnimatedSection } from '../forms/AnimatedSection'
import { Tooltip } from '../forms/Tooltip'

const SUFFIX_OPTIONS = ['None', 'Jr.', 'Sr.', 'III', 'IV', 'V']
const CIVIL_STATUS_OPTIONS = ['Single', 'Married', 'Widowed', 'Separated', 'Solo Parent']
const DISABILITY_TYPES = ['Visual', 'Hearing', 'Speech', 'Physical', 'Mental', 'Others']
const RELIGION_OPTIONS = [
  'Roman Catholic', 'Islam', 'Iglesia ni Cristo', 'Evangelical Christianity',
  'Philippine Independent Church (Aglipayan)', 'Seventh-day Adventist',
  'Bible Baptist Church', 'United Church of Christ in the Philippines',
  'Jehovah\'s Witnesses', 'Church of Christ', 'Born Again Christian',
  'Others', 'Prefer not to say'
]

function Step2PersonalInfo({ formData, handleChange, setFormData, errors = {} }) {
  const handleDisabilityToggle = (type) => {
    const current = formData.disability_type || []
    const updated = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type]
    setFormData(prev => ({ ...prev, disability_type: updated }))
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FloatingLabelInput label="Surname" name="surname" value={formData.surname} onChange={handleChange} icon={User} required error={errors.surname} />
        <FloatingLabelInput label="First Name" name="first_name" value={formData.first_name} onChange={handleChange} required error={errors.first_name} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FloatingLabelInput label="Middle Name" name="middle_name" value={formData.middle_name} onChange={handleChange} />
        <SearchableSelect label="Suffix" name="suffix" value={formData.suffix} onChange={handleChange} options={SUFFIX_OPTIONS} placeholder="None" />
      </div>

      <FloatingLabelInput label="Date of Birth" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} type="date" icon={Calendar} required error={errors.date_of_birth} />

      <div>
        <label className="label">Sex <span className="text-red-500">*</span></label>
        <div className="grid grid-cols-2 gap-3">
          {['Male', 'Female'].map(option => (
            <button key={option} type="button" onClick={() => handleChange({ target: { name: 'sex', value: option } })}
              className={`p-3 rounded-xl border-2 text-center transition-all duration-200 ${formData.sex === option ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}>
              {option}
            </button>
          ))}
        </div>
        {errors.sex && <p className="mt-1 text-sm text-red-500">{errors.sex}</p>}
      </div>

      <SearchableSelect label="Civil Status" name="civil_status" value={formData.civil_status} onChange={handleChange} options={CIVIL_STATUS_OPTIONS} required error={errors.civil_status} />

      <SearchableSelect label="Religion" name="religion" value={formData.religion} onChange={handleChange} options={RELIGION_OPTIONS} error={errors.religion} />

      <AnimatedSection show={formData.religion === 'Others'}>
        <FloatingLabelInput label="Please specify religion" name="religion_specify" value={formData.religion_specify} onChange={handleChange} required error={errors.religion_specify} />
      </AnimatedSection>

      <FloatingLabelInput label="Height (cm)" name="height_cm" value={formData.height_cm} onChange={handleChange} type="number" inputMode="numeric" min="50" max="300" icon={Ruler} error={errors.height_cm} />

      <div>
        <label className="label">
          Person with Disability (PWD) <span className="text-red-500">*</span>
          <Tooltip text="Select 'Yes' if you have any form of disability. This helps us connect you with inclusive employers." />
        </label>
        <div className="grid grid-cols-2 gap-3">
          {[{ label: 'Yes', value: true }, { label: 'No', value: false }].map(opt => (
            <button key={opt.label} type="button"
              onClick={() => setFormData(prev => ({ ...prev, is_pwd: opt.value, ...(!opt.value && { disability_type: [], pwd_id_number: '' }) }))}
              className={`p-3 rounded-xl border-2 text-center transition-all duration-200 ${formData.is_pwd === opt.value ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatedSection show={formData.is_pwd === true}>
        <div className="space-y-4 mt-4 p-4 bg-gray-50 rounded-xl">
          <div>
            <label className="label">
              Disability Type <span className="text-red-500">*</span>
              <Tooltip text="Select all types of disability that apply to you." />
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {DISABILITY_TYPES.map(type => (
                <label key={type} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors">
                  <input type="checkbox" checked={(formData.disability_type || []).includes(type)} onChange={() => handleDisabilityToggle(type)}
                    className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                  <span className="text-sm text-gray-700">{type}</span>
                </label>
              ))}
            </div>
            {errors.disability_type && <p className="mt-1 text-sm text-red-500">{errors.disability_type}</p>}
          </div>
          <AnimatedSection show={(formData.disability_type || []).includes('Others')}>
            <FloatingLabelInput label="Please specify disability" name="disability_type_specify" value={formData.disability_type_specify} onChange={handleChange} required error={errors.disability_type_specify} />
          </AnimatedSection>
          <FloatingLabelInput label="PWD ID Number" name="pwd_id_number" value={formData.pwd_id_number} onChange={handleChange} />
        </div>
      </AnimatedSection>
    </div>
  )
}

export { Step2PersonalInfo, SUFFIX_OPTIONS, CIVIL_STATUS_OPTIONS, DISABILITY_TYPES, RELIGION_OPTIONS }
