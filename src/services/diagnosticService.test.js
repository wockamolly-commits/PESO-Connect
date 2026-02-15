import { describe, it, expect } from 'vitest'
import { analyzeText, analyzeWithAI, getTradeSkills, tradeKeywords } from './diagnosticService'

describe('diagnosticService', () => {
  describe('analyzeText', () => {
    it('returns empty results for empty input', () => {
      const result = analyzeText('')
      expect(result.trades).toEqual([])
      expect(result.confidence).toBe(0)
    })

    it('returns empty results for null input', () => {
      const result = analyzeText(null)
      expect(result.trades).toEqual([])
      expect(result.confidence).toBe(0)
    })

    it('returns empty results for whitespace-only input', () => {
      const result = analyzeText('   ')
      expect(result.trades).toEqual([])
      expect(result.confidence).toBe(0)
    })

    it('detects plumbing keywords', () => {
      const result = analyzeText('I have a leaking pipe and a clogged drain')
      expect(result.primaryTrade.id).toBe('plumbing')
      expect(result.primaryTrade.matchedKeywords).toContain('leaking')
      expect(result.primaryTrade.matchedKeywords).toContain('pipe')
      expect(result.primaryTrade.matchedKeywords).toContain('drain')
    })

    it('detects electrical keywords', () => {
      const result = analyzeText('The wiring in my house has a short circuit and the breaker keeps tripping')
      expect(result.primaryTrade.id).toBe('electrical')
      expect(result.primaryTrade.matchedKeywords).toContain('wiring')
    })

    it('detects masonry keywords', () => {
      const result = analyzeText('I need help with tile installation and cement work on the wall')
      expect(result.primaryTrade.id).toBe('masonry')
    })

    it('detects welding keywords', () => {
      const result = analyzeText('My metal gate is rusty and the steel fence needs welding repair')
      expect(result.primaryTrade.id).toBe('welding')
    })

    it('detects carpentry keywords', () => {
      const result = analyzeText('I need a new wooden cabinet and the door frame is damaged')
      expect(result.primaryTrade.id).toBe('carpentry')
    })

    it('returns multiple trades sorted by confidence', () => {
      const result = analyzeText('I need a plumber for the leaking pipe and an electrician for the wiring')
      expect(result.trades.length).toBeGreaterThanOrEqual(2)
      // Primary trade should have highest confidence
      expect(result.trades[0].confidence).toBeGreaterThanOrEqual(result.trades[1].confidence)
    })

    it('caps confidence at 100%', () => {
      // Use many plumbing keywords to exceed cap
      const result = analyzeText(
        'leak pipe drain faucet toilet water sink shower valve clog plumbing sewage flood'
      )
      expect(result.primaryTrade.confidence).toBeLessThanOrEqual(100)
    })

    it('calculates confidence as 20% per keyword match', () => {
      const result = analyzeText('leaking pipe')
      const plumbingTrade = result.trades.find(t => t.id === 'plumbing')
      // 2 keywords matched -> 40%
      expect(plumbingTrade.confidence).toBe(40)
    })

    it('includes source field set to keyword', () => {
      const result = analyzeText('leaking pipe')
      expect(result.source).toBe('keyword')
      expect(result.degraded).toBe(false)
    })

    it('returns source=keyword and degraded=false for keyword analysis', () => {
      const result = analyzeText('I need electrical wiring help')
      expect(result.source).toBe('keyword')
      expect(result.degraded).toBe(false)
    })
  })

  describe('getTradeSkills', () => {
    it('returns skills for plumbing', () => {
      const skills = getTradeSkills('plumbing')
      expect(skills).toContain('Plumbing')
      expect(skills).toContain('Pipe Fitting')
      expect(skills.length).toBe(4)
    })

    it('returns skills for electrical', () => {
      const skills = getTradeSkills('electrical')
      expect(skills).toContain('Electrical Work')
      expect(skills).toContain('Wiring')
    })

    it('returns skills for masonry', () => {
      const skills = getTradeSkills('masonry')
      expect(skills).toContain('Masonry')
    })

    it('returns skills for welding', () => {
      const skills = getTradeSkills('welding')
      expect(skills).toContain('Welding')
    })

    it('returns skills for carpentry', () => {
      const skills = getTradeSkills('carpentry')
      expect(skills).toContain('Carpentry')
    })

    it('returns empty array for unknown trade', () => {
      const skills = getTradeSkills('unknown')
      expect(skills).toEqual([])
    })
  })

  describe('tradeKeywords', () => {
    it('has all five trade categories', () => {
      expect(Object.keys(tradeKeywords)).toEqual(
        expect.arrayContaining(['plumbing', 'electrical', 'masonry', 'welding', 'carpentry'])
      )
    })

    it('each trade has name, keywords, icon, and color', () => {
      Object.values(tradeKeywords).forEach(trade => {
        expect(trade).toHaveProperty('name')
        expect(trade).toHaveProperty('keywords')
        expect(trade).toHaveProperty('icon')
        expect(trade).toHaveProperty('color')
        expect(trade.keywords.length).toBeGreaterThan(0)
      })
    })
  })

  describe('analyzeWithAI', () => {
    it('returns empty trades for empty input', async () => {
      const result = await analyzeWithAI('')
      expect(result.trades).toEqual([])
      expect(result.source).toBe('none')
    })

    it('returns empty trades for null input', async () => {
      const result = await analyzeWithAI(null)
      expect(result.trades).toEqual([])
    })
  })
})
