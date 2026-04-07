import { useState, useMemo } from 'react'
import { MapPin, Phone } from 'lucide-react'
import { FloatingLabelInput } from '../forms/FloatingLabelInput'
import { SearchableSelect } from '../forms/SearchableSelect'
import { AnimatedSection } from '../forms/AnimatedSection'
import { Tooltip } from '../forms/Tooltip'
import psgcData from '../../data/psgc.json'

const EMPLOYMENT_TYPES = ['Full-time', 'Part-time']

const SELF_EMPLOYMENT_TYPES = [
  'Freelancer', 'Vendor/Retailer', 'Home-based', 'Transport',
  'Domestic Worker', 'Artisan/Craft Worker', 'Others'
]

const UNEMPLOYMENT_REASONS = [
  'New Entrant/Fresh Graduate', 'Finished Contract', 'Resigned',
  'Retired', 'Terminated/Laid Off', 'Others'
]

const CITY_OR_MUNICIPALITY_SUFFIX = /\b(city|municipality)\b/gi

function normalizeLocationName(value = '') {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\bsta\b\.?/g, 'santa')
    .replace(/\bsto\b\.?/g, 'santo')
    .replace(/\bof\b/g, '')
    .replace(CITY_OR_MUNICIPALITY_SUFFIX, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function sortNames(values = []) {
  return [...values].sort((a, b) => a.localeCompare(b))
}

function findProvinceByName(provinceName) {
  if (!provinceName) return null

  return psgcData.provinces.find((province) => (
    province.name === provinceName || normalizeLocationName(province.name) === normalizeLocationName(provinceName)
  )) || null
}

function findMunicipalityByName(province, municipalityName) {
  if (!province || !municipalityName) return null

  return province.municipalities.find((municipality) => (
    municipality.name === municipalityName || normalizeLocationName(municipality.name) === normalizeLocationName(municipalityName)
  )) || null
}

function Step3ContactEmployment({ formData, handleChange, setFormData, errors = {} }) {
  const resolvedProvince = useMemo(() => findProvinceByName(formData.province), [formData.province])
  const resolvedProvinceName = resolvedProvince?.name ?? formData.province

  const resolvedCity = useMemo(() => findMunicipalityByName(resolvedProvince, formData.city), [resolvedProvince, formData.city])
  const resolvedCityName = resolvedCity?.name ?? formData.city

  const provinces = useMemo(() => sortNames(psgcData.provinces.map(p => p.name)), [])

  const municipalities = useMemo(() => {
    if (!resolvedProvince) return []
    return sortNames(resolvedProvince.municipalities.map(m => m.name))
  }, [resolvedProvince])

  const barangays = useMemo(() => {
    if (!resolvedCity) return []
    return sortNames(resolvedCity.barangays)
  }, [resolvedCity])

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
      unemployment_reason_specify: '',
      months_looking_for_work: ''
    }))
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-800">Contact Information</h3>

      <FloatingLabelInput label="House No. / Street / Village" name="street_address" value={formData.street_address} onChange={handleChange} icon={MapPin} required error={errors.street_address} />

      <SearchableSelect label="Province" name="province" value={resolvedProvinceName} onChange={handleProvinceChange} options={provinces} required error={errors.province} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SearchableSelect label="Municipality / City" name="city" value={resolvedCityName} onChange={handleCityChange} options={municipalities} required error={errors.city} />
        <SearchableSelect label="Barangay" name="barangay" value={formData.barangay} onChange={handleChange} options={barangays} required error={errors.barangay} />
      </div>

      <FloatingLabelInput label="Mobile Number" name="mobile_number" value={formData.mobile_number} onChange={handleChange} type="tel" inputMode="numeric" icon={Phone} required error={errors.mobile_number} placeholder="09XXXXXXXXX" />

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
          <AnimatedSection show={formData.unemployment_reason === 'Others'}>
            <FloatingLabelInput label="Please specify" name="unemployment_reason_specify" value={formData.unemployment_reason_specify} onChange={handleChange} required error={errors.unemployment_reason_specify} />
          </AnimatedSection>
          <FloatingLabelInput label="Months Looking for Work" name="months_looking_for_work" value={formData.months_looking_for_work} onChange={handleChange} type="number" inputMode="numeric" min="0" />
        </div>
      </AnimatedSection>
    </div>
  )
}

export { Step3ContactEmployment, EMPLOYMENT_TYPES, SELF_EMPLOYMENT_TYPES, UNEMPLOYMENT_REASONS }
