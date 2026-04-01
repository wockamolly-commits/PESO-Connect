import { GraduationCap, Calendar, Plus, X } from 'lucide-react'
import { FloatingLabelInput } from '../forms/FloatingLabelInput'
import { SearchableSelect } from '../forms/SearchableSelect'
import { AnimatedSection } from '../forms/AnimatedSection'
import { Tooltip } from '../forms/Tooltip'
import coursesData from '../../data/courses.json'

const EDUCATION_LEVELS = [
  'Elementary',
  'Secondary (Non-K12)',
  'Secondary (K-12)',
  'Senior High School',
  'Tertiary',
  'Graduate Studies / Post-graduate'
]

const CERTIFICATE_LEVELS = ['NC I', 'NC II', 'NC III', 'NC IV', 'None', 'Others']

const EMPTY_TRAINING = { course: '', institution: '', hours: '', skills_acquired: '', certificate_level: '' }

function Step4Education({ formData, handleChange, setFormData, errors = {} }) {
  const showUndergraduateFields = formData.did_not_graduate === true

  const getCourseOptions = () => {
    const level = formData.highest_education
    if (!level) return []
    if (level === 'Senior High School') return coursesData.seniorHigh
    if (level === 'Tertiary') return coursesData.tertiary
    if (level === 'Graduate Studies / Post-graduate') return coursesData.graduate
    return []
  }

  const courseOptions = getCourseOptions()
  const showCourseField = ['Senior High School', 'Tertiary', 'Graduate Studies / Post-graduate'].includes(formData.highest_education)

  const handleEducationLevelChange = (e) => {
    setFormData(prev => ({ ...prev, highest_education: e.target.value, course_or_field: '' }))
  }

  const trainings = formData.vocational_training || []

  const addTraining = () => {
    if (trainings.length >= 3) return
    setFormData(prev => ({ ...prev, vocational_training: [...(prev.vocational_training || []), { ...EMPTY_TRAINING }] }))
  }

  const updateTraining = (index, field, value) => {
    setFormData(prev => {
      const updated = [...(prev.vocational_training || [])]
      updated[index] = { ...updated[index], [field]: value }
      return { ...prev, vocational_training: updated }
    })
  }

  const removeTraining = (index) => {
    setFormData(prev => ({
      ...prev,
      vocational_training: (prev.vocational_training || []).filter((_, i) => i !== index)
    }))
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-800">Educational Background</h3>

      <div>
        <label className="label">Currently in School <span className="text-red-500">*</span></label>
        <div className="grid grid-cols-2 gap-3">
          {[{ label: 'Yes', value: true }, { label: 'No', value: false }].map(opt => (
            <button key={opt.label} type="button" onClick={() => setFormData(prev => ({ ...prev, currently_in_school: opt.value }))}
              className={`p-3 rounded-xl border-2 text-center transition-all duration-200 ${formData.currently_in_school === opt.value ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <SearchableSelect label="Highest Education Level" name="highest_education" value={formData.highest_education} onChange={handleEducationLevelChange} options={EDUCATION_LEVELS} icon={GraduationCap} required error={errors.highest_education} />

      <FloatingLabelInput label="School or Institution" name="school_name" value={formData.school_name} onChange={handleChange} required error={errors.school_name} />

      <AnimatedSection show={showCourseField}>
        <div className="mt-4">
          <SearchableSelect label="Course / Field of Study" name="course_or_field" value={formData.course_or_field} onChange={handleChange}
            options={courseOptions} grouped={courseOptions.length > 0 && typeof courseOptions[0] === 'object' && 'courses' in courseOptions[0]}
            placeholder="Search or select a course..." />
        </div>
      </AnimatedSection>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FloatingLabelInput label="Year Graduated" name="year_graduated" value={formData.year_graduated} onChange={handleChange} type="number" inputMode="numeric" icon={Calendar} min="1950" max={new Date().getFullYear()} />
      </div>

      {formData.highest_education && (
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={formData.did_not_graduate || false}
            onChange={(e) => setFormData(prev => ({ ...prev, did_not_graduate: e.target.checked }))}
            className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
          <span className="text-sm text-gray-700">I did not graduate</span>
        </label>
      )}

      <AnimatedSection show={showUndergraduateFields}>
        <div className="space-y-4 mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
          <p className="text-sm text-yellow-800 font-medium">Please fill in the following:</p>
          <FloatingLabelInput label="Level Reached" name="education_level_reached" value={formData.education_level_reached} onChange={handleChange} />
          <FloatingLabelInput label="Year Last Attended" name="year_last_attended" value={formData.year_last_attended} onChange={handleChange} type="number" inputMode="numeric" min="1950" max={new Date().getFullYear()} />
        </div>
      </AnimatedSection>

      <div className="pt-4 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Technical/Vocational Training
          <Tooltip text="Include TESDA courses or any vocational/technical training you have completed." />
        </h3>
        <p className="text-sm text-gray-500 mb-4">Optional — add up to 3 training entries.</p>

        {trainings.map((training, index) => (
          <div key={index} className="relative p-4 bg-gray-50 rounded-xl mb-4 animate-scale-in">
            <button type="button" onClick={() => removeTraining(index)} className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 transition-colors">
              <X className="w-5 h-5" />
            </button>
            <p className="text-sm font-medium text-gray-600 mb-3">Training {index + 1}</p>
            <div className="space-y-3">
              <FloatingLabelInput label="Training/Vocational Course" name={`training_course_${index}`} value={training.course} onChange={(e) => updateTraining(index, 'course', e.target.value)} />
              <FloatingLabelInput label="Training Institution" name={`training_institution_${index}`} value={training.institution} onChange={(e) => updateTraining(index, 'institution', e.target.value)} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FloatingLabelInput label="Hours of Training" name={`training_hours_${index}`} value={training.hours} onChange={(e) => updateTraining(index, 'hours', e.target.value)} type="number" inputMode="numeric" min="1" />
                <SearchableSelect label="Certificate Received" name={`training_cert_${index}`} value={training.certificate_level} onChange={(e) => updateTraining(index, 'certificate_level', e.target.value)} options={CERTIFICATE_LEVELS} />
              </div>
              <FloatingLabelInput label="Skills Acquired" name={`training_skills_${index}`} value={training.skills_acquired} onChange={(e) => updateTraining(index, 'skills_acquired', e.target.value)} />
            </div>
          </div>
        ))}

        {trainings.length < 3 && (
          <button type="button" onClick={addTraining} className="flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium text-sm transition-colors">
            <Plus className="w-4 h-4" /> Add Training
          </button>
        )}
      </div>
    </div>
  )
}

export { Step4Education, EDUCATION_LEVELS, CERTIFICATE_LEVELS }
