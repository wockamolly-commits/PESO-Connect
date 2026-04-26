import { useState, useMemo, useEffect } from 'react'
import { Plus, X, Briefcase, Sparkles, TrendingUp, Check, Brain, Loader2, Lightbulb } from 'lucide-react'
import { FloatingLabelInput } from '../forms/FloatingLabelInput'
import { SearchableSelect } from '../forms/SearchableSelect'
import TagInput from '../forms/TagInput'
import ResumeUpload from '../common/ResumeUpload'
import { generateSuggestedSkills, getSkillsForPosition } from '../../utils/skillRecommender'
import { inferCategoryFromProfile, getTopDemandSkills } from '../../services/skillDemandService'
import { logSkillAcceptance } from '../../services/telemetryService'
import { deepAnalyzeProfileSkills } from '../../services/geminiService'

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
  const [aiLoading, setAiLoading] = useState(false)
  const [aiGenerated, setAiGenerated] = useState(false)
  const [aiProfileSkills, setAiProfileSkills] = useState([])
  const [aiGrowthSkills, setAiGrowthSkills] = useState([])
  const [aiWarnings, setAiWarnings] = useState([])
  const [aiSource, setAiSource] = useState('ai')
  const [aiError, setAiError] = useState('')
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

  const handleSuggestedSkillClick = (skill, source) => {
    if (!isSkillSelected(skill)) {
      logSkillAcceptance(skill, source, inferredCategory || null, userId || null)
    }
    toggleSuggestedSkill(skill)
  }

  const buildDeterministicFallback = () => {
    const { suggestions, predefinedToCheck } = generateSuggestedSkills(formData)
    const selected = new Set([
      ...predefinedSkills.map(s => s.toLowerCase()),
      ...customSkills.map(s => s.toLowerCase()),
    ])
    const combined = [...predefinedToCheck, ...suggestions]
    const seen = new Set()
    return combined.filter(s => {
      const key = s.toLowerCase()
      if (seen.has(key)) return false
      if (selected.has(key)) return false
      seen.add(key)
      return true
    })
  }

  const handleGenerateAiSuggestions = async () => {
    setAiLoading(true)
    setAiError('')
    try {
      const result = await deepAnalyzeProfileSkills(formData)
      const selectedLower = new Set([
        ...predefinedSkills.map(s => s.toLowerCase()),
        ...customSkills.map(s => s.toLowerCase()),
      ])
      const profile = (result.profileSkills || []).filter(s => !selectedLower.has(s.toLowerCase()))
      const growth = (result.growthSkills || []).filter(s => !selectedLower.has(s.toLowerCase()))

      if (profile.length === 0 && growth.length === 0) {
        const fallback = buildDeterministicFallback()
        setAiProfileSkills(fallback)
        setAiGrowthSkills([])
        setAiWarnings([])
        setAiSource('fallback')
      } else {
        setAiProfileSkills(profile)
        setAiGrowthSkills(growth)
        setAiWarnings(result.warnings || [])
        setAiSource('ai')
      }
      setAiGenerated(true)
    } catch {
      const fallback = buildDeterministicFallback()
      setAiProfileSkills(fallback)
      setAiGrowthSkills([])
      setAiWarnings([])
      setAiSource('fallback')
      setAiGenerated(true)
      setAiError('AI suggestions were unavailable, so we used your profile details instead.')
    } finally {
      setAiLoading(false)
    }
  }

  const visibleAiProfileSkills = aiProfileSkills.filter(s => !isSkillSelected(s))
  const visibleAiGrowthSkills = aiGrowthSkills.filter(s => !isSkillSelected(s))

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
        <p className="text-sm text-gray-500">Select skills you have or add your own below. You can also generate AI suggestions based on your education, training, and work experience.</p>

        {/* AI skill suggestions — user-triggered, review-only */}
        <div className="p-4 bg-violet-50 border border-violet-200 rounded-xl">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-violet-600" />
              <span className="text-sm font-semibold text-violet-800">AI Skill Suggestions</span>
            </div>
            <button
              type="button"
              onClick={handleGenerateAiSuggestions}
              disabled={aiLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors disabled:opacity-60 text-xs font-semibold"
            >
              {aiLoading
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Sparkles className="w-3.5 h-3.5" />}
              {aiLoading ? 'Analyzing...' : (aiGenerated ? 'Regenerate AI suggestions' : 'Generate AI skill suggestions')}
            </button>
          </div>

          {!aiGenerated && !aiLoading && (
            <p className="text-xs text-violet-700">
              Click the button to let AI review your profile and suggest skills. Nothing will be added automatically — you choose what to include.
            </p>
          )}

          {aiLoading && (
            <div className="mt-2 flex items-center gap-2 p-3 bg-white/70 border border-violet-200 rounded-lg animate-pulse">
              <Loader2 className="w-4 h-4 text-violet-500 animate-spin flex-shrink-0" />
              <p className="text-xs text-violet-700 font-medium">Analyzing your profile…</p>
            </div>
          )}

          {aiGenerated && !aiLoading && aiSource === 'ai' && (
            <div className="mt-3 space-y-4">
              {visibleAiProfileSkills.length > 0 && (
                <div>
                  <p className="text-[11px] uppercase tracking-wide font-semibold text-violet-700 mb-1">
                    AI Suggested Profile Skills
                  </p>
                  <p className="text-xs text-violet-700/80 mb-2">
                    These are skills the AI found evidence for in your education, training, or work experience. Review before adding.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {visibleAiProfileSkills.map(skill => (
                      <button
                        key={`ai-profile-${skill}`}
                        type="button"
                        onClick={() => handleSuggestedSkillClick(skill, 'ai_profile')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border bg-white text-violet-700 border-violet-300 hover:bg-violet-100 transition-all"
                      >
                        <span className="text-[11px] leading-none">+</span>
                        <span>{skill}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {visibleAiGrowthSkills.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                    <p className="text-[11px] uppercase tracking-wide font-semibold text-amber-700">
                      Skills To Consider Learning
                    </p>
                  </div>
                  <p className="text-xs text-amber-700/90 mb-2">
                    These are commonly useful for your target roles, but only add them to your profile if you already have them.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {visibleAiGrowthSkills.map(skill => (
                      <button
                        key={`ai-growth-${skill}`}
                        type="button"
                        onClick={() => handleSuggestedSkillClick(skill, 'ai_growth')}
                        title="Only add if you already have this skill"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border bg-white text-amber-700 border-amber-300 hover:bg-amber-100 transition-all"
                      >
                        <span className="text-[11px] leading-none">+</span>
                        <span>{skill}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {visibleAiProfileSkills.length === 0 && visibleAiGrowthSkills.length === 0 && (
                <p className="text-xs text-violet-600 italic">
                  No new suggestions. Add more education or work experience details and try again.
                </p>
              )}

              {aiWarnings.length > 0 && (
                <p className="text-[11px] text-violet-600/80 italic">
                  Notes: {aiWarnings.join(' | ')}
                </p>
              )}
            </div>
          )}

          {aiGenerated && !aiLoading && aiSource === 'fallback' && (
            <div className="mt-3">
              <p className="text-[11px] uppercase tracking-wide font-semibold text-violet-700 mb-1">
                Suggested Skills From Your Profile
              </p>
              <p className="text-xs text-violet-700/80 mb-2">
                AI suggestions were unavailable, so we used your course, training, and work experience to suggest possible skills. Review before adding.
              </p>
              {aiError && <p className="text-[11px] text-violet-500 italic mb-2">{aiError}</p>}
              {visibleAiProfileSkills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {visibleAiProfileSkills.map(skill => (
                    <button
                      key={`det-${skill}`}
                      type="button"
                      onClick={() => handleSuggestedSkillClick(skill, 'deterministic_fallback')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border bg-white text-violet-700 border-violet-300 hover:bg-violet-100 transition-all"
                    >
                      <span className="text-[11px] leading-none">+</span>
                      <span>{skill}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-violet-600 italic">
                  No suggestions available. Add more education or work experience details and try again.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Employer-demand panel — kept separate from "skills you have" */}
        {inferredCategory && demandSkills.length > 0 && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-800">
                Commonly requested by employers in {inferredCategory}
              </span>
            </div>
            <p className="text-xs text-emerald-700 mb-3">
              Based on currently open job postings. Only add these if you actually have them.
            </p>
            <div className="flex flex-wrap gap-2">
              {demandSkills.map(d => {
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
        )}

        <div>
          <p className="text-[11px] uppercase tracking-wide font-semibold text-gray-400 mb-2">Common Skills</p>
          <div className="flex flex-wrap gap-2">
            {PREDEFINED_SKILLS.map(skill => {
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

        <div>
          <TagInput
            label="Additional Skills"
            value={skillInput}
            onChange={setSkillInput}
            tags={[...(formData.predefined_skills || []), ...(formData.skills || [])]}
            onAdd={(tag) => { addSuggestedSkill(tag); setSkillInput('') }}
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
