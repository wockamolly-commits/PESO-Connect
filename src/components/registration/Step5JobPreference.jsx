import React from 'react';

function RadioPill({ selected, onClick, children }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-[1.5px] text-sm transition-all ${
        selected ? 'border-indigo-500 bg-indigo-50 text-indigo-600 font-medium' : 'border-gray-200 text-gray-500 hover:border-gray-300'
      }`}>
      <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selected ? 'border-indigo-500' : 'border-gray-300'}`}>
        {selected && <span className="w-2 h-2 rounded-full bg-indigo-500" />}
      </span>
      {children}
    </button>
  );
}

function CheckPill({ selected, onClick, children }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border-[1.5px] text-sm transition-all ${
        selected ? 'border-indigo-500 bg-indigo-50 text-indigo-600 font-medium' : 'border-gray-200 text-gray-500 hover:border-gray-300'
      }`}>
      <span className={`w-4 h-4 rounded border-2 flex items-center justify-center text-xs ${
        selected ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-gray-300'
      }`}>
        {selected && '✓'}
      </span>
      {children}
    </button>
  );
}

export default function Step5JobPreference({ formData, handleChange, setFormData }) {

  const toggleWorkType = (type) => {
    setFormData(prev => {
      const current = prev.work_type || [];
      const updated = current.includes(type) ? current.filter(t => t !== type) : [...current, type];
      return { ...prev, work_type: updated };
    });
  };

  const handleLocationTypeChange = (type) => {
    setFormData(prev => ({
      ...prev,
      work_location_type: type,
      preferred_local_locations: type === 'local' ? prev.preferred_local_locations || ['', '', ''] : [],
      preferred_overseas_locations: type === 'overseas' ? prev.preferred_overseas_locations || ['', '', ''] : [],
    }));
  };

  const updateLocationEntry = (field, index, value) => {
    setFormData(prev => {
      const arr = [...(prev[field] || ['', '', ''])];
      arr[index] = value;
      return { ...prev, [field]: arr };
    });
  };

  const updateOccupation = (index, value) => {
    setFormData(prev => {
      const arr = [...(prev.preferred_occupations || ['', '', ''])];
      arr[index] = value;
      return { ...prev, preferred_occupations: arr };
    });
  };

  const occupations = formData.preferred_occupations || ['', '', ''];
  const localLocations = formData.preferred_local_locations || ['', '', ''];
  const overseasLocations = formData.preferred_overseas_locations || ['', '', ''];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Job Preference</h2>
        <p className="text-sm text-gray-400 mt-1">What kind of work are you looking for?</p>
      </div>

      {/* Preferred Occupation */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-2">
          Preferred Occupation <span className="text-red-500">*</span>
        </label>
        <div className="space-y-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-indigo-600 flex-shrink-0">
                {i + 1}
              </span>
              <input
                type="text"
                value={occupations[i] || ''}
                onChange={(e) => updateOccupation(i, e.target.value)}
                placeholder={i === 0 ? 'e.g. Software Developer' : '(optional)'}
                className="input-field w-full"
              />
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-1">At least 1 required, up to 3</p>
      </div>

      {/* Work Type */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-2">
          Work Type <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2">
          <CheckPill selected={(formData.work_type || []).includes('Part-time')} onClick={() => toggleWorkType('Part-time')}>
            Part-time
          </CheckPill>
          <CheckPill selected={(formData.work_type || []).includes('Full-time')} onClick={() => toggleWorkType('Full-time')}>
            Full-time
          </CheckPill>
        </div>
      </div>

      {/* Preferred Work Location */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-2">
          Preferred Work Location <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2">
          <RadioPill selected={formData.work_location_type === 'local'} onClick={() => handleLocationTypeChange('local')}>
            Local
          </RadioPill>
          <RadioPill selected={formData.work_location_type === 'overseas'} onClick={() => handleLocationTypeChange('overseas')}>
            Overseas
          </RadioPill>
        </div>
      </div>

      {/* Local locations */}
      {formData.work_location_type === 'local' && (
        <div className="p-4 bg-gray-50 rounded-xl border-l-[3px] border-indigo-500">
          <label className="block text-xs font-semibold text-gray-600 mb-2">
            Preferred Cities / Municipalities <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-xs font-semibold text-indigo-600 flex-shrink-0">
                  {i + 1}
                </span>
                <input
                  type="text"
                  value={localLocations[i] || ''}
                  onChange={(e) => updateLocationEntry('preferred_local_locations', i, e.target.value)}
                  placeholder={i === 0 ? 'e.g. Quezon City' : '(optional)'}
                  className="input-field w-full"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overseas locations */}
      {formData.work_location_type === 'overseas' && (
        <div className="p-4 bg-gray-50 rounded-xl border-l-[3px] border-indigo-500">
          <label className="block text-xs font-semibold text-gray-600 mb-2">
            Preferred Countries <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-xs font-semibold text-indigo-600 flex-shrink-0">
                  {i + 1}
                </span>
                <input
                  type="text"
                  value={overseasLocations[i] || ''}
                  onChange={(e) => updateLocationEntry('preferred_overseas_locations', i, e.target.value)}
                  placeholder={i === 0 ? 'e.g. Canada' : '(optional)'}
                  className="input-field w-full"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
