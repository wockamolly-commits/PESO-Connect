import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../config/supabase', () => ({
  supabase: { rpc: vi.fn() },
}))

import { inferCategoryFromProfile, getTopDemandSkills } from './skillDemandService'
import { supabase } from '../config/supabase'

describe('inferCategoryFromProfile', () => {
  it('returns empty string when no signals exist', () => {
    expect(inferCategoryFromProfile({})).toBe('')
  })

  it('infers "it" from a Computer Science course', () => {
    expect(inferCategoryFromProfile({ course_or_field: 'Bachelor of Science in Computer Science' })).toBe('it')
  })

  it('infers "trades" from a welder work experience', () => {
    expect(inferCategoryFromProfile({
      work_experiences: [{ position: 'Welder / Fabricator' }],
    })).toBe('trades')
  })

  it('infers "retail" from preferred_occupations', () => {
    expect(inferCategoryFromProfile({
      preferred_occupations: ['Cashier', 'Sales Associate'],
    })).toBe('retail')
  })

  it('infers "hospitality" from chef position', () => {
    expect(inferCategoryFromProfile({
      work_experiences: [{ position: 'Chef de Partie' }],
    })).toBe('hospitality')
  })

  it('prefers the category with the most hits across signals', () => {
    expect(inferCategoryFromProfile({
      course_or_field: 'BS Information Technology',
      work_experiences: [
        { position: 'Cashier' },
        { position: 'Sales Lady' },
        { position: 'Store Supervisor' },
      ],
    })).toBe('retail')
  })

  it('returns empty when no keyword matches', () => {
    expect(inferCategoryFromProfile({
      work_experiences: [{ position: 'Unicorn Trainer' }],
    })).toBe('')
  })
})

describe('getTopDemandSkills', () => {
  beforeEach(() => {
    supabase.rpc.mockReset()
  })

  it('returns [] when category is empty (no RPC call)', async () => {
    const result = await getTopDemandSkills('')
    expect(result).toEqual([])
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('passes category and limit to the RPC', async () => {
    supabase.rpc.mockResolvedValue({ data: [{ requirement: 'MS Office', demand_count: 3 }], error: null })
    const result = await getTopDemandSkills('it', 5)
    expect(supabase.rpc).toHaveBeenCalledWith('get_top_demand_skills', {
      p_category: 'it',
      p_limit: 5,
    })
    expect(result).toEqual([{ requirement: 'MS Office', demand_count: 3 }])
  })

  it('returns [] and swallows missing-function errors gracefully', async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: { code: '42883', message: 'function does not exist' } })
    const result = await getTopDemandSkills('it')
    expect(result).toEqual([])
  })

  it('returns [] when RPC throws', async () => {
    supabase.rpc.mockRejectedValue(new Error('network boom'))
    const result = await getTopDemandSkills('it')
    expect(result).toEqual([])
  })
})
