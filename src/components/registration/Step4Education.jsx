import { GraduationCap, Calendar, Plus, X, CheckCircle } from 'lucide-react'
import { FloatingLabelInput } from '../forms/FloatingLabelInput'
import { SearchableSelect } from '../forms/SearchableSelect'
import { AnimatedSection } from '../forms/AnimatedSection'
import { Tooltip } from '../forms/Tooltip'
import coursesData from '../../data/courses.json'

const EDUCATION_LEVELS = [
  'Elementary (Grades 1-6)',
  'High School (Old Curriculum)',
  'Junior High School (Grades 7-10)',
  'Senior High School (Grades 11-12)',
  'Tertiary',
  'Graduate Studies / Post-graduate'
]

const CERTIFICATE_LEVELS = ['NC I', 'NC II', 'NC III', 'NC IV', 'None', 'Others']

const EMPTY_TRAINING = { course: '', institution: '', hours: '', skills_acquired: '', certificate_level: '' }

const EDUCATION_CARDS = [
  { value: 'Elementary (Grades 1-6)', description: 'Primary education' },
  { value: 'High School (Old Curriculum)', description: 'Pre-K12 secondary (4-year)' },
  { value: 'Junior High School (Grades 7-10)', description: 'K-12 lower secondary' },
  { value: 'Senior High School (Grades 11-12)', description: 'K-12 upper secondary with tracks' },
  { value: 'Tertiary', description: 'College / University degree' },
  { value: 'Graduate Studies / Post-graduate', description: "Master's or Doctoral program" }
]

const LEVELS_WITH_COURSE = ['Senior High School (Grades 11-12)', 'Tertiary', 'Graduate Studies / Post-graduate']

