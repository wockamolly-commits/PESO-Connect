import { supabase } from '../config/supabase'

/**
 * Fire-and-forget log of a skill chip acceptance.
 * Never throws — a failed log must never block registration progress.
 *
 * @param {string} skillName
 * @param {'deterministic'|'ai_enrichment'|'demand_side'} source
 * @param {string|null} category  - inferred job category (may be empty string or null)
 * @param {string|null} userId    - nullable for pre-auth / guest registrations
 */
export async function logSkillAcceptance(skillName, source, category = null, userId = null) {
  try {
    await supabase.from('skill_recommendation_telemetry').insert({
      user_id:    userId   || null,
      skill_name: skillName,
      source,
      category:   category || null,
    })
  } catch {
    // intentional no-op
  }
}
