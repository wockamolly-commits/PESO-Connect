import { HIGH_TIER_SKILL_PATTERNS } from './deterministicScore.ts'

const TECHNICAL_CATEGORIES = new Set([
  // Short-form keys stored by PostJob UI
  'it',
  // Long-form names (legacy/admin rows)
  'information technology',
  'it support',
  'software development',
  'engineering',
  'data',
  'cybersecurity',
  'devops',
  'design',
  'network',
  'systems administration',
])

const TITLE_PATTERNS = [
  /\b(?:software|data|systems?|network|cloud|security|devops|qa|test|hardware|firmware|embedded|backend|frontend|full[\s-]?stack|mobile|ios|android|web|machine\s*learning|ml|ai)\s+engineer\b/i,
  /\b(?:software|systems?|cloud|solutions?|data|enterprise|security)\s+architect\b/i,
  /\b(?:software|web|app|application|mobile|ios|android|frontend|backend|full[\s-]?stack|react|vue|angular|node|python|java|php|game|embedded)\s+developer\b/i,
  /\bprogrammer\b/i,
  /\bcoder\b/i,
  /\bit\s*support\b/i,
  /\btechnical\s*support\b/i,
  /\bhelp\s*desk\b/i,
  /\bsysadmin\b/i,
  /\bsystem\s*administrator\b/i,
  /\bnetwork\s*admin/i,
  /\bdevops\b/i,
  /\bsre\b/i,
  /\bqa\b/i,
  /\btester\b/i,
  /\bdata\s*(scientist|analyst|engineer)\b/i,
  /\bcybersecurity\b/i,
  /\b(?:cyber|it|information|network|application|cloud|web)\s+security\b/i,
  /\b(?:web|frontend|backend|full[\s-]?stack|mobile|ios|android)\s+(?:dev|developer|engineer)\b/i,
  /\b(?:ui|ux)\s+designer\b/i,
  /\b(?:product|web|graphic)\s+designer\b/i,
]

export const isTechnicalJob = (job: Record<string, unknown>): boolean => {
  // Check A: category allowlist
  const category = String(job.category ?? '').toLowerCase().trim()
  if (category && TECHNICAL_CATEGORIES.has(category)) return true

  // Check B: title keyword patterns
  const title = String(job.title ?? '').trim()
  if (title && TITLE_PATTERNS.some((p) => p.test(title))) return true

  // Check C: required_skills content against HIGH_TIER_SKILL_PATTERNS
  const skills = Array.isArray(job.required_skills) ? job.required_skills : []
  if (skills.some((s) => typeof s === 'string' && HIGH_TIER_SKILL_PATTERNS.some((p) => p.test(s)))) return true

  return false
}
