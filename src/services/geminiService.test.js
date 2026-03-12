import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'

// Mock the global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('geminiService', () => {
  let analyzeResume, calculateJobMatch, scoreAllJobs, quickExtractSkills

  beforeAll(async () => {
    // Stub env before importing the module so the top-level const picks it up
    vi.stubEnv('VITE_COHERE_API_KEY', 'test-api-key')
    vi.resetModules()
    const mod = await import('./geminiService')
    analyzeResume = mod.analyzeResume
    calculateJobMatch = mod.calculateJobMatch
    scoreAllJobs = mod.scoreAllJobs
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
    it('returns match data for a job-profile pair', async () => {
      const mockMatch = {
        matchScore: 75,
        matchLevel: 'Good',
        matchingSkills: ['Plumbing'],
        missingSkills: ['Electrical'],
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

      expect(result.matchScore).toBe(75)
      expect(result.matchLevel).toBe('Good')
      expect(result.matchingSkills).toContain('Plumbing')
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

  describe('scoreAllJobs', () => {
    it('processes multiple jobs and returns map of results', async () => {
      const mockBatchResult = {
        '0': { matchScore: 80, matchLevel: 'Good', matchingSkills: [], missingSkills: [], explanation: 'Good match' },
        '1': { matchScore: 65, matchLevel: 'Good', matchingSkills: [], missingSkills: [], explanation: 'Decent match' },
      }

      mockFetch.mockResolvedValue(mockCohereResponse(JSON.stringify(mockBatchResult)))

      const jobs = [
        { id: 'job-1', title: 'Plumber', required_skills: ['Plumbing'] },
        { id: 'job-2', title: 'Electrician', required_skills: ['Electrical'] },
      ]

      const results = await scoreAllJobs(jobs, {
        skills: ['Plumbing'],
        work_experiences: [{ position: 'Plumber', company: 'ABC' }],
        highest_education: 'College Graduate'
      })

      expect(results['job-1']).toBeDefined()
      expect(results['job-2']).toBeDefined()
      expect(results['job-1'].matchScore).toBe(80)
    })

    it('returns empty object when profile has no skills', async () => {
      const jobs = [
        { id: 'job-1', title: 'Plumber', required_skills: ['Plumbing'] },
      ]

      const results = await scoreAllJobs(jobs, { skills: [] })

      expect(results).toEqual({})
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('returns empty object when jobs array is empty', async () => {
      const results = await scoreAllJobs([], { skills: ['Plumbing'] })

      expect(results).toEqual({})
      expect(mockFetch).not.toHaveBeenCalled()
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
})
