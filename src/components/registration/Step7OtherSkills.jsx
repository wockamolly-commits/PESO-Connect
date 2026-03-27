import React from 'react';
import { X } from 'lucide-react';

const OTHER_SKILLS = [
  'Auto Mechanic', 'Beautician', 'Carpentry Work', 'Computer Literate',
  'Domestic Chores', 'Driver', 'Electrician', 'Embroidery',
  'Gardening', 'Masonry', 'Painter/Artist', 'Painting Jobs',
  'Photography', 'Plumbing', 'Sewing Dresses', 'Stenography',
  'Tailoring', 'Others'
];

const TVET_LEVELS = ['NC I', 'NC II', 'NC III', 'NC IV'];

export default function Step7OtherSkills({ formData, setFormData, handleChange }) {
  const skills = formData.skills || [];
  const selectedOtherSkills = formData.other_skills || [];

  // Combined skill count: tag input + other_skills checkboxes (excluding "Others")
  const combinedSkillCount = skills.length + selectedOtherSkills.filter(s => s !== 'Others').length;

  // --- Section A: Skills tag input ---
  const handleSkillKeyDown = (e) => {
    if (e.key !== 'Enter' && e.key !== ',') return;
    e.preventDefault();
    const value = e.target.value.trim();
    if (!value) return;
    if (skills.some(s => s.toLowerCase() === value.toLowerCase())) {
      e.target.value = '';
      return;
    }
    setFormData(prev => ({ ...prev, skills: [...(prev.skills || []), value] }));
    e.target.value = '';
  };

  const removeSkill = (index) => {
    setFormData(prev => ({ ...prev, skills: prev.skills.filter((_, i) => i !== index) }));
  };

  // --- Section B: Other skills checkboxes ---
  const toggleOtherSkill = (skill) => {
    setFormData(prev => {
      const current = prev.other_skills || [];
      const updated = current.includes(skill)
        ? current.filter(s => s !== skill)
        : [...current, skill];
      const newData = { ...prev, other_skills: updated };
      if (!updated.includes('Others')) newData.other_skills_other = '';
      return newData;
    });
  };

  // --- Section C: TVET level change ---
  const handleTvetLevelChange = (e) => {
    const level = e.target.value;
    setFormData(prev => ({
      ...prev,
      tvet_certification_level: level,
      // Clear title when level is set back to None
      tvet_certification_title: level === '' ? '' : prev.tvet_certification_title,
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Skills & Qualifications</h2>
        <p className="text-sm text-gray-400 mt-1">
          Tell us what you can do. Need at least 3 skills combined.
        </p>
      </div>

      {/* Section A: Skills tag input */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
            Your Skills
          </span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          Add skills <span className="text-gray-400 font-normal">(type and press Enter)</span>
        </label>
        <input
          type="text"
          onKeyDown={handleSkillKeyDown}
          placeholder="e.g. Welding, Customer Service, Forklift Operation"
          className="input-field w-full"
        />
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {skills.map((skill, i) => (
              <span
                key={i}
                className="flex items-center gap-1 px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm rounded-full"
              >
                {skill}
                <button type="button" onClick={() => removeSkill(i)} className="ml-1 text-indigo-400 hover:text-indigo-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Section B: Other skills checkboxes (NSRP Section VIII) */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
            Other Skills (No Certificate)
          </span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>
        <div className="flex flex-wrap gap-2">
          {OTHER_SKILLS.map(skill => {
            const isSelected = selectedOtherSkills.includes(skill);
            return (
              <button
                key={skill}
                type="button"
                onClick={() => toggleOtherSkill(skill)}
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
                {skill}
              </button>
            );
          })}
        </div>
        {selectedOtherSkills.includes('Others') && (
          <div className="mt-3">
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Please specify <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="other_skills_other"
              value={formData.other_skills_other || ''}
              onChange={handleChange}
              placeholder="e.g. Baking, Sign Painting"
              className="input-field w-full"
            />
          </div>
        )}
      </div>

      {/* Combined count hint */}
      <p className={`text-xs ${combinedSkillCount >= 3 ? 'text-green-600' : 'text-gray-400'}`}>
        {combinedSkillCount} / 3 minimum skills added
        {combinedSkillCount >= 3 && ' ✓'}
      </p>

      {/* Section C: TVET/TESDA Certification */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
            TVET / TESDA Certification
          </span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>
        <p className="text-xs text-gray-400 mb-3">
          If you have a TESDA National Certificate, select the level below.
        </p>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Highest TVET Certification <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <select
            name="tvet_certification_level"
            value={formData.tvet_certification_level || ''}
            onChange={handleTvetLevelChange}
            className="input-field w-full"
          >
            <option value="">None</option>
            {TVET_LEVELS.map(level => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
        </div>
        {formData.tvet_certification_level && (
          <div className="mt-3 p-4 bg-gray-50 rounded-xl border-l-4 border-purple-400">
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Certification Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="tvet_certification_title"
              value={formData.tvet_certification_title || ''}
              onChange={handleChange}
              placeholder="e.g. Shielded Metal Arc Welding NC II"
              className="input-field w-full"
            />
            <p className="text-xs text-gray-400 mt-1">
              Enter the full title as it appears on your certificate.
            </p>
          </div>
        )}
      </div>

      {/* Section D: Most Recent Work */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
            Most Recent Work
          </span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>
        <p className="text-xs text-gray-400 mb-3">
          Helps us match you to relevant jobs. You can add full work history later in your profile.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Job Title <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              name="recent_job_title"
              value={formData.recent_job_title || ''}
              onChange={handleChange}
              placeholder="e.g. Warehouse Supervisor"
              className="input-field w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Company <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              name="recent_job_company"
              value={formData.recent_job_company || ''}
              onChange={handleChange}
              placeholder="e.g. SM Retail Inc."
              className="input-field w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
