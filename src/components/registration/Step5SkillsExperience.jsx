import { useState, useMemo, useEffect } from 'react'
import { Plus, X, Briefcase, Sparkles, TrendingUp, RotateCw, Check } from 'lucide-react'
import { FloatingLabelInput } from '../forms/FloatingLabelInput'
import { SearchableSelect } from '../forms/SearchableSelect'
import TagInput from '../forms/TagInput'
import ResumeUpload from '../common/ResumeUpload'
import { generateSuggestedSkills, getSkillsForPosition } from '../../utils/skillRecommender'
import { inferCategoryFromProfile, getTopDemandSkills } from '../../services/skillDemandService'
import { logSkillAcceptance } from '../../services/telemetryService'

const PREDEFINED_SKILLS = [
  'Auto Mechanic', 'Beautician', 'Carpentry Work', 'Computer Literate',
  'Domestic Chores', 'Driver', 'Electrician', 'Embroidery',
  'Gardening', 'Masonry', 'Painter/Artist', 'Painting Jobs',
  'Photography', 'Plumbing', 'Sewing/Dresses', 'Stenography',
  'Tailoring'
]

const WORK_STATUS_OPTIONS = ['Permanent', 'Contractual', 'Part-time', 'Probationary']

const EMPTY_EXPERIENCE = { company: '', address: '', position: '', year_started: '', year_ended: '', employment_status: '' }

