import React, { useState, useMemo } from 'react';
import { GraduationCap, Plus, X } from 'lucide-react';
import coursesData from '../../data/courses.json';

const EDUCATION_LEVELS = [
  'Elementary',
  'Secondary (Non-K12)',
  'Secondary (K-12)',
  'Tertiary',
  'Graduate Studies / Post-graduate'
];

const SHS_STRANDS = ['STEM', 'ABM', 'HUMSS', 'GAS', 'TVL', 'Sports', 'Arts & Design'];

const DEFAULT_LANGUAGES = [
  { language: 'English', read: false, write: false, speak: false, understand: false },
  { language: 'Filipino', read: false, write: false, speak: false, understand: false },
  { language: 'Mandarin', read: false, write: false, speak: false, understand: false },
];

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

export default function Step6EducationLanguage({ formData, handleChange, setFormData }) {
  const [newLanguage, setNewLanguage] = useState('');
  const [courseSearch, setCourseSearch] = useState('');

  const isTertiaryOrHigher = ['Tertiary', 'Graduate Studies / Post-graduate'].includes(formData.highest_education);
  const isK12 = formData.highest_education === 'Secondary (K-12)';
  const isCurrentlyEnrolled = formData.currently_in_school === 'yes';

  // Flatten courses for search
  const allCourses = useMemo(() => {
    const result = [];
    coursesData.categories.forEach(cat => {
      cat.courses.forEach(course => {
        result.push({ category: cat.name, course });
      });
    });
    return result;
  }, []);

  const filteredCourses = useMemo(() => {
    if (!courseSearch) return allCourses;
    const q = courseSearch.toLowerCase();
    return allCourses.filter(c =>
      c.course.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)
    );
  }, [courseSearch, allCourses]);

  // Language helpers
  const languages = formData.languages && formData.languages.length > 0
    ? formData.languages
    : DEFAULT_LANGUAGES;

  const toggleLangSkill = (langIndex, skill) => {
    const updated = languages.map((lang, i) => {
      if (i !== langIndex) return lang;
      return { ...lang, [skill]: !lang[skill] };
    });
    setFormData(prev => ({ ...prev, languages: updated }));
  };

  const addLanguage = () => {
    if (!newLanguage.trim()) return;
    const updated = [...languages, { language: newLanguage.trim(), read: false, write: false, speak: false, understand: false }];
    setFormData(prev => ({ ...prev, languages: updated }));
    setNewLanguage('');
  };

  const removeLanguage = (index) => {
    if (index < 3) return;
    const updated = languages.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, languages: updated }));
  };

  const handleEducationChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({
      ...prev,
      highest_education: value,
      senior_high_strand: '',
      course_or_field: value === prev.highest_education ? prev.course_or_field : '',
    }));
  };

  const handleCurrentlyInSchoolChange = (value) => {
    setFormData(prev => ({
      ...prev,
      currently_in_school: value,
      currently_enrolled: value === 'yes',
      ...(value === 'yes' ? { year_graduated: '' } : { level_reached: '', year_last_attended: '' }),
    }));
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Education & Language</h2>
        <p className="text-sm text-gray-400 mt-1">Your educational background and language skills</p>
      </div>

      {/* Section: Education */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Educational Background</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Highest Education */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          Highest Educational Attainment <span className="text-red-500">*</span>
        </label>
        <select
          name="highest_education"
          value={formData.highest_education || ''}
          onChange={handleEducationChange}
          className="input-field w-full"
        >
          <option value="">Select...</option>
          {EDUCATION_LEVELS.map(level => (
            <option key={level} value={level}>{level}</option>
          ))}
        </select>
      </div>

      {/* Currently in school */}
      {formData.highest_education && (
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-2">
            Currently in school?
          </label>
          <div className="flex gap-2">
            <RadioPill selected={isCurrentlyEnrolled} onClick={() => handleCurrentlyInSchoolChange('yes')}>Yes</RadioPill>
            <RadioPill selected={!isCurrentlyEnrolled} onClick={() => handleCurrentlyInSchoolChange('no')}>No</RadioPill>
          </div>
        </div>
      )}

      {/* Senior High Strand (K-12 only) */}
      {isK12 && (
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Senior High Strand <span className="text-gray-400 font-normal text-xs">(optional)</span>
          </label>
          <select
            name="senior_high_strand"
            value={formData.senior_high_strand || ''}
            onChange={handleChange}
            className="input-field w-full"
          >
            <option value="">Select strand...</option>
            {SHS_STRANDS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}

      {/* Course (Tertiary+ only) */}
      {isTertiaryOrHigher && (
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Course / Field of Study <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={courseSearch || formData.course_or_field || ''}
            onChange={(e) => setCourseSearch(e.target.value)}
            onFocus={() => { if (formData.course_or_field && !courseSearch) setCourseSearch(''); }}
            placeholder="Search courses..."
            className="input-field w-full"
          />
          {courseSearch && (
            <div className="mt-1 max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-white shadow-lg">
              {filteredCourses.length === 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, course_or_field: courseSearch }));
                    setCourseSearch('');
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50"
                >
                  Use "{courseSearch}" as custom course
                </button>
              ) : (
                <>
                  {filteredCourses.slice(0, 20).map((c, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, course_or_field: c.course }));
                        setCourseSearch('');
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 border-b border-gray-50 last:border-0"
                    >
                      <span className="font-medium">{c.course}</span>
                      <span className="text-xs text-gray-400 ml-2">{c.category}</span>
                    </button>
                  ))}
                  {filteredCourses.length > 20 && (
                    <div className="px-3 py-2 text-xs text-gray-400">
                      {filteredCourses.length - 20} more results — keep typing to narrow down
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          {formData.course_or_field && !courseSearch && (
            <div className="mt-1 flex items-center gap-2 text-sm text-indigo-600">
              <GraduationCap className="w-4 h-4" />
              {formData.course_or_field}
              <button type="button" onClick={() => setFormData(prev => ({ ...prev, course_or_field: '' }))}
                className="text-gray-400 hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Year Graduated OR Level Reached */}
      {formData.highest_education && !isCurrentlyEnrolled && (
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Year Graduated <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="year_graduated"
            value={formData.year_graduated || ''}
            onChange={handleChange}
            placeholder="e.g. 2020"
            min="1950"
            max={new Date().getFullYear()}
            className="input-field w-full"
          />
        </div>
      )}

      {formData.highest_education && isCurrentlyEnrolled && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Level Reached <span className="text-gray-400 font-normal text-xs">(optional)</span>
            </label>
            <input
              type="text"
              name="level_reached"
              value={formData.level_reached || ''}
              onChange={handleChange}
              placeholder="e.g. 3rd Year"
              className="input-field w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Year Last Attended <span className="text-gray-400 font-normal text-xs">(optional)</span>
            </label>
            <input
              type="number"
              name="year_last_attended"
              value={formData.year_last_attended || ''}
              onChange={handleChange}
              placeholder="e.g. 2024"
              min="1950"
              max={new Date().getFullYear()}
              className="input-field w-full"
            />
          </div>
        </div>
      )}

      {/* Section: Language Proficiency */}
      <div className="flex items-center gap-3 pt-2">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Language Proficiency</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-xs font-semibold text-gray-500 uppercase text-left py-2 pr-2">Language</th>
              {['Read', 'Write', 'Speak', 'Understand'].map(skill => (
                <th key={skill} className="text-xs font-semibold text-gray-500 uppercase text-center py-2 px-1">{skill}</th>
              ))}
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {languages.map((lang, i) => (
              <tr key={i} className="border-t border-gray-100">
                <td className="py-2 pr-2 text-sm font-medium text-gray-800">{lang.language}</td>
                {['read', 'write', 'speak', 'understand'].map(skill => (
                  <td key={skill} className="text-center py-2 px-1">
                    <button
                      type="button"
                      onClick={() => toggleLangSkill(i, skill)}
                      className={`w-5 h-5 rounded border-2 inline-flex items-center justify-center text-xs transition-all ${
                        lang[skill]
                          ? 'border-indigo-500 bg-indigo-500 text-white'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {lang[skill] && '✓'}
                    </button>
                  </td>
                ))}
                <td className="py-2 pl-1">
                  {i >= 3 && (
                    <button type="button" onClick={() => removeLanguage(i)} className="text-gray-400 hover:text-red-500">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add language */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newLanguage}
          onChange={(e) => setNewLanguage(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLanguage(); } }}
          placeholder="Add another language..."
          className="input-field flex-1"
        />
        <button
          type="button"
          onClick={addLanguage}
          disabled={!newLanguage.trim()}
          className="px-3 py-2 rounded-lg border-[1.5px] border-indigo-200 text-indigo-600 hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <p className="text-xs text-gray-400">Check at least 1 language with 1 proficiency</p>
    </div>
  );
}
