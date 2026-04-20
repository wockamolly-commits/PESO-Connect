// Employer-side skill intelligence utilities.
// Bridges the employer job wizard with Phase 5 demand + telemetry data so that
// both sides of the market speak the same skill vocabulary.

import { supabase } from '../config/supabase'

/**
 * Returns the top-N skills currently in demand for a given job category,
 * sourced from open job postings (skill_demand_by_category materialized view).
 * Returns [] when the category is unknown or the RPC is unavailable.
 *
 * @param {string} category - One of 'agriculture'|'energy'|'retail'|'it'|'trades'|'hospitality'
 * @param {number} limit
 * @returns {Promise<Array<{requirement: string, demand_count: number}>>}
 */
export async function getMarketTrendSkills(category, limit = 10) {
  if (!category) return []
  try {
    const { data, error } = await supabase.rpc('get_top_demand_skills', {
      p_category: category,
      p_limit: limit,
    })
    if (error) {
      if (error.code !== '42883' && error.code !== '42P01') {
        console.warn('[employerSkillSuggestions] getMarketTrendSkills failed:', error.message)
      }
      return []
    }
    return Array.isArray(data) ? data : []
  } catch (err) {
    console.warn('[employerSkillSuggestions] getMarketTrendSkills threw:', err?.message)
    return []
  }
}

/**
 * Returns supply counts per skill for a category — i.e. how many jobseekers in
 * San Carlos accepted / listed each skill (sourced from skill_recommendation_telemetry
 * via the get_skill_gap_insights RPC).
 *
 * Returns a Map keyed by lowercase skill name for O(1) lookups.
 *
 * @param {string} category
 * @returns {Promise<Map<string, number>>}
 */
export async function getSkillSupplyCounts(category) {
  if (!category) return new Map()
  try {
    const { data, error } = await supabase.rpc('get_skill_gap_insights', {
      p_limit: 100,
    })
    if (error) {
      if (error.code !== '42883' && error.code !== '42P01') {
        console.warn('[employerSkillSuggestions] getSkillSupplyCounts failed:', error.message)
      }
      return new Map()
    }
    const rows = Array.isArray(data) ? data : []
    const map = new Map()
    for (const row of rows) {
      map.set(row.skill_name.toLowerCase(), Number(row.supply_count))
    }
    return map
  } catch (err) {
    console.warn('[employerSkillSuggestions] getSkillSupplyCounts threw:', err?.message)
    return new Map()
  }
}
