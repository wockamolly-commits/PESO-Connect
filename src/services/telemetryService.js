import { supabase } from '../config/supabase'

// Call-site source strings → DB-level source values allowed by the CHECK constraint.
// Granular UI sources (ai_profile, ai_growth, ai_soft, deterministic_fallback) are
// collapsed so the DB always receives one of the four canonical values.
const SOURCE_MAP = {
  ai_profile:            'ai_deep_scan',
  ai_growth:             'ai_deep_scan',
  ai_soft:               'ai_deep_scan',
  deterministic_fallback:'deterministic',
}

/**
 * Fire-and-forget log of a skill chip acceptance.
 * Never throws — a failed log must never block registration progress.
 *
 * @param {string} skillName
 * @param {'deterministic'|'deterministic_fallback'|'ai_enrichment'|'demand_side'|'ai_profile'|'ai_growth'|'ai_soft'|'ai_deep_scan'} source
 * @param {string|null} category  - inferred job category (may be empty string or null)
 * @param {string|null} userId    - nullable for pre-auth / guest registrations
 */
export async function logSkillAcceptance(skillName, source, category = null, userId = null) {
  const dbSource = SOURCE_MAP[source] ?? source
  try {
    await supabase.from('skill_recommendation_telemetry').insert({
      user_id:    userId   || null,
      skill_name: skillName,
      source:     dbSource,
      category:   category || null,
    })
  } catch {
    // intentional no-op
  }
}