function Step4Education({ formData, handleChange, setFormData, errors = {} }) {
  const isCurrentlyInSchool = formData.currently_in_school === true
  const showDidNotGraduate = !isCurrentlyInSchool && !!formData.highest_education
  const showUndergraduateFields = !isCurrentlyInSchool && formData.did_not_graduate === true
  const showCourseField = LEVELS_WITH_COURSE.includes(formData.highest_education)
  const showYearGraduated = !!formData.highest_education && !showUndergraduateFields

  const getCourseOptions = () => {
    const level = formData.highest_education
    if (!level) return []
    if (level === 'Senior High School (Grades 11-12)') return coursesData.seniorHigh
    if (level === 'Tertiary') return coursesData.tertiary
    if (level === 'Graduate Studies / Post-graduate') return coursesData.graduate
    return []
  }

  const courseOptions = getCourseOptions()

  const handleEducationLevelChange = (value) => {
    setFormData(prev => ({
      ...prev,
      highest_education: value,
      course_or_field: '',
      did_not_graduate: prev.currently_in_school ? true : false,
      education_level_reached: '',
      year_last_attended: ''
    }))
  }

  const handleCurrentlyInSchool = (value) => {
    setFormData(prev => ({
      ...prev,
      currently_in_school: value,
      did_not_graduate: value ? true : false,
      education_level_reached: value ? '' : prev.education_level_reached,
      year_last_attended: value ? '' : prev.year_last_attended
    }))
  }

  const getLevelReachedPlaceholder = () => {
    const level = formData.highest_education
    if (level === 'Elementary (Grades 1-6)') return 'e.g., Grade 4'
    if (level === 'High School (Old Curriculum)') return 'e.g., 3rd Year'
    if (level === 'Junior High School (Grades 7-10)') return 'e.g., Grade 9'
    if (level === 'Senior High School (Grades 11-12)') return 'e.g., Grade 11'
    if (level === 'Tertiary') return 'e.g., 3rd Year'
    if (level === 'Graduate Studies / Post-graduate') return 'e.g., Completed coursework'
    return ''
  }

  // Vocational training logic (unchanged)
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
      {/* -- FORMAL EDUCATION -- */}
      <div className="border border-gray-200 rounded-2xl p-5 space-y-5">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-800">Formal Education</h3>
          {formData.highest_education && (
            <CheckCircle className="w-4 h-4 text-green-500 ml-1" />
          )}
        </div>
        <p className="text-sm text-gray-500 -mt-3">Tell us about your highest educational attainment</p>

        {/* Currently in School toggle */}
        <div>
          <label className="label">Currently in School <span className="text-red-500">*</span></label>
          <div className="grid grid-cols-2 gap-3">
            {[{ label: 'Yes', value: true }, { label: 'No', value: false }].map(opt => (
              <button key={opt.label} type="button" onClick={() => handleCurrentlyInSchool(opt.value)}
                className={`p-3 rounded-xl border-2 text-center transition-all duration-200 ${formData.currently_in_school === opt.value ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium shadow-sm' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}>
                {opt.label}
              </button>
            ))}
          </div>
          {errors.currently_in_school && (
            <p className="text-sm text-red-500 mt-1">{errors.currently_in_school}</p>
          )}
        </div>

        {/* Education Level cards — text-only, 2-col grid */}
        <div>
          <label className="label">Highest Education Level <span className="text-red-500">*</span></label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {EDUCATION_CARDS.map(card => {
              const isSelected = formData.highest_education === card.value
              return (
                <button key={card.value} type="button" onClick={() => handleEducationLevelChange(card.value)}
                  className={`p-3 rounded-xl border-2 text-left transition-all duration-200 ${isSelected ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium shadow-sm' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}>
                  <div className={`text-sm leading-tight ${isSelected ? 'text-primary-700 font-medium' : 'text-gray-800'}`}>{card.value}</div>
                  <div className="text-xs text-gray-400 leading-tight mt-0.5">{card.description}</div>
                </button>
              )
            })}
          </div>
          {errors.highest_education && (
            <p className="text-sm text-red-500 mt-1">{errors.highest_education}</p>
          )}
        </div>

        {/* School / Institution name */}
        <FloatingLabelInput label="School or Institution" name="school_name" value={formData.school_name} onChange={handleChange} placeholder="e.g., University of the Philippines" required error={errors.school_name} />

        {/* Course / Field of Study (conditional) */}
        <AnimatedSection show={showCourseField}>
          <div className="mt-1">
            <SearchableSelect label="Course / Field of Study" name="course_or_field" value={formData.course_or_field} onChange={handleChange}
              options={courseOptions} grouped={courseOptions.length > 0 && typeof courseOptions[0] === 'object' && 'courses' in courseOptions[0]}
              placeholder="Search or select a course..." />
          </div>
        </AnimatedSection>

        {/* Year Graduated / Expected Graduation Year (conditional) */}
        <AnimatedSection show={showYearGraduated}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">
            <FloatingLabelInput
              label={isCurrentlyInSchool ? 'Expected Graduation Year' : 'Year Graduated'}
              name="year_graduated" value={formData.year_graduated} onChange={handleChange}
              type="text" inputMode="numeric" pattern="[0-9]{4}" icon={Calendar}
              maxLength={4} placeholder="e.g. 2024"
            />
          </div>
        </AnimatedSection>

        {/* "I did not graduate" checkbox (hidden when currently in school) */}
        <AnimatedSection show={showDidNotGraduate}>
          <label className="flex items-center gap-2 cursor-pointer mt-1">
            <input type="checkbox" checked={formData.did_not_graduate || false}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                did_not_graduate: e.target.checked,
                ...(!e.target.checked ? { education_level_reached: '', year_last_attended: '' } : { year_graduated: '' })
              }))}
              className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
            <span className="text-sm text-gray-700">I did not graduate</span>
          </label>
        </AnimatedSection>

        {/* Level Reached + Year Last Attended (when did not graduate) */}
        <AnimatedSection show={showUndergraduateFields}>
          <div className="space-y-4 mt-1 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-sm text-blue-700 font-medium">Please provide the following details:</p>
            <FloatingLabelInput label="Level Reached" name="education_level_reached" value={formData.education_level_reached} onChange={handleChange} placeholder={getLevelReachedPlaceholder()} />
            <FloatingLabelInput label="Year Last Attended" name="year_last_attended" value={formData.year_last_attended} onChange={handleChange} type="text" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} placeholder="e.g. 2024" />
          </div>
        </AnimatedSection>
      </div>

      {/* -- TECHNICAL/VOCATIONAL TRAINING -- */}
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
