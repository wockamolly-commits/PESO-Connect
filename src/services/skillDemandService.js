import { supabase } from '../config/supabase'

// Keyword → category map for the 6 job categories the matcher recognizes.
// Kept narrow and decisive — if nothing matches, we return '' and the UI hides
// the demand panel rather than guessing wrong.
const CATEGORY_KEYWORDS = [
  { category: 'agriculture', pattern: /\b(farm|agri|crop|livestock|fisher|aqua|poultry|rice|vegetable|forestry|veterinar)\w*\b/i },
  { category: 'energy', pattern: /\b(electric|solar|lineman|power\s*(?:plant|line|utility)|generator|substation|scada|plc|transformer)\w*\b/i },
  { category: 'retail', pattern: /\b(cashier|sales|merchandis|store|retail|pos|inventory|teller)\w*\b/i },
  { category: 'it', pattern: /\b(it\b|developer|programmer|software|web|network|database|cyber|helpdesk|sysadmin|devops|cloud|ict\b|computer\s*(?:sci|engineer|tech)|data\s*sci|data\s*analyt|multimedia\s*comput|entertain.*comput|mechatron)\w*\b/i },
  { category: 'trades', pattern: /\b(plumb|carpent|mason|weld|electrician|construct|roof|tile|hvac|mechanic|automotiv|motorcycle)\w*\b/i },
  { category: 'hospitality', pattern: /\b(cook|chef|baker|barista|bartend|housekeep|waiter|server|restaurant|hotel|catering|concierge|food\s*(?:service|attendant))\w*\b/i },
]

/**
 * Infer the most likely job category for a jobseeker from registration form data.
 * Checks preferred_occupations first (strongest explicit signal), then work
 * experience positions, then course_or_field.
 * @param {object} formData - registration form state
 * @returns {string} one of 'agriculture'|'energy'|'retail'|'it'|'trades'|'hospitality' or ''
 */
export function inferCategoryFromProfile(formData = {}) {
  const sources = []
  const preferred = Array.isArray(formData.preferred_occupations) ? formData.preferred_occupations : []
  preferred.forEach(p => { if (typeof p === 'string' && p.trim()) sources.push(p) })
  const experiences = Array.isArray(formData.work_experiences) ? formData.work_experiences : []
  experiences.forEach(e => { if (e && e.position) sources.push(e.position) })
  if (formData.course_or_field) sources.push(formData.course_or_field)

  // Tally matches; return the category with the most hits.
  const tally = {}
  for (const text of sources) {
    for (const { category, pattern } of CATEGORY_KEYWORDS) {
      if (pattern.test(text)) {
        tally[category] = (tally[category] || 0) + 1
      }
    }
  }
  const winner = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]
  return winner ? winner[0] : ''
}

/**
 * Fetch the top-N skills employers are currently requesting in a category,
 * sourced from open `job_postings.requirements[]`. Safe to call before the
 * SQL migration is applied — returns [] on any error.
 * @param {string} category
 * @param {number} limit
 * @returns {Promise<Array<{requirement: string, demand_count: number}>>}
 */
export async function getTopDemandSkills(category, limit = 10) {
  if (!category) return []
  try {
    const { data, error } = await supabase.rpc('get_top_demand_skills', {
      p_category: category,
      p_limit: limit,
    })
    if (error) {
      if (error.code !== '42883' && error.code !== '42P01') {
        console.warn('getTopDemandSkills failed:', error.message)
      }
      return []
    }
    return Array.isArray(data) ? data : []
  } catch (err) {
    console.warn('getTopDemandSkills threw:', err?.message)
    return []
  }
}
