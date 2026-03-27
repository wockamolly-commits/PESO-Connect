import React from 'react';

const SELF_EMPLOYED_TYPES = [
  'Fisherman/Fisherfolk', 'Vendor/Retailer', 'Home-based Worker',
  'Transport', 'Domestic Worker', 'Freelancer', 'Artisan/Craft Worker', 'Others'
];

const UNEMPLOYMENT_REASONS = [
  'New Entrant/Fresh Graduate', 'Finished Contract', 'Resigned', 'Retired',
  'Terminated/Laid off (Local)', 'Terminated/Laid off (Abroad)',
  'Laid off due to Calamity', 'Others'
];

function RadioPill({ selected, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-[1.5px] text-sm transition-all ${
        selected
          ? 'border-indigo-500 bg-indigo-50 text-indigo-600 font-medium'
          : 'border-gray-200 text-gray-500 hover:border-gray-300'
      }`}
    >
      <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
        selected ? 'border-indigo-500' : 'border-gray-300'
      }`}>
        {selected && <span className="w-2 h-2 rounded-full bg-indigo-500" />}
      </span>
      {children}
    </button>
  );
}

function CheckPill({ selected, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border-[1.5px] text-sm transition-all ${
        selected
          ? 'border-indigo-500 bg-indigo-50 text-indigo-600 font-medium'
          : 'border-gray-200 text-gray-500 hover:border-gray-300'
      }`}
    >
      <span className={`w-4 h-4 rounded border-2 flex items-center justify-center text-xs ${
        selected ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-gray-300'
      }`}>
        {selected && '✓'}
      </span>
      {children}
    </button>
  );
}

export default function Step4EmploymentStatus({ formData, handleChange, setFormData }) {

  const setField = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleArrayField = (fieldName, value) => {
    setFormData(prev => {
      const current = prev[fieldName] || [];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [fieldName]: updated };
    });
  };

  const handleStatusChange = (status) => {
    setFormData(prev => ({
      ...prev,
      employment_status: status,
      employment_type: '',
      self_employed_type: [],
      self_employed_other: '',
      unemployment_months: '',
      unemployment_reason: [],
      unemployment_reason_other: '',
      terminated_abroad_country: '',
    }));
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Your employment status</h2>
        <p className="text-sm text-gray-400 mt-1">This helps us match you with the right opportunities</p>
      </div>

      {/* Employment Status */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-2">
          Current Status <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2">
          <RadioPill
            selected={formData.employment_status === 'employed'}
            onClick={() => handleStatusChange('employed')}
          >
            Employed
          </RadioPill>
          <RadioPill
            selected={formData.employment_status === 'unemployed'}
            onClick={() => handleStatusChange('unemployed')}
          >
            Unemployed
          </RadioPill>
        </div>
      </div>

      {/* Employed conditional */}
      {formData.employment_status === 'employed' && (
        <div className="p-4 bg-gray-50 rounded-xl border-l-[3px] border-indigo-500 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">
              Employment Type <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <RadioPill
                selected={formData.employment_type === 'wage_employed'}
                onClick={() => setField('employment_type', 'wage_employed')}
              >
                Wage Employed
              </RadioPill>
              <RadioPill
                selected={formData.employment_type === 'self_employed'}
                onClick={() => setField('employment_type', 'self_employed')}
              >
                Self-Employed
              </RadioPill>
            </div>
          </div>

          {formData.employment_type === 'self_employed' && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">
                Type of Self-Employment <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {SELF_EMPLOYED_TYPES.map(type => (
                  <CheckPill
                    key={type}
                    selected={(formData.self_employed_type || []).includes(type)}
                    onClick={() => toggleArrayField('self_employed_type', type)}
                  >
                    {type}
                  </CheckPill>
                ))}
              </div>
              {(formData.self_employed_type || []).includes('Others') && (
                <input
                  type="text"
                  name="self_employed_other"
                  value={formData.self_employed_other || ''}
                  onChange={handleChange}
                  placeholder="Please specify"
                  className="input-field w-full mt-2"
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Unemployed conditional */}
      {formData.employment_status === 'unemployed' && (
        <div className="p-4 bg-gray-50 rounded-xl border-l-[3px] border-indigo-500 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              How long have you been looking for work?
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                name="unemployment_months"
                value={formData.unemployment_months || ''}
                onChange={handleChange}
                placeholder="e.g. 6"
                min="0"
                className="input-field w-24"
              />
              <span className="text-sm text-gray-500">months</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">
              Reason <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {UNEMPLOYMENT_REASONS.map(reason => (
                <CheckPill
                  key={reason}
                  selected={(formData.unemployment_reason || []).includes(reason)}
                  onClick={() => toggleArrayField('unemployment_reason', reason)}
                >
                  {reason}
                </CheckPill>
              ))}
            </div>
            {(formData.unemployment_reason || []).includes('Terminated/Laid off (Abroad)') && (
              <input
                type="text"
                name="terminated_abroad_country"
                value={formData.terminated_abroad_country || ''}
                onChange={handleChange}
                placeholder="Specify country"
                className="input-field w-full mt-2"
              />
            )}
            {(formData.unemployment_reason || []).includes('Others') && (
              <input
                type="text"
                name="unemployment_reason_other"
                value={formData.unemployment_reason_other || ''}
                onChange={handleChange}
                placeholder="Please specify reason"
                className="input-field w-full mt-2"
              />
            )}
          </div>
        </div>
      )}

      {/* Optional section */}
      <div className="flex items-center gap-3 pt-2">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Optional</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* OFW */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-2">
          Are you an OFW? <span className="text-gray-400 font-normal text-xs">(optional)</span>
        </label>
        <div className="flex gap-2">
          <RadioPill selected={formData.is_ofw === 'yes'} onClick={() => setField('is_ofw', 'yes')}>Yes</RadioPill>
          <RadioPill selected={formData.is_ofw !== 'yes'} onClick={() => { setField('is_ofw', 'no'); setField('ofw_country', ''); }}>No</RadioPill>
        </div>
        {formData.is_ofw === 'yes' && (
          <input type="text" name="ofw_country" value={formData.ofw_country || ''} onChange={handleChange}
            placeholder="Specify country" className="input-field w-full mt-2" />
        )}
      </div>

      {/* Former OFW */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-2">
          Are you a former OFW? <span className="text-gray-400 font-normal text-xs">(optional)</span>
        </label>
        <div className="flex gap-2">
          <RadioPill selected={formData.is_former_ofw === 'yes'} onClick={() => setField('is_former_ofw', 'yes')}>Yes</RadioPill>
          <RadioPill selected={formData.is_former_ofw !== 'yes'} onClick={() => { setField('is_former_ofw', 'no'); setField('former_ofw_country', ''); setField('former_ofw_return_date', ''); }}>No</RadioPill>
        </div>
        {formData.is_former_ofw === 'yes' && (
          <div className="grid grid-cols-2 gap-3 mt-2">
            <input type="text" name="former_ofw_country" value={formData.former_ofw_country || ''} onChange={handleChange}
              placeholder="Country of deployment" className="input-field w-full" />
            <input type="month" name="former_ofw_return_date" value={formData.former_ofw_return_date || ''} onChange={handleChange}
              className="input-field w-full" />
          </div>
        )}
      </div>

      {/* 4Ps */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-2">
          Are you a 4Ps beneficiary? <span className="text-gray-400 font-normal text-xs">(optional)</span>
        </label>
        <div className="flex gap-2">
          <RadioPill selected={formData.is_4ps === 'yes'} onClick={() => setField('is_4ps', 'yes')}>Yes</RadioPill>
          <RadioPill selected={formData.is_4ps !== 'yes'} onClick={() => { setField('is_4ps', 'no'); setField('household_id', ''); }}>No</RadioPill>
        </div>
        {formData.is_4ps === 'yes' && (
          <input type="text" name="household_id" value={formData.household_id || ''} onChange={handleChange}
            placeholder="Household ID No." className="input-field w-full mt-2" />
        )}
      </div>
    </div>
  );
}
