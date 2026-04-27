import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'

// Mock the global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('geminiService', () => {
  let analyzeResume, calculateJobMatch, quickExtractSkills

  beforeAll(async () => {
    // Stub env before importing the module so the top-level const picks it up
    vi.stubEnv('VITE_COHERE_API_KEY', 'test-api-key')
    vi.resetModules()
    const mod = await import('./geminiService')
    analyzeResume = mod.analyzeResume
    calculateJobMatch = mod.calculateJobMatch
    quickExtractSkills = mod.quickExtractSkills
  })

  beforeEach(() => {
    mockFetch.mockReset()
  })

  function mockCohereResponse(text) {
    return {
      ok: true,
      json: () => Promise.resolve({
        message: {
          content: [{ text }]
        }
      })
    }
  }

  describe('analyzeResume', () => {
    it('sends resume text to Cohere and returns parsed result', async () => {
      const mockResult = {
        skills: [{ name: 'Plumbing', level: 'intermediate', years: 3 }],
        experience: [{ title: 'Plumber', company: 'ABC', duration: '3 years', description: 'Pipe work' }],
        education: [{ degree: 'TESDA NC II', school: 'TESDA', year: '2018' }],
        summary: 'Experienced plumber',
        suggestedJobCategories: ['Plumbing', 'Maintenance'],
      }

      mockFetch.mockResolvedValue(mockCohereResponse(JSON.stringify(mockResult)))

      const result = await analyzeResume('I am an experienced plumber with 3 years of experience')

      expect(mockFetch).toHaveBeenCalledOnce()
      expect(result.skills).toHaveLength(1)
      expect(result.skills[0].name).toBe('Plumbing')
      expect(result.summary).toBe('Experienced plumber')
    })

    it('handles markdown code blocks in response', async () => {
      const mockResult = { skills: [], experience: [], education: [], summary: 'Test', suggestedJobCategories: [] }
      const wrappedResponse = '```json\n' + JSON.stringify(mockResult) + '\n```'

      mockFetch.mockResolvedValue(mockCohereResponse(wrappedResponse))

      const result = await analyzeResume('Some text')
      expect(result.summary).toBe('Test')
    })

    it('throws on API error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ message: 'Rate limited' }),
      })

      await expect(analyzeResume('text')).rejects.toThrow()
    })
  })

  describe('calculateJobMatch', () => {
    it('returns qualitative data for a job-profile pair', async () => {
      const mockMatch = {
        explanation: 'Good match based on plumbing skills.',
        skillBreakdown: [
          { category: 'Technical Skills', score: 80, detail: 'Strong plumbing skills' },
          { category: 'Experience', score: 60, detail: 'Relevant experience' },
          { category: 'Education', score: 70, detail: 'Adequate education' }
        ],
        actionItems: [],
        improvementTips: ['Get electrical certification'],
      }

      mockFetch.mockResolvedValue(mockCohereResponse(JSON.stringify(mockMatch)))

      const result = await calculateJobMatch(
        { id: 'job-1', title: 'Plumber', description: 'Fix pipes', required_skills: ['Plumbing', 'Electrical'] },
        { skills: ['Plumbing'], work_experiences: [{ position: 'Plumber', company: 'ABC' }] }
      )

      expect(result.explanation).toBe('Good match based on plumbing skills.')
      expect(result.skillBreakdown).toHaveLength(3)
      expect(result.improvementTips).toContain('Get electrical certification')
    })

    it('throws on network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      await expect(calculateJobMatch(
        { id: 'job-err', title: 'Plumber', required_skills: ['Plumbing'] },
        { skills: ['Plumbing'] }
      )).rejects.toThrow('Network error')
    })
  })

  describe('quickExtractSkills', () => {
    it('extracts skills from text', async () => {
      mockFetch.mockResolvedValue(
        mockCohereResponse(JSON.stringify({ skills: ['Plumbing', 'Pipe Fitting', 'Drainage'] }))
      )

      const result = await quickExtractSkills('I can do plumbing and pipe fitting')
      expect(result).toEqual(['Plumbing', 'Pipe Fitting', 'Drainage'])
    })

    it('throws on error', async () => {
      mockFetch.mockRejectedValue(new Error('fail'))
      await expect(quickExtractSkills('text')).rejects.toThrow('fail')
    })
  })

  describe('API key validation', () => {
    it('throws when API key is not configured', async () => {
      vi.stubEnv('VITE_COHERE_API_KEY', '')
      vi.resetModules()
      vi.stubGlobal('fetch', mockFetch)

      const { analyzeResume: freshAnalyzeResume } = await import('./geminiService')
      await expect(freshAnalyzeResume('text')).rejects.toThrow('Cohere API key not configured')

      // Restore
      vi.stubEnv('VITE_COHERE_API_KEY', 'test-api-key')
    })
  })

  describe('parseAIJSON', () => {
    let parseAIJSON

    beforeAll(async () => {
      vi.resetModules()
      const mod = await import('./geminiService')
      parseAIJSON = mod.parseAIJSON
    })

    it('parses valid JSON', () => {
      expect(parseAIJSON('{"key": "value"}')).toEqual({ key: 'value' })
    })

    it('strips markdown code blocks', () => {
      expect(parseAIJSON('```json\n{"key": "value"}\n```')).toEqual({ key: 'value' })
    })

    it('strips generic code blocks', () => {
      expect(parseAIJSON('```\n{"key": "value"}\n```')).toEqual({ key: 'value' })
    })

    it('throws on invalid JSON', () => {
      expect(() => parseAIJSON('not json')).toThrow()
    })
  })

  describe('safeParseAIJSON', () => {
    let safeParseAIJSON

    beforeAll(async () => {
      vi.resetModules()
      const mod = await import('./geminiService')
      safeParseAIJSON = mod.safeParseAIJSON
    })

    it('returns ok:true for valid JSON', () => {
      const result = safeParseAIJSON('{"key": "value"}')
      expect(result.ok).toBe(true)
      expect(result.data).toEqual({ key: 'value' })
    })

    it('returns ok:false for invalid JSON', () => {
      const result = safeParseAIJSON('not json')
      expect(result.ok).toBe(false)
      expect(result.error).toBeTruthy()
      expect(result.raw).toBe('not json')
    })

    it('returns ok:false for empty string', () => {
      const result = safeParseAIJSON('')
      expect(result.ok).toBe(false)
    })
  })

  describe('expandProfileAliases', () => {
    let expandProfileAliases

    beforeAll(async () => {
      vi.resetModules()
      vi.stubEnv('VITE_COHERE_API_KEY', 'test-api-key')
      vi.stubGlobal('fetch', mockFetch)
      const mod = await import('./geminiService')
      expandProfileAliases = mod.expandProfileAliases
    })

    beforeEach(() => {
      mockFetch.mockReset()
    })

    it('returns skill aliases and experience categories', async () => {
      const mockResult = {
        skillAliases: { 'Welding': ['Metal Fabrication', 'Arc Welding', 'SMAW'] },
        experienceCategories: ['trades'],
      }
      mockFetch.mockResolvedValue(mockCohereResponse(JSON.stringify(mockResult)))

      const result = await expandProfileAliases(
        [{ name: 'Welding' }],
        [{ position: 'Welder', company: 'ABC Corp' }]
      )
      expect(result.skillAliases).toBeDefined()
      expect(result.skillAliases['Welding']).toContain('Metal Fabrication')
      expect(result.experienceCategories).toContain('trades')
    })

    it('returns empty fallback on API error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const result = await expandProfileAliases([{ name: 'Welding' }], [])
      expect(result.skillAliases).toEqual({})
      expect(result.experienceCategories).toEqual([])
    })
  })

  describe('calculateDeterministicScore', () => {
    let calculateDeterministicScore

    beforeAll(async () => {
      vi.resetModules()
      const mod = await import('./geminiService')
      calculateDeterministicScore = mod.calculateDeterministicScore
    })

    it('scores 100% when all requirements match exactly', () => {
      const job = { requirements: ['Plumbing', 'Pipe Fitting'], category: 'trades', education_level: 'vocational' }
      const userData = {
        skills: [{ name: 'Plumbing' }, { name: 'Pipe Fitting' }],
        skill_aliases: { 'Plumbing': ['Pipe Work'], 'Pipe Fitting': ['Pipe Installation'] },
        experience_categories: ['trades'],
        highest_education: 'Vocational/Technical Graduate',
      }
      const result = calculateDeterministicScore(job, userData)
      expect(result.matchScore).toBe(100)
      expect(result.matchLevel).toBe('Excellent')
      expect(result.matchingSkills).toEqual(['Plumbing', 'Pipe Fitting'])
      expect(result.relatedSkills).toEqual([])
      expect(result.missingSkills).toEqual([])
    })

    it('matches explicit aliases as strong matches', () => {
      const job = { requirements: ['Metal Fabrication'], category: 'trades', education_level: null }
      const userData = {
        skills: [{ name: 'Welding' }],
        skill_aliases: { 'Welding': ['Metal Fabrication', 'Arc Welding', 'SMAW'] },
        experience_categories: ['trades'],
        highest_education: 'High School Graduate',
      }
      const result = calculateDeterministicScore(job, userData)
      expect(result.matchScore).toBeGreaterThanOrEqual(80)
      expect(result.matchingSkills).toContain('Metal Fabrication')
      expect(result.relatedSkills).toEqual([])
    })

    it('uses word-boundary matching not raw substring', () => {
      const job = { requirements: ['Hospitality Management'], category: 'hospitality', education_level: null }
      const userData = {
        skills: [{ name: 'IT Support' }],
        skill_aliases: { 'IT Support': ['IT', 'Technical Support'] },
        experience_categories: ['it'],
        highest_education: 'College Graduate',
      }
      const result = calculateDeterministicScore(job, userData)
      expect(result.matchingSkills).not.toContain('Hospitality Management')
      expect(result.relatedSkills).not.toContain('Hospitality Management')
    })

    it('caps low-density jobs at 55 instead of inflating them to 100', () => {
      const job = { requirements: [], category: 'trades', education_level: null }
      const userData = {
        skills: [{ name: 'Welding' }],
        skill_aliases: {},
        experience_categories: ['trades'],
        highest_education: 'High School Graduate',
      }
      const result = calculateDeterministicScore(job, userData)
      expect(result.matchScore).toBe(55)
      expect(result.matchLevel).toBe('Fair')
      expect(result.requiredSkillSummary.total).toBe(0)
      expect(result.scoreComposition.coverageCap).toBe(55)
    })

    it('keeps required-skill matches dominant even when experience support is weak', () => {
      const job = { requirements: ['Cooking'], category: 'hospitality', education_level: null }
      const userData = {
        skills: [{ name: 'Cooking' }],
        skill_aliases: { 'Cooking': ['Food Preparation'] },
        experience_categories: ['trades'],
        highest_education: 'College Graduate',
      }
      const result = calculateDeterministicScore(job, userData)
      expect(result.experienceScore).toBe(20)
      expect(result.supportScore).toBe(20)
      expect(result.technicalCompetencyScore).toBe(100)
      expect(result.matchScore).toBe(84)
      expect(result.matchLevel).toBe('Excellent')
    })

    it('uses education as support without letting baseline buckets drive the visible score', () => {
      const job = { requirements: ['Plumbing'], category: 'trades', education_level: 'college' }
      const userData = {
        skills: [{ name: 'Plumbing' }],
        skill_aliases: {},
        experience_categories: ['trades'],
        highest_education: 'High School Graduate',
      }
      const result = calculateDeterministicScore(job, userData)
      expect(result.educationScore).toBe(35)
      expect(result.baselineScore).toBe(18)
      expect(result.supportScore).toBe(61)
      expect(result.matchScore).toBe(92)
    })

    it('treats tertiary students as college undergraduates for education support', () => {
      const job = { requirements: ['Plumbing'], category: 'trades', education_level: 'college' }
      const userData = {
        skills: [{ name: 'Plumbing' }],
        skill_aliases: {},
        experience_categories: ['trades'],
        highest_education: 'Tertiary',
        currently_in_school: true,
      }
      const result = calculateDeterministicScore(job, userData)
      expect(result.educationScore).toBe(80)
      expect(result.matchScore).toBe(98)
    })

    it('handles null skill_aliases gracefully without inflating a 1-of-2 match', () => {
      const job = { requirements: ['Plumbing', 'Electrical'], category: 'trades', education_level: null }
      const userData = {
        skills: [{ name: 'Plumbing' }],
        skill_aliases: null,
        experience_categories: null,
        highest_education: 'High School Graduate',
      }
      const result = calculateDeterministicScore(job, userData)
      expect(result.technicalRequirementScore).toBe(50)
      expect(result.requiredSkillSummary).toEqual(expect.objectContaining({
        total: 2,
        exact: 1,
        partial: 0,
        related: 0,
        missing: 1,
        strongCoverage: 0.5,
      }))
      expect(result.matchScore).toBe(40)
      expect(result.matchLevel).toBe('Fair')
    })

    it('handles string skills (not objects)', () => {
      const job = { requirements: ['Welding'], category: 'trades', education_level: null }
      const userData = {
        skills: ['Welding', 'Plumbing'],
        skill_aliases: null,
        experience_categories: ['trades'],
        highest_education: 'High School Graduate',
      }
      const result = calculateDeterministicScore(job, userData)
      expect(result.matchingSkills).toContain('Welding')
    })

    it('caps null requirements jobs the same way as empty requirements', () => {
      const job = { requirements: null, category: 'trades', education_level: null }
      const userData = {
        skills: [{ name: 'Welding' }],
        skill_aliases: {},
        experience_categories: ['trades'],
        highest_education: 'High School Graduate',
      }
      const result = calculateDeterministicScore(job, userData)
      expect(result.matchScore).toBe(55)
      expect(result.requiredSkillSummary.total).toBe(0)
    })

    it('falls back to ordinal 0 for unknown highest_education values', () => {
      const job = { requirements: ['Plumbing'], category: 'trades', education_level: 'college' }
      const userData = {
        skills: [{ name: 'Plumbing' }],
        skill_aliases: {},
        experience_categories: ['trades'],
        highest_education: 'Some Unknown Value',
      }
      const result = calculateDeterministicScore(job, userData)
      expect(result.educationScore).toBe(15)
      expect(result.baselineScore).toBe(8)
      expect(result.matchScore).toBe(90)
    })

    describe('transferable skill handling', () => {
      it('records hierarchy matches as related instead of strong matches', () => {
        const result = calculateDeterministicScore(
          { requirements: ['Problem Solving'], category: 'it', education_level: null },
          {
            skills: [{ name: 'Hardware Troubleshooting' }],
            skill_aliases: {},
            experience_categories: ['it'],
            highest_education: 'College Graduate',
          },
        )

        expect(result.matchingSkills).toEqual([])
        expect(result.relatedSkills).toContain('Problem Solving')
        expect(result.missingSkills).not.toContain('Problem Solving')
      })

      it('records alias-bridged hierarchy matches as related', () => {
        const result = calculateDeterministicScore(
          { requirements: ['Problem Solving'], category: 'it', education_level: null },
          {
            skills: [{ name: 'PC Repair' }],
            skill_aliases: { 'PC Repair': ['Hardware Troubleshooting', 'Computer Troubleshooting'] },
            experience_categories: ['it'],
            highest_education: 'College Graduate',
          },
        )

        expect(result.matchingSkills).toEqual([])
        expect(result.relatedSkills).toContain('Problem Solving')
      })

      it('does not let parent skills satisfy a more specific child requirement', () => {
        const result = calculateDeterministicScore(
          { requirements: ['Customer Service'], category: 'retail', education_level: null },
          {
            skills: [{ name: 'Communication Skills' }],
            skill_aliases: {},
            experience_categories: ['retail'],
            highest_education: 'High School Graduate',
          },
        )

        expect(result.matchingSkills).not.toContain('Customer Service')
        expect(result.relatedSkills).not.toContain('Customer Service')
        expect(result.missingSkills).toContain('Customer Service')
      })

      it('treats built-in synonym-family matches as transferable evidence', () => {
        const result = calculateDeterministicScore(
          { requirements: ['Metal Fabrication'], category: 'trades', education_level: null },
          {
            skills: [{ name: 'Welding' }],
            skill_aliases: {},
            experience_categories: ['trades'],
            highest_education: 'High School Graduate',
          },
        )

        expect(result.matchingSkills).toEqual([])
        expect(result.relatedSkills).toContain('Metal Fabrication')
        expect(result.skillBreakdown).toEqual(expect.arrayContaining([
          expect.objectContaining({
            label: 'Metal Fabrication',
            matchType: 'related',
            status: 'partial',
            score: 0.4,
          }),
        ]))
      })

      it('gives exact credit to canonicalized variants like data entry/data encoding', () => {
        const result = calculateDeterministicScore(
          { requirements: ['Data Encoding'], category: 'it', education_level: null },
          {
            skills: [{ name: 'Data Entry' }],
            skill_aliases: {},
            experience_categories: ['it'],
            highest_education: 'College Graduate',
          },
        )

        expect(result.matchingSkills).toContain('Data Encoding')
        expect(result.relatedSkills).toEqual([])
      })
    })

    describe('support and overqualification signals', () => {
      it('applies adjacent-category support without inflating technical competency', () => {
        const result = calculateDeterministicScore(
          { requirements: ['Welding'], category: 'Skilled Trades', education_level: null },
          {
            skills: [{ name: 'Welding' }],
            skill_aliases: {},
            experience_categories: ['energy'],
            highest_education: 'High School Graduate',
          },
        )

        expect(result.experienceScore).toBe(50)
        expect(result.supportScore).toBe(50)
        expect(result.technicalCompetencyScore).toBe(100)
        expect(result.matchScore).toBe(90)
      })

      it('keeps unsupported soft-skill requirements as gaps in deterministic scoring', () => {
        const result = calculateDeterministicScore(
          {
            requirements: ['Attention to Detail', 'Analytical Thinking'],
            category: 'it',
            education_level: null,
          },
          {
            skills: ['Programming'],
            skill_aliases: null,
            experience_categories: ['it'],
            highest_education: 'College Graduate',
          },
        )

        expect(result.matchingSkills).toEqual([])
        expect(result.relatedSkills).toEqual([])
        expect(result.missingSkills).toEqual(['Attention to Detail', 'Analytical Thinking'])
        expect(result.matchScore).toBe(20)
      })

      it('limits overqualification transfer to abstract precision requirements instead of concrete admin tasks', () => {
        const result = calculateDeterministicScore(
          {
            title: 'Data Entry Clerk',
            requirements: ['Data Entry', 'Typing Skills', 'Attention to Detail'],
            category: 'retail',
            education_level: 'high-school',
          },
          {
            skills: ['Programming'],
            skill_aliases: null,
            experience_categories: ['it'],
            highest_education: 'College Graduate',
          },
        )

        expect(result.overqualificationSignal?.title).toBe('High-Precision Candidate')
        expect(result.candidateSignals[0]?.type).toBe('High-Precision Candidate')
        expect(result.matchingSkills).toEqual([])
        expect(result.relatedSkills).toEqual(['Attention to Detail'])
        expect(result.missingSkills).toEqual(['Data Entry', 'Typing Skills'])
      })
    })

    describe('non-skill requirements', () => {
      it('tracks education requirements in evidence and breakdown instead of matchingSkills', () => {
        const result = calculateDeterministicScore(
          {
            requirements: ['Welding', 'High School Graduate'],
            education_level: 'high-school',
          },
          {
            skills: [{ name: 'Welding' }],
            highest_education: 'College Graduate',
          },
        )

        expect(result.matchingSkills).toContain('Welding')
        expect(result.matchingSkills).not.toContain('High School Graduate')
        expect(result.missingSkills).not.toContain('High School Graduate')
        expect(result.skillBreakdown).toEqual(expect.arrayContaining([
          expect.objectContaining({
            label: 'High School Graduate',
            kind: 'education',
            status: 'match',
            matchType: 'exact',
          }),
        ]))
        expect(result.evidence).toEqual(expect.arrayContaining([
          expect.objectContaining({
            jobField: 'education',
            jobValue: 'High School Graduate',
          }),
        ]))
      })

      it('tracks unmet education requirements as gaps instead of missingSkills pills', () => {
        const result = calculateDeterministicScore(
          {
            requirements: ['Welding', 'College Graduate'],
            education_level: 'college',
          },
          {
            skills: [{ name: 'Welding' }],
            highest_education: 'High School Graduate',
          },
        )

        expect(result.matchingSkills).toContain('Welding')
        expect(result.matchingSkills).not.toContain('College Graduate')
        expect(result.missingSkills).not.toContain('College Graduate')
        expect(result.skillBreakdown).toEqual(expect.arrayContaining([
          expect.objectContaining({
            label: 'College Graduate',
            kind: 'education',
            status: 'gap',
            matchType: 'gap',
          }),
        ]))
        expect(result.gaps).toEqual(expect.arrayContaining([
          expect.objectContaining({
            jobField: 'education',
            jobValue: 'College Graduate',
          }),
        ]))
      })

      it('treats typing speed requirements as strong partial skill matches', () => {
        const result = calculateDeterministicScore(
          {
            requirements: ['Typing speed 40+ WPM'],
            category: 'it',
            education_level: null,
          },
          {
            skills: [{ name: 'Typing Skills' }],
            skill_aliases: {},
            experience_categories: ['it'],
            highest_education: 'College Undergraduate',
          },
        )

        expect(result.matchingSkills).toContain('Typing speed 40+ WPM')
        expect(result.relatedSkills).toEqual([])
        expect(result.skillScore).toBe(75)
        expect(result.skillBreakdown).toEqual(expect.arrayContaining([
          expect.objectContaining({
            label: 'Typing speed 40+ WPM',
            kind: 'skill',
            status: 'match',
            matchType: 'partial',
            score: 0.75,
          }),
        ]))
      })

      it('tracks matched language requirements through evidence and breakdown', () => {
        const result = calculateDeterministicScore(
          {
            requirements: ['Welding', 'Good English Communication'],
          },
          {
            skills: [{ name: 'Welding' }],
            languages: [{ language: 'English', proficiency: 'Fluent' }],
            highest_education: 'College Graduate',
          },
        )

        expect(result.matchingSkills).toContain('Welding')
        expect(result.matchingSkills).not.toContain('Good English Communication')
        expect(result.skillBreakdown).toEqual(expect.arrayContaining([
          expect.objectContaining({
            label: 'Good English Communication',
            kind: 'language',
            status: 'match',
          }),
        ]))
        expect(result.evidence).toEqual(expect.arrayContaining([
          expect.objectContaining({
            jobField: 'language',
            jobValue: 'Good English Communication',
          }),
        ]))
      })

      it('tracks missing language requirements as language gaps', () => {
        const result = calculateDeterministicScore(
          {
            requirements: ['Fluent English Communication'],
          },
          {
            skills: [],
            languages: [{ language: 'Filipino', proficiency: 'Native' }],
            highest_education: 'College Graduate',
          },
        )

        expect(result.matchingSkills).toEqual([])
        expect(result.missingSkills).toEqual([])
        expect(result.skillBreakdown).toEqual(expect.arrayContaining([
          expect.objectContaining({
            label: 'Fluent English Communication',
            kind: 'language',
            status: 'gap',
          }),
        ]))
        expect(result.gaps).toEqual(expect.arrayContaining([
          expect.objectContaining({
            jobField: 'language',
            jobValue: 'Fluent English Communication',
          }),
        ]))
      })
    })
  })
})
