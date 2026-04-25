import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../config/supabase', () => ({
  supabase: { rpc: vi.fn() },
}))

import { getMarketTrendSkills, getSkillSupplyCounts } from './employerSkillSuggestions'
import { supabase } from '../config/supabase'

describe('getMarketTrendSkills', () => {
  beforeEach(() => supabase.rpc.mockReset())

  it('returns [] without calling RPC when category is empty', async () => {
    expect(await getMarketTrendSkills('')).toEqual([])
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('passes category and limit to get_top_demand_skills', async () => {
    supabase.rpc.mockResolvedValue({
      data: [{ requirement: 'Forklift Operation', demand_count: 5 }],
      error: null,
    })
    const result = await getMarketTrendSkills('trades', 8)
    expect(supabase.rpc).toHaveBeenCalledWith('get_top_demand_skills', {
      p_category: 'trades',
      p_limit: 8,
    })
    expect(result).toEqual([{ requirement: 'Forklift Operation', demand_count: 5 }])
  })

  it('returns [] and swallows missing-function errors (42883)', async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: { code: '42883', message: 'does not exist' } })
    expect(await getMarketTrendSkills('it')).toEqual([])
  })

  it('returns [] when RPC throws', async () => {
    supabase.rpc.mockRejectedValueOnce(new Error('network fail'))
    expect(await getMarketTrendSkills('retail')).toEqual([])
  })

  it('returns [] when data is null (no error)', async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: null })
    expect(await getMarketTrendSkills('hospitality')).toEqual([])
  })
})

describe('getSkillSupplyCounts', () => {
  beforeEach(() => supabase.rpc.mockReset())

  it('returns empty Map without calling RPC when category is empty', async () => {
    const result = await getSkillSupplyCounts('')
    expect(result.size).toBe(0)
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('filters rows to the requested category only', async () => {
    supabase.rpc.mockResolvedValue({
      data: [
        { skill_name: 'Python', category: 'it',         demand_count: 10, supply_count: 4, gap_ratio: 40 },
        { skill_name: 'Welding', category: 'trades',    demand_count: 8,  supply_count: 2, gap_ratio: 25 },
        { skill_name: 'MS Office', category: 'it',      demand_count: 6,  supply_count: 3, gap_ratio: 50 },
      ],
      error: null,
    })
    const result = await getSkillSupplyCounts('it')
    expect(result.get('python')).toBe(4)
    expect(result.get('ms office')).toBe(3)
    expect(result.has('welding')).toBe(false)
  })

  it('returns empty Map when no rows match the requested category', async () => {
    supabase.rpc.mockResolvedValue({
      data: [
        { skill_name: 'Cooking', category: 'hospitality', demand_count: 3, supply_count: 1, gap_ratio: 33 },
      ],
      error: null,
    })
    const result = await getSkillSupplyCounts('it')
    expect(result.size).toBe(0)
  })

  it('keys the Map in lowercase regardless of input casing', async () => {
    supabase.rpc.mockResolvedValue({
      data: [
        { skill_name: 'Node.JS', category: 'it', demand_count: 5, supply_count: 2, gap_ratio: 40 },
      ],
      error: null,
    })
    const result = await getSkillSupplyCounts('IT')
    expect(result.get('node.js')).toBe(2)
  })

  it('returns empty Map and swallows missing-function errors (42883)', async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: { code: '42883', message: 'does not exist' } })
    const result = await getSkillSupplyCounts('trades')
    expect(result.size).toBe(0)
  })

  it('returns empty Map when RPC throws', async () => {
    supabase.rpc.mockRejectedValueOnce(new Error('network fail'))
    const result = await getSkillSupplyCounts('retail')
    expect(result.size).toBe(0)
  })
})
