import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'

// Mock the global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('geminiService', () => {
  let analyzeResume, calculateJobMatch, batchCalculateMatches, quickExtractSkills

  beforeAll(async () => {
    // Stub env before importing the module so the top-level const picks it up
    vi.stubEnv('VITE_GEMINI_API_KEY', 'test-api-key')
    vi.resetModules()
    const mod = await import('./geminiService')
    analyzeResume = mod.analyzeResume
    calculateJobMatch = mod.calculateJobMatch
    batchCalculateMatches = mod.batchCalculateMatches
    quickExtractSkills = mod.quickExtractSkills
  })

  beforeEach(() => {
    mockFetch.mockReset()
  })

  function mockGeminiResponse(text) {
    return {
      ok: true,
      json: () => Promise.resolve({
        candidates: [{
          content: {
            parts: [{ text }]
          }
        }]
      })
    }
  }

  describe('analyzeResume', () => {
    it('sends resume text to Gemini and returns parsed result', async () => {
      const mockResult = {
        skills: [{ name: 'Plumbing', level: 'intermediate', years: 3 }],
        experience: [{ title: 'Plumber', company: 'ABC', duration: '3 years', description: 'Pipe work' }],
        education: [{ degree: 'TESDA NC II', school: 'TESDA', year: '2018' }],
        summary: 'Experienced plumber',
        suggestedJobCategories: ['Plumbing', 'Maintenance'],
      }

      mockFetch.mockResolvedValue(mockGeminiResponse(JSON.stringify(mockResult)))

      const result = await analyzeResume('I am an experienced plumber with 3 years of experience')

      expect(mockFetch).toHaveBeenCalledOnce()
      expect(result.skills).toHaveLength(1)
      expect(result.skills[0].name).toBe('Plumbing')
      expect(result.summary).toBe('Experienced plumber')
    })

    it('handles markdown code blocks in response', async () => {
      const mockResult = { skills: [], experience: [], education: [], summary: 'Test', suggestedJobCategories: [] }
      const wrappedResponse = '```json\n' + JSON.stringify(mockResult) + '\n```'

      mockFetch.mockResolvedValue(mockGeminiResponse(wrappedResponse))

      const result = await analyzeResume('Some text')
      expect(result.summary).toBe('Test')
    })

    it('throws on API error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: { message: 'Rate limited' } }),
      })

      await expect(analyzeResume('text')).rejects.toThrow('Failed to analyze resume')
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
        improvementTips: ['Get electrical certification'],
      }

      mockFetch.mockResolvedValue(mockGeminiResponse(JSON.stringify(mockMatch)))

      const result = await calculateJobMatch(
        { title: 'Plumber', description: 'Fix pipes', required_skills: ['Plumbing', 'Electrical'] },
        { skills: ['Plumbing'], experience: '3 years plumbing' }
      )

      expect(result.matchScore).toBe(75)
      expect(result.matchLevel).toBe('Good')
      expect(result.matchingSkills).toContain('Plumbing')
    })

    it('returns fallback data on API error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const result = await calculateJobMatch(
        { title: 'Plumber', required_skills: ['Plumbing'] },
        { skills: ['Plumbing'] }
      )

      expect(result.matchScore).toBe(0)
      expect(result.matchLevel).toBe('Unknown')
    })
  })

  describe('quickExtractSkills', () => {
    it('extracts skills from text', async () => {
      mockFetch.mockResolvedValue(
        mockGeminiResponse('["Plumbing", "Pipe Fitting", "Drainage"]')
      )

      const result = await quickExtractSkills('I can do plumbing and pipe fitting')
      expect(result).toEqual(['Plumbing', 'Pipe Fitting', 'Drainage'])
    })

    it('returns empty array on error', async () => {
      mockFetch.mockRejectedValue(new Error('fail'))
      const result = await quickExtractSkills('text')
      expect(result).toEqual([])
    })
  })

  describe('batchCalculateMatches', () => {
    it('processes multiple jobs and returns map of results', async () => {
      const mockMatch = {
        matchScore: 80,
        matchLevel: 'Good',
        matchingSkills: [],
        missingSkills: [],
        explanation: 'Good match',
        improvementTips: [],
      }

      mockFetch.mockResolvedValue(mockGeminiResponse(JSON.stringify(mockMatch)))

      const jobs = [
        { id: 'job-1', title: 'Plumber', required_skills: ['Plumbing'] },
        { id: 'job-2', title: 'Electrician', required_skills: ['Electrical'] },
      ]

      const results = await batchCalculateMatches(jobs, { skills: ['Plumbing'] })

      expect(results['job-1']).toBeDefined()
      expect(results['job-2']).toBeDefined()
      expect(results['job-1'].matchScore).toBe(80)
    })

    it('limits processing to 10 jobs max', async () => {
      const mockMatch = { matchScore: 50, matchLevel: 'Fair' }
      mockFetch.mockResolvedValue(mockGeminiResponse(JSON.stringify(mockMatch)))

      const jobs = Array.from({ length: 15 }, (_, i) => ({
        id: `job-${i}`,
        title: `Job ${i}`,
        required_skills: [],
      }))

      const results = await batchCalculateMatches(jobs, { skills: [] })

      expect(Object.keys(results).length).toBeLessThanOrEqual(10)
    })
  })

  describe('API key validation', () => {
    it('throws when API key is not configured', async () => {
      vi.stubEnv('VITE_GEMINI_API_KEY', '')
      vi.resetModules()
      vi.stubGlobal('fetch', mockFetch)

      const { analyzeResume: freshAnalyzeResume } = await import('./geminiService')
      await expect(freshAnalyzeResume('text')).rejects.toThrow('Failed to analyze resume')

      // Restore
      vi.stubEnv('VITE_GEMINI_API_KEY', 'test-api-key')
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
