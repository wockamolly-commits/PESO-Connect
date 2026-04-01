import { useState, useMemo } from 'react'
import { MapPin, Phone } from 'lucide-react'
import { FloatingLabelInput } from '../forms/FloatingLabelInput'
import { SearchableSelect } from '../forms/SearchableSelect'
import { AnimatedSection } from '../forms/AnimatedSection'
import { Tooltip } from '../forms/Tooltip'
import psgcData from '../../data/psgc.json'

const CONTACT_METHODS = [
  { id: 'email', label: 'Email' },
  { id: 'sms', label: 'SMS/Text' },
  { id: 'call', label: 'Phone Call' }
]

const EMPLOYMENT_TYPES = ['Full-time', 'Part-time']

const SELF_EMPLOYMENT_TYPES = [
  'Freelancer', 'Vendor/Retailer', 'Home-based', 'Transport',
  'Domestic Worker', 'Artisan/Craft Worker', 'Others'
]

const UNEMPLOYMENT_REASONS = [
  'New Entrant/Fresh Graduate', 'Finished Contract', 'Resigned',
  'Retired', 'Terminated/Laid Off', 'Others'
]

function Step3ContactEmployment({ formData, handleChange, setFormData, errors = {} }) {
  const provinces = useMemo(() => psgcData.provinces.map(p => p.name).sort(), [])

  const municipalities = useMemo(() => {
    if (!formData.province) return []
    const prov = psgcData.provinces.find(p => p.name === formData.province)
    return prov ? prov.municipalities.map(m => m.name).sort() : []
  }, [formData.province])

  const barangays = useMemo(() => {
    if (!formData.province || !formData.city) return []
    const prov = psgcData.provinces.find(p => p.name === formData.province)
    if (!prov) return []
    const mun = prov.municipalities.find(m => m.name === formData.city)
    return mun ? mun.barangays.sort() : []
  }, [formData.province, formData.city])

  const handleProvinceChange = (e) => {
    setFormData(prev => ({ ...prev, province: e.target.value, city: '', barangay: '' }))
  }

  const handleCityChange = (e) => {
    setFormData(prev => ({ ...prev, city: e.target.value, barangay: '' }))
  }

  const handleEmploymentStatusChange = (status) => {
    setFormData(prev => ({
      ...prev,
      employment_status: status,
      employment_type: '',
      self_employment_type: '',
      self_employment_specify: '',
      unemployment_reason: '',
      months_looking_for_work: ''
    }))
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-800">Contact Information</h3>

      <FloatingLabelInput label="House No. / Street / Village" name="street_address" value={formData.street_address} onChange={handleChange} icon={MapPin} required error={errors.street_address} />

      <SearchableSelect label="Province" name="province" value={formData.province} onChange={handleProvinceChange} options={provinces} required error={errors.province} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SearchableSelect label="Municipality / City" name="city" value={formData.city} onChange={handleCityChange} options={municipalities} required error={errors.city} />
        <SearchableSelect label="Barangay" name="barangay" value={formData.barangay} onChange={handleChange} options={barangays} required error={errors.barangay} />
      </div>

      <FloatingLabelInput label="Mobile Number" name="mobile_number" value={formData.mobile_number} onChange={handleChange} type="tel" inputMode="numeric" icon={Phone} required error={errors.mobile_number} placeholder="09XXXXXXXXX" />

      <div>
        <label className="label">Preferred Contact Method</label>
        <div className="grid grid-cols-3 gap-3">
          {CONTACT_METHODS.map(method => (
            <button key={method.id} type="button" onClick={() => handleChange({ target: { name: 'preferred_contact_method', value: method.id } })}
              className={`p-3 rounded-xl border-2 text-center text-sm transition-all duration-200 ${formData.preferred_contact_method === method.id ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}>
              {method.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Employment Status</h3>
        <div className="grid grid-cols-3 gap-3">
          {['Employed', 'Unemployed', 'Self-Employed'].map(status => (
            <button key={status} type="button" onClick={() => handleEmploymentStatusChange(status)}
              className={`p-3 rounded-xl border-2 text-center text-sm transition-all duration-200 ${formData.employment_status === status ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}>
              {status}
            </button>
          ))}
        </div>
        {errors.employment_status && <p className="mt-1 text-sm text-red-500">{errors.employment_status}</p>}
      </div>

      <AnimatedSection show={formData.employment_status === 'Employed'}>
        <div className="mt-4">
          <SearchableSelect label="Employment Type" name="employment_type" value={formData.employment_type} onChange={handleChange} options={EMPLOYMENT_TYPES} required error={errors.employment_type} />
        </div>
      </AnimatedSection>

      <AnimatedSection show={formData.employment_status === 'Self-Employed'}>
        <div className="space-y-4 mt-4">
          <SearchableSelect label="Self-Employment Type" name="self_employment_type" value={formData.self_employment_type} onChange={handleChange} options={SELF_EMPLOYMENT_TYPES} required error={errors.self_employment_type} />
          <AnimatedSection show={formData.self_employment_type === 'Others'}>
            <FloatingLabelInput label="Please specify" name="self_employment_specify" value={formData.self_employment_specify} onChange={handleChange} required error={errors.self_employment_specify} />
          </AnimatedSection>
        </div>
      </AnimatedSection>

      <AnimatedSection show={formData.employment_status === 'Unemployed'}>
        <div className="space-y-4 mt-4">
          <SearchableSelect label="Reason for Unemployment" name="unemployment_reason" value={formData.unemployment_reason} onChange={handleChange} options={UNEMPLOYMENT_REASONS} required error={errors.unemployment_reason} />
          <FloatingLabelInput label="Months Looking for Work" name="months_looking_for_work" value={formData.months_looking_for_work} onChange={handleChange} type="number" inputMode="numeric" min="0" />
        </div>
      </AnimatedSection>
    </div>
  )
}

export { Step3ContactEmployment, CONTACT_METHODS, EMPLOYMENT_TYPES, SELF_EMPLOYMENT_TYPES, UNEMPLOYMENT_REASONS }
