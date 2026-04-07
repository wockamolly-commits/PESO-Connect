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
      expect(result.missingSkills).toEqual([])
    })

    it('matches via aliases (semantic matching)', () => {
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
    })

    it('returns skillScore=100 when job has no requirements', () => {
      const job = { requirements: [], category: 'trades', education_level: null }
      const userData = {
        skills: [{ name: 'Welding' }], skill_aliases: {},
        experience_categories: ['trades'], highest_education: 'High School Graduate',
      }
      const result = calculateDeterministicScore(job, userData)
      expect(result.matchScore).toBe(100)
    })

    it('gives experienceScore=20 when category does not match', () => {
      const job = { requirements: ['Cooking'], category: 'hospitality', education_level: null }
      const userData = {
        skills: [{ name: 'Cooking' }],
        skill_aliases: { 'Cooking': ['Food Preparation'] },
        experience_categories: ['trades'],
        highest_education: 'College Graduate',
      }
      const result = calculateDeterministicScore(job, userData)
      expect(result.experienceScore).toBe(20)
      expect(result.technicalCompetencyScore).toBe(80)
      expect(result.matchScore).toBe(90)
      expect(result.matchLevel).toBe('Excellent')
    })

    it('scores education correctly when user is below requirement', () => {
      const job = { requirements: ['Plumbing'], category: 'trades', education_level: 'college' }
      const userData = {
        skills: [{ name: 'Plumbing' }], skill_aliases: {},
        experience_categories: ['trades'], highest_education: 'High School Graduate',
      }
      const result = calculateDeterministicScore(job, userData)
      // diff=2 (college 3 - HS 1) → educationScore=35 → 50+30+7=87
      expect(result.educationScore).toBe(35)
      expect(result.baselineScore).toBe(68)
      expect(result.matchScore).toBe(90)
    })

    it('scores education=80 when user is half-level below', () => {
      const job = { requirements: ['Plumbing'], category: 'trades', education_level: 'college' }
      const userData = {
        skills: [{ name: 'Plumbing' }], skill_aliases: {},
        experience_categories: ['trades'], highest_education: 'College Undergraduate',
      }
      const result = calculateDeterministicScore(job, userData)
      // diff=0.5 (college 3 - undergrad 2.5) → educationScore=80 → 50+30+16=96
      expect(result.educationScore).toBe(80)
      expect(result.baselineScore).toBe(90)
      expect(result.matchScore).toBe(97)
    })

    it('treats tertiary students as college undergraduates for education scoring', () => {
      const job = { requirements: ['Plumbing'], category: 'trades', education_level: 'college' }
      const userData = {
        skills: [{ name: 'Plumbing' }], skill_aliases: {},
        experience_categories: ['trades'],
        highest_education: 'Tertiary',
        currently_in_school: true,
      }
      const result = calculateDeterministicScore(job, userData)
      expect(result.educationScore).toBe(80)
      expect(result.matchScore).toBe(97)
    })

    it('handles null skill_aliases gracefully (pre-migration user)', () => {
      const job = { requirements: ['Plumbing', 'Electrical'], category: 'trades', education_level: null }
      const userData = {
        skills: [{ name: 'Plumbing' }],
        skill_aliases: null, experience_categories: null,
        highest_education: 'High School Graduate',
      }
      const result = calculateDeterministicScore(job, userData)
      expect(result.technicalRequirementScore).toBe(50)
      expect(result.matchScore).toBe(72)
      expect(result.matchLevel).toBe('Good')
    })

    it('handles string skills (not objects)', () => {
      const job = { requirements: ['Welding'], category: 'trades', education_level: null }
      const userData = {
        skills: ['Welding', 'Plumbing'],
        skill_aliases: null, experience_categories: ['trades'],
        highest_education: 'High School Graduate',
      }
      const result = calculateDeterministicScore(job, userData)
      expect(result.matchingSkills).toContain('Welding')
    })

    it('handles null requirements gracefully', () => {
      const job = { requirements: null, category: 'trades', education_level: null }
      const userData = {
        skills: [{ name: 'Welding' }], skill_aliases: {},
        experience_categories: ['trades'], highest_education: 'High School Graduate',
      }
      const result = calculateDeterministicScore(job, userData)
      expect(result.matchScore).toBe(100)
    })

    it('defaults to ordinal 0 for unknown highest_education', () => {
      const job = { requirements: ['Plumbing'], category: 'trades', education_level: 'college' }
      const userData = {
        skills: [{ name: 'Plumbing' }], skill_aliases: {},
        experience_categories: ['trades'], highest_education: 'Some Unknown Value',
      }
      const result = calculateDeterministicScore(job, userData)
      // diff=3 (college 3 - unknown 0) → educationScore=15 → 50+30+3=83
      expect(result.educationScore).toBe(15)
      expect(result.baselineScore).toBe(58)
      expect(result.matchScore).toBe(87)
    })

    describe('hierarchy matching', () => {
      it('Layer 3 — child skill satisfies parent requirement', () => {
        const job = { requirements: ['Communication Skills'], category: 'retail', education_level: null }
        const userData = {
          skills: [{ name: 'Customer Service' }],
          skill_aliases: {},
          experience_categories: ['retail'],
          highest_education: 'High School Graduate',
        }
        const result = calculateDeterministicScore(job, userData)
        expect(result.matchingSkills).toContain('Communication Skills')
        expect(result.missingSkills).not.toContain('Communication Skills')
      })

      it('Layer 4 — child matched via alias bridges to parent', () => {
        const job = { requirements: ['Communication Skills'], category: 'retail', education_level: null }
        const userData = {
          skills: [{ name: 'Client Support' }],
          skill_aliases: { 'Client Support': ['Customer Service', 'Help Desk'] },
          experience_categories: ['retail'],
          highest_education: 'High School Graduate',
        }
        const result = calculateDeterministicScore(job, userData)
        expect(result.matchingSkills).toContain('Communication Skills')
      })

      it('parent does NOT satisfy child requirement (upward only)', () => {
        const job = { requirements: ['Customer Service'], category: 'retail', education_level: null }
        const userData = {
          skills: [{ name: 'Communication Skills' }],
          skill_aliases: {},
          experience_categories: ['retail'],
          highest_education: 'High School Graduate',
        }
        const result = calculateDeterministicScore(job, userData)
        expect(result.matchingSkills).not.toContain('Customer Service')
        expect(result.missingSkills).toContain('Customer Service')
      })

      it('non-hierarchy requirement falls through to Layer 1/2 only', () => {
        const job = { requirements: ['Gardening'], category: 'agriculture', education_level: null }
        const userData = {
          skills: [{ name: 'Plumbing' }],
          skill_aliases: {},
          experience_categories: ['agriculture'],
          highest_education: 'High School Graduate',
        }
        const result = calculateDeterministicScore(job, userData)
        expect(result.missingSkills).toContain('Gardening')
      })

      it('non-transitive — grandchild does NOT satisfy grandparent', () => {
        const job = { requirements: ['Communication Skills'], category: 'retail', education_level: null }
        const userData = {
          skills: [{ name: 'Cashiering' }],
          skill_aliases: {},
          experience_categories: ['retail'],
          highest_education: 'High School Graduate',
        }
        const result = calculateDeterministicScore(job, userData)
        expect(result.missingSkills).toContain('Communication Skills')
      })

      it('case-insensitive hierarchy lookup', () => {
        const job = { requirements: ['COMMUNICATION SKILLS'], category: 'retail', education_level: null }
        const userData = {
          skills: [{ name: 'customer service' }],
          skill_aliases: {},
          experience_categories: ['retail'],
          highest_education: 'High School Graduate',
        }
        const result = calculateDeterministicScore(job, userData)
        expect(result.matchingSkills).toContain('COMMUNICATION SKILLS')
      })

      it('exact match takes precedence over hierarchy (Layer 1 first)', () => {
        const job = { requirements: ['Communication Skills'], category: 'retail', education_level: null }
        const userData = {
          skills: [{ name: 'Communication Skills' }],
          skill_aliases: {},
          experience_categories: ['retail'],
          highest_education: 'High School Graduate',
        }
        const result = calculateDeterministicScore(job, userData)
        expect(result.matchingSkills).toContain('Communication Skills')
      })

      it('Layer 4 works with null skill_aliases (pre-migration user)', () => {
        const job = { requirements: ['Communication Skills'], category: 'retail', education_level: null }
        const userData = {
          skills: [{ name: 'Customer Service' }],
          skill_aliases: null,
          experience_categories: ['retail'],
          highest_education: 'High School Graduate',
        }
        const result = calculateDeterministicScore(job, userData)
        expect(result.matchingSkills).toContain('Communication Skills')
      })
    })

    describe('built-in synonym matching', () => {
      it('matches skill via built-in synonym (no AI alias needed)', () => {
        const job = { requirements: ['Metal Fabrication'], category: 'trades', education_level: null }
        const userData = {
          skills: [{ name: 'Welding' }],
          skill_aliases: {},
          experience_categories: ['trades'],
          highest_education: 'High School Graduate',
        }
        const result = calculateDeterministicScore(job, userData)
        expect(result.matchingSkills).toContain('Metal Fabrication')
        expect(result.missingSkills).not.toContain('Metal Fabrication')
      })

      it('matches cooking ↔ food preparation via synonym', () => {
        const job = { requirements: ['Food Preparation'], category: 'hospitality', education_level: null }
        const userData = {
          skills: [{ name: 'Cooking' }],
          skill_aliases: {},
          experience_categories: ['hospitality'],
          highest_education: 'High School Graduate',
        }
        const result = calculateDeterministicScore(job, userData)
        expect(result.matchingSkills).toContain('Food Preparation')
      })

      it('matches data entry ↔ data encoding via synonym', () => {
        const job = { requirements: ['Data Encoding'], category: 'it', education_level: null }
        const userData = {
          skills: [{ name: 'Data Entry' }],
          skill_aliases: {},
          experience_categories: ['it'],
          highest_education: 'College Graduate',
        }
        const result = calculateDeterministicScore(job, userData)
        expect(result.matchingSkills).toContain('Data Encoding')
      })

      it('does not false-positive match unrelated skills via synonyms', () => {
        const job = { requirements: ['Welding'], category: 'trades', education_level: null }
        const userData = {
          skills: [{ name: 'Cooking' }],
          skill_aliases: {},
          experience_categories: ['trades'],
          highest_education: 'High School Graduate',
        }
        const result = calculateDeterministicScore(job, userData)
        expect(result.missingSkills).toContain('Welding')
      })
    })

    describe('adjacent category experience scoring', () => {
      it('gives partial credit for adjacent categories', () => {
        const job = { requirements: ['Welding'], category: 'Skilled Trades', education_level: null }
        const userData = {
          skills: [{ name: 'Welding' }],
          skill_aliases: {},
          experience_categories: ['energy'],
          highest_education: 'High School Graduate',
        }
        const result = calculateDeterministicScore(job, userData)
        // Adjacent category (energy→trades) → experienceScore=50
        // skillScore=100, eduScore=100 → 50+15+20=85
        expect(result.experienceScore).toBe(50)
        expect(result.technicalCompetencyScore).toBe(88)
        expect(result.matchScore).toBe(94)
      })

      it('gives lowest experience score for unrelated categories', () => {
        const job = { requirements: ['Cooking'], category: 'Hospitality', education_level: null }
        const userData = {
          skills: [{ name: 'Cooking' }],
          skill_aliases: {},
          experience_categories: ['it'],
          highest_education: 'College Graduate',
        }
        const result = calculateDeterministicScore(job, userData)
        // Unrelated category → experienceScore=20 → 50+6+20=76
        expect(result.experienceScore).toBe(20)
        expect(result.technicalCompetencyScore).toBe(80)
        expect(result.matchScore).toBe(90)
      })
    })

    describe('inferential matching rules', () => {
      it('infers attention to detail and analytical thinking from programming', () => {
        const job = {
          requirements: ['Attention to Detail', 'Analytical Thinking'],
          category: 'it',
          education_level: null,
        }
        const userData = {
          skills: ['Programming'],
          skill_aliases: null,
          experience_categories: ['it'],
          highest_education: 'College Graduate',
        }

        const result = calculateDeterministicScore(job, userData)

        expect(result.matchingSkills).toContain('Attention to Detail')
        expect(result.matchingSkills).toContain('Analytical Thinking')
        expect(result.inferredSoftSkillScore).toBe(100)
        expect(result.inferredSoftSkills).toHaveLength(2)
        expect(result.missingSkills).toEqual([])
      })

      it('marks high-tier applicants to low-tier precision roles as High-Precision Candidate', () => {
        const job = {
          title: 'Data Entry Clerk',
          requirements: ['Data Entry', 'Typing Skills', 'Attention to Detail'],
          category: 'retail',
          education_level: 'high-school',
        }
        const userData = {
          skills: ['Programming'],
          skill_aliases: null,
          experience_categories: ['it'],
          highest_education: 'College Graduate',
        }

        const result = calculateDeterministicScore(job, userData)

        expect(result.missingSkills).toEqual([])
        expect(result.overqualificationSignal?.title).toBe('High-Precision Candidate')
        expect(result.candidateSignals[0]?.type).toBe('High-Precision Candidate')
        expect(result.rebrandingSuggestions.length).toBeGreaterThan(0)
      })
    })

    describe('education requirements in requirements array', () => {
      it('should recognize education strings and evaluate against user education, not skills', () => {
        const job = {
          requirements: ['Welding', 'High School Graduate'],
          education_level: 'high-school',
        }
        const userData = {
          skills: [{ name: 'Welding' }],
          highest_education: 'College Graduate',
        }
        const result = calculateDeterministicScore(job, userData)
        // College Graduate exceeds High School Graduate — should NOT be a gap
        expect(result.missingSkills).not.toContain('High School Graduate')
        expect(result.matchingSkills).toContain('High School Graduate')
        expect(result.matchingSkills).toContain('Welding')
      })

      it('should treat "high school graduate or higher" as satisfied by a tertiary student', () => {
        const job = {
          requirements: ['Customer Service', 'High school graduate or higher'],
          education_level: 'high-school',
        }
        const userData = {
          skills: [{ name: 'Customer Service' }],
          highest_education: 'Tertiary',
          currently_in_school: true,
        }
        const result = calculateDeterministicScore(job, userData)
        expect(result.missingSkills).not.toContain('High school graduate or higher')
        expect(result.matchingSkills).toContain('High school graduate or higher')
      })

      it('should mark education as missing when user does not meet it', () => {
        const job = {
          requirements: ['Welding', 'College Graduate'],
          education_level: 'college',
        }
        const userData = {
          skills: [{ name: 'Welding' }],
          highest_education: 'High School Graduate',
        }
        const result = calculateDeterministicScore(job, userData)
        expect(result.missingSkills).toContain('College Graduate')
        expect(result.matchingSkills).not.toContain('College Graduate')
      })

      it('should not misclassify regular skills as education requirements', () => {
        const job = {
          requirements: ['Customer Service', 'Driving'],
        }
        const userData = {
          skills: [{ name: 'Customer Service' }, { name: 'Driving' }],
          highest_education: 'College Graduate',
        }
        const result = calculateDeterministicScore(job, userData)
        expect(result.matchingSkills).toContain('Customer Service')
        expect(result.matchingSkills).toContain('Driving')
        expect(result.missingSkills).toHaveLength(0)
      })

      it('should treat typing speed requirements as a partial match when the user has typing skills', () => {
        const job = {
          requirements: ['Typing speed 40+ WPM'],
          category: 'it',
          education_level: null,
        }
        const userData = {
          skills: [{ name: 'Typing Skills' }],
          skill_aliases: {},
          experience_categories: ['it'],
          highest_education: 'College Undergraduate',
        }
        const result = calculateDeterministicScore(job, userData)
        expect(result.missingSkills).not.toContain('Typing speed 40+ WPM')
        expect(result.matchingSkills).toContain('Typing speed 40+ WPM')
        expect(result.skillScore).toBe(70)
      })
    })

    describe('language requirements in requirements array', () => {
      it('should recognize language requirements and match against user languages', () => {
        const job = {
          requirements: ['Welding', 'Good English Communication'],
        }
        const userData = {
          skills: [{ name: 'Welding' }],
          languages: [{ language: 'English', proficiency: 'Fluent' }],
          highest_education: 'College Graduate',
        }
        const result = calculateDeterministicScore(job, userData)
        expect(result.missingSkills).not.toContain('Good English Communication')
        expect(result.matchingSkills).toContain('Good English Communication')
        expect(result.matchingSkills).toContain('Welding')
      })

      it('should mark language requirement as missing when user lacks that language', () => {
        const job = {
          requirements: ['Fluent English Communication'],
        }
        const userData = {
          skills: [],
          languages: [{ language: 'Filipino', proficiency: 'Native' }],
          highest_education: 'College Graduate',
        }
        const result = calculateDeterministicScore(job, userData)
        expect(result.missingSkills).toContain('Fluent English Communication')
      })

      it('should mark language as missing when proficiency is insufficient', () => {
        const job = {
          requirements: ['Fluent English Communication'],
        }
        const userData = {
          skills: [],
          languages: [{ language: 'English', proficiency: 'Basic' }],
          highest_education: 'College Graduate',
        }
        const result = calculateDeterministicScore(job, userData)
        expect(result.missingSkills).toContain('Fluent English Communication')
      })

      it('should match Filipino language requirements', () => {
        const job = {
          requirements: ['Filipino Speaking', 'Driving'],
        }
        const userData = {
          skills: [{ name: 'Driving' }],
          languages: [{ language: 'Filipino', proficiency: 'Native' }],
          highest_education: 'High School Graduate',
        }
        const result = calculateDeterministicScore(job, userData)
        expect(result.missingSkills).not.toContain('Filipino Speaking')
        expect(result.matchingSkills).toContain('Filipino Speaking')
      })

      it('should not misclassify regular skills containing language-adjacent words', () => {
        const job = {
          requirements: ['Customer Service', 'Communication Skills'],
        }
        const userData = {
          skills: [{ name: 'Customer Service' }, { name: 'Communication Skills' }],
          languages: [],
          highest_education: 'College Graduate',
        }
        const result = calculateDeterministicScore(job, userData)
        expect(result.matchingSkills).toContain('Customer Service')
        expect(result.matchingSkills).toContain('Communication Skills')
        expect(result.missingSkills).toHaveLength(0)
      })
    })
  })
})
