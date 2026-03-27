import React from 'react';
import { Calendar } from 'lucide-react';

const CIVIL_STATUS_OPTIONS = ['Single', 'Married', 'Widowed', 'Separated', 'Solo Parent'];
const SUFFIX_OPTIONS = ['', 'Jr.', 'Sr.', 'III', 'IV', 'V'];
const DISABILITY_OPTIONS = ['Visual', 'Hearing', 'Speech', 'Physical', 'Mental', 'Others'];

export default function Step2PersonalInfo({ formData, handleChange, setFormData }) {

  const handleSexSelect = (value) => {
    setFormData(prev => ({ ...prev, sex: value }));
  };

  const handleDisabilityToggle = (type) => {
    setFormData(prev => {
      const current = prev.disability || [];
      if (type === 'None') {
        return { ...prev, disability: [], disability_other: '' };
      }
      const updated = current.includes(type)
        ? current.filter(d => d !== type)
        : [...current, type];
      const newData = { ...prev, disability: updated };
      if (!updated.includes('Others')) newData.disability_other = '';
      return newData;
    });
  };

  const hasNoDisability = !formData.disability || formData.disability.length === 0;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Tell us about yourself</h2>
        <p className="text-sm text-gray-400 mt-1">Fields marked with <span className="text-red-500">*</span> are required</p>
      </div>

      {/* Surname + Suffix row */}
      <div className="flex gap-3">
        <div className="flex-[2]">
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Surname <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="surname"
            value={formData.surname || ''}
            onChange={handleChange}
            placeholder="e.g. Dela Cruz"
            className="input-field w-full"
          />
        </div>
        <div className="flex-[0.8]">
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Suffix <span className="text-gray-400 font-normal text-xs">(optional)</span>
          </label>
          <select
            name="suffix"
            value={formData.suffix || ''}
            onChange={handleChange}
            className="input-field w-full"
          >
            <option value="">None</option>
            {SUFFIX_OPTIONS.filter(s => s).map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* First Name + Middle Name row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            First Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="first_name"
            value={formData.first_name || ''}
            onChange={handleChange}
            placeholder="e.g. Juan"
            className="input-field w-full"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Middle Name <span className="text-gray-400 font-normal text-xs">(optional)</span>
          </label>
          <input
            type="text"
            name="middle_name"
            value={formData.middle_name || ''}
            onChange={handleChange}
            placeholder="e.g. Santos"
            className="input-field w-full"
          />
        </div>
      </div>

      {/* Date of Birth */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          Date of Birth <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="date"
            name="date_of_birth"
            value={formData.date_of_birth || ''}
            onChange={handleChange}
            className="input-field w-full pl-10"
          />
        </div>
      </div>

      {/* Sex */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          Sex <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2">
          {['Male', 'Female'].map(option => (
            <button
              key={option}
              type="button"
              onClick={() => handleSexSelect(option)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-[1.5px] text-sm transition-all ${
                formData.sex === option
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-600 font-medium'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                formData.sex === option ? 'border-indigo-500' : 'border-gray-300'
              }`}>
                {formData.sex === option && <span className="w-2 h-2 rounded-full bg-indigo-500" />}
              </span>
              {option}
            </button>
          ))}
        </div>
      </div>

      {/* Civil Status */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          Civil Status <span className="text-red-500">*</span>
        </label>
        <select
          name="civil_status"
          value={formData.civil_status || ''}
          onChange={handleChange}
          className="input-field w-full"
        >
          <option value="">Select...</option>
          {CIVIL_STATUS_OPTIONS.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Optional Details Divider */}
      <div className="flex items-center gap-3 pt-2">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Optional Details</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Religion (full-width) */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          Religion <span className="text-gray-400 font-normal text-xs">(optional)</span>
        </label>
        <input
          type="text"
          name="religion"
          value={formData.religion || ''}
          onChange={handleChange}
          placeholder="e.g. Roman Catholic"
          className="input-field w-full"
        />
      </div>

      {/* TIN (full-width) */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          TIN <span className="text-gray-400 font-normal text-xs">(optional)</span>
        </label>
        <input
          type="text"
          name="tin"
          value={formData.tin || ''}
          onChange={handleChange}
          placeholder="000-000-000-000"
          className="input-field w-full"
        />
      </div>

      {/* Height */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          Height (ft) <span className="text-gray-400 font-normal text-xs">(optional)</span>
        </label>
        <input
          type="text"
          name="height"
          value={formData.height || ''}
          onChange={handleChange}
          placeholder={`e.g. 5'7"`}
          className="input-field w-full"
        />
      </div>

      {/* Disability */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          Disability <span className="text-gray-400 font-normal text-xs">(optional)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleDisabilityToggle('None')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border-[1.5px] text-sm transition-all ${
              hasNoDisability
                ? 'border-indigo-500 bg-indigo-50 text-indigo-600 font-medium'
                : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            <span className={`w-4 h-4 rounded border-2 flex items-center justify-center text-xs ${
              hasNoDisability ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-gray-300'
            }`}>
              {hasNoDisability && '✓'}
            </span>
            None
          </button>
          {DISABILITY_OPTIONS.map(option => {
            const isSelected = (formData.disability || []).includes(option);
            return (
              <button
                key={option}
                type="button"
                onClick={() => handleDisabilityToggle(option)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border-[1.5px] text-sm transition-all ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-600 font-medium'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                <span className={`w-4 h-4 rounded border-2 flex items-center justify-center text-xs ${
                  isSelected ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-gray-300'
                }`}>
                  {isSelected && '✓'}
                </span>
                {option}
              </button>
            );
          })}
        </div>
        {(formData.disability || []).includes('Others') && (
          <input
            type="text"
            name="disability_other"
            value={formData.disability_other || ''}
            onChange={handleChange}
            placeholder="Please specify disability"
            className="input-field w-full mt-2"
          />
        )}
      </div>
    </div>
  );
}