function Step5SkillsExperience({ formData, handleChange, setFormData, userId, errors = {}, setErrors }) {
  const [skillInput, setSkillInput] = useState('')
  const [dismissedSuggestions, setDismissedSuggestions] = useState(false)
  const [refreshNonce, setRefreshNonce] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const predefinedSkills = formData.predefined_skills || []
  const customSkills = formData.skills || []

  useEffect(() => {
    const trainings = formData.vocational_training || []
    const parsed = trainings
      .flatMap(t => (t.skills_acquired || '').split(','))
      .map(s => s.trim())
      .filter(Boolean)
    if (parsed.length === 0) return
    setFormData(prev => {
      const existing = new Set([...(prev.skills || []), ...(prev.predefined_skills || [])])
      const toAdd = parsed.filter(s => !existing.has(s))
      if (toAdd.length === 0) return prev
      return { ...prev, skills: [...(prev.skills || []), ...toAdd] }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!setErrors) return
    const hasSkill = predefinedSkills.length > 0 || customSkills.length > 0
    if (hasSkill && errors.skills) {
      setErrors(prev => {
        const { skills: _removed, ...rest } = prev
        return rest
      })
    }
    if (formData.resume_url && errors.resume_url) {
      setErrors(prev => {
        const { resume_url: _removed, ...rest } = prev
        return rest
      })
    }
  }, [predefinedSkills.length, customSkills.length, formData.resume_url, errors.skills, errors.resume_url, setErrors])

  const { suggestions, predefinedToCheck, reasons, groups } = useMemo(
    () => generateSuggestedSkills(formData),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [formData.course_or_field, formData.vocational_training, formData.work_experiences, formData.preferred_occupations, refreshNonce]
  )

  const handleRefreshSuggestions = () => {
    setIsRefreshing(true)
    setRefreshNonce(n => n + 1)
    setDismissedSuggestions(false)
    setTimeout(() => setIsRefreshing(false), 600)
  }

  const inferredCategory = useMemo(
    () => inferCategoryFromProfile(formData),
    [formData.course_or_field, formData.work_experiences, formData.preferred_occupations]
  )

  const [demandSkills, setDemandSkills] = useState([])
  useEffect(() => {
    if (!inferredCategory) { setDemandSkills([]); return }
    let cancelled = false
    getTopDemandSkills(inferredCategory, 10).then(rows => {
      if (!cancelled) setDemandSkills(rows)
    })
    return () => { cancelled = true }
  }, [inferredCategory])

  const isSkillSelected = (skill) =>
    predefinedSkills.includes(skill) || customSkills.includes(skill)

  const addSuggestedSkill = (skill) => {
    if (PREDEFINED_SKILLS.includes(skill)) {
      if (!predefinedSkills.includes(skill)) {
        setFormData(prev => ({ ...prev, predefined_skills: [...(prev.predefined_skills || []), skill] }))
      }
      return
    }
    if (!customSkills.includes(skill)) {
      setFormData(prev => ({ ...prev, skills: [...(prev.skills || []), skill] }))
    }
  }

  const removeSuggestedSkill = (skill) => {
    if (PREDEFINED_SKILLS.includes(skill)) {
      setFormData(prev => ({ ...prev, predefined_skills: (prev.predefined_skills || []).filter(s => s !== skill) }))
    } else {
      setFormData(prev => ({ ...prev, skills: (prev.skills || []).filter(s => s !== skill) }))
    }
  }

  const toggleSuggestedSkill = (skill) =>
    isSkillSelected(skill) ? removeSuggestedSkill(skill) : addSuggestedSkill(skill)

  // Wraps toggleSuggestedSkill and logs telemetry only when the skill is being
  // added (not removed). source must be 'deterministic', 'ai_enrichment', or 'demand_side'.
  const handleSuggestedSkillClick = (skill, source) => {
    if (!isSkillSelected(skill)) {
      logSkillAcceptance(skill, source, inferredCategory || null, userId || null)
    }
    toggleSuggestedSkill(skill)
  }

  const addAllSuggestions = () => {
    const newPredefined = [...predefinedSkills]
    predefinedToCheck.forEach(s => { if (!newPredefined.includes(s)) newPredefined.push(s) })
    const newCustom = [...customSkills]
    suggestions.forEach(s => { if (!newCustom.includes(s)) newCustom.push(s) })
    setFormData(prev => ({ ...prev, predefined_skills: newPredefined, skills: newCustom }))
  }

  const allSuggested = [...predefinedToCheck, ...suggestions]
  const showSuggestions = !dismissedSuggestions && allSuggested.length > 0

  const groupedSections = [
    { key: 'core', label: 'Core (from your course)', skills: [...predefinedToCheck, ...(groups?.core || [])] },
    { key: 'practical', label: 'Job-aligned (likely roles)', skills: groups?.practical || [] },
    { key: 'soft', label: 'Transferable / Soft skills', skills: groups?.soft || [] },
  ].filter(g => g.skills.length > 0)

  const experiences = formData.work_experiences || []
  const addExperience = () => {
    if (experiences.length >= 5) return
    setFormData(prev => ({ ...prev, work_experiences: [...(prev.work_experiences || []), { ...EMPTY_EXPERIENCE }] }))
  }
  const updateExperience = (index, field, value) => {
    setFormData(prev => {
      const updated = [...(prev.work_experiences || [])]
      updated[index] = { ...updated[index], [field]: value }
      return { ...prev, work_experiences: updated }
    })
  }
  const removeExperience = (index) => {
    setFormData(prev => ({ ...prev, work_experiences: (prev.work_experiences || []).filter((_, i) => i !== index) }))
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Work Experience</h3>
        <p className="text-sm text-gray-500 mb-4">Optional - add up to 5 entries. Start with the most recent. Adding positions here helps us suggest more accurate skills below.</p>

        {experiences.map((exp, index) => (
          <div key={index} className="relative p-4 bg-gray-50 rounded-xl mb-4 animate-scale-in">
            <button type="button" onClick={() => removeExperience(index)} className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 transition-colors">
              <X className="w-5 h-5" />
            </button>
            <p className="text-sm font-medium text-gray-600 mb-3">Experience {index + 1}</p>
            <div className="space-y-3">
              <FloatingLabelInput label="Company Name" name={`exp_company_${index}`} value={exp.company} onChange={(e) => updateExperience(index, 'company', e.target.value)} icon={Briefcase} required error={errors[`exp_company_${index}`]} />
              <FloatingLabelInput label="Address (City/Municipality)" name={`exp_address_${index}`} value={exp.address} onChange={(e) => updateExperience(index, 'address', e.target.value)} />
              <FloatingLabelInput label="Position" name={`exp_position_${index}`} value={exp.position} onChange={(e) => updateExperience(index, 'position', e.target.value)} required error={errors[`exp_position_${index}`]} />
              {(() => {
                const positionSkills = getSkillsForPosition(exp.position).filter(s => !isSkillSelected(s))
                if (positionSkills.length === 0) return null
                return (
                  <div className="flex flex-wrap gap-1.5 -mt-1">
                    <span className="inline-flex items-center text-xs text-gray-500 mr-1">
                      <Sparkles className="w-3 h-3 mr-1 text-blue-500" />
                      Add skills:
                    </span>
                    {positionSkills.map(skill => (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => {
                          logSkillAcceptance(skill, 'ai_enrichment', inferredCategory || null, userId || null)
                          addSuggestedSkill(skill)
                        }}
                        className="px-2 py-0.5 rounded-full text-xs font-medium bg-white text-blue-700 border border-blue-300 hover:bg-blue-50 transition-colors"
                      >
                        + {skill}
                      </button>
                    ))}
                  </div>
                )
              })()}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <FloatingLabelInput label="Year Started" name={`exp_year_started_${index}`} value={exp.year_started} onChange={(e) => updateExperience(index, 'year_started', e.target.value)} type="number" inputMode="numeric" min="1950" max={new Date().getFullYear()} placeholder="e.g. 2020" error={errors[`exp_year_started_${index}`]} />
                <FloatingLabelInput label="Year Ended" name={`exp_year_ended_${index}`} value={exp.year_ended} onChange={(e) => updateExperience(index, 'year_ended', e.target.value)} type="number" inputMode="numeric" min="1950" max={new Date().getFullYear()} placeholder="e.g. 2023" error={errors[`exp_year_ended_${index}`]} />
                <SearchableSelect label="Employment Status" name={`exp_status_${index}`} value={exp.employment_status} onChange={(e) => updateExperience(index, 'employment_status', e.target.value)} options={WORK_STATUS_OPTIONS} />
              </div>
            </div>
          </div>
        ))}

        {experiences.length < 5 && (
          <button type="button" onClick={addExperience} className="flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium text-sm transition-colors">
            <Plus className="w-4 h-4" /> Add Work Experience
          </button>
        )}
      </div>

      <div className="pt-4 border-t border-gray-200 space-y-6">
        <h3 className="text-lg font-semibold text-gray-800">Skills</h3>
        <p className="text-sm text-gray-500">Select skills you have or add your own below. Suggestions are based on your Course, Technical/Vocational Training, and Work Experience.</p>

        {showSuggestions && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl animate-scale-in">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-800">
                  Suggested skills based on your profile
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleRefreshSuggestions}
                  disabled={isRefreshing}
                  className="p-1 text-blue-500 hover:text-blue-700 transition-colors disabled:opacity-60"
                  aria-label="Refresh suggestions"
                  title="Refresh suggestions"
                >
                  <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setDismissedSuggestions(true)}
                  className="p-1 text-blue-400 hover:text-blue-600 transition-colors"
                  aria-label="Dismiss suggestions"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            {reasons.length > 0 && (
              <p className="text-xs text-blue-600 mb-3">
                Based on: {reasons.slice(0, 3).join(' | ')}. Click to add or remove.
              </p>
            )}
            <div className="space-y-3">
              {groupedSections.map(section => (
                <div key={section.key}>
                  <p className="text-[11px] uppercase tracking-wide font-semibold text-blue-700/70 mb-1.5">
                    {section.label}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {section.skills.map(skill => {
                      const selected = isSkillSelected(skill)
                      const source = section.key === 'practical' ? 'ai_enrichment' : 'deterministic'
                      return (
                        <button
                          key={`${section.key}-${skill}`}
                          type="button"
                          onClick={() => handleSuggestedSkillClick(skill, source)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                            selected
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'
                          }`}
                        >
                          {selected ? <Check className="h-3.5 w-3.5" /> : <span className="text-[11px] leading-none">+</span>}
                          <span>{skill}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addAllSuggestions}
              className="mt-3 text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
            >
              Add all {allSuggested.length} suggestions
            </button>
          </div>
        )}

        {inferredCategory && demandSkills.length > 0 && (() => {
          const allSuggestedLower = new Set(allSuggested.map(s => s.toLowerCase()))
          const demandFiltered = demandSkills.filter(d => !allSuggestedLower.has(d.requirement.toLowerCase()))
          if (demandFiltered.length === 0) return null
          return (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-800">
                  Commonly requested by employers in {inferredCategory}
                </span>
              </div>
              <p className="text-xs text-emerald-700 mb-3">
                Skills currently listed in open job postings. Click to add or remove:
              </p>
              <div className="flex flex-wrap gap-2">
                {demandFiltered.map(d => {
                  const selected = isSkillSelected(d.requirement)
                  return (
                    <button
                      key={d.requirement}
                      type="button"
                      onClick={() => handleSuggestedSkillClick(d.requirement, 'demand_side')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        selected
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                      }`}
                      title={`Requested in ${d.demand_count} open job${d.demand_count > 1 ? 's' : ''}`}
                    >
                      {selected ? <Check className="h-3.5 w-3.5" /> : <span className="text-[11px] leading-none">+</span>}
                      {d.requirement}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })()}

        {(() => {
          const allSuggestedLower = new Set(allSuggested.map(s => s.toLowerCase()))
          const predefinedFiltered = PREDEFINED_SKILLS.filter(s => !allSuggestedLower.has(s.toLowerCase()))
          if (predefinedFiltered.length === 0) return null
          return (
            <div>
              <p className="text-[11px] uppercase tracking-wide font-semibold text-gray-400 mb-2">Common Skills</p>
              <div className="flex flex-wrap gap-2">
                {predefinedFiltered.map(skill => {
                  const selected = isSkillSelected(skill)
                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleSuggestedSkill(skill)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        selected
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-white text-primary-700 border-primary-300 hover:bg-primary-50'
                      }`}
                    >
                      {selected ? <Check className="h-3.5 w-3.5" /> : <span className="text-[11px] leading-none">+</span>}
                      <span>{skill}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })()}

        <div>
          <TagInput
            label="Additional Skills"
            value={skillInput}
            onChange={setSkillInput}
            tags={[...(formData.predefined_skills || []), ...(formData.skills || [])]}
            onAdd={(tag) => { setFormData(prev => ({ ...prev, skills: [...(prev.skills || []), tag] })); setSkillInput('') }}
            onRemove={(tag) => {
              if (PREDEFINED_SKILLS.includes(tag)) {
                setFormData(prev => ({ ...prev, predefined_skills: (prev.predefined_skills || []).filter(s => s !== tag) }))
              } else {
                setFormData(prev => ({ ...prev, skills: (prev.skills || []).filter(s => s !== tag) }))
              }
            }}
            placeholder="Type a skill and press Enter..."
            tagClassName="bg-primary-100 text-primary-700"
            removeClassName="hover:text-primary-900"
          />
        </div>
        {errors.skills && <p className="text-sm text-red-500">{errors.skills}</p>}
      </div>

      <div className="pt-4 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Resume</h3>

        {userId && (
          <div className="mb-4">
            <label className="label">Resume <span className="text-red-500">*</span></label>
            <ResumeUpload userId={userId} storagePath={`${userId}/resume.pdf`}
              onUploadComplete={(url) => setFormData(prev => ({ ...prev, resume_url: url }))} existingUrl={formData.resume_url} />
            {errors.resume_url && <p className="mt-1 text-sm text-red-500">{errors.resume_url}</p>}
          </div>
        )}

        <FloatingLabelInput label="Portfolio URL" name="portfolio_url" value={formData.portfolio_url} onChange={handleChange} placeholder="https://..." />
      </div>
    </div>
  )
}

export { Step5SkillsExperience, PREDEFINED_SKILLS, WORK_STATUS_OPTIONS }
