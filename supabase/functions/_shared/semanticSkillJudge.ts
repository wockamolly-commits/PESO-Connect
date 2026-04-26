import { chatJSON } from './cohere.ts'

export type SemanticMatchType = 'exact' | 'partial' | 'related' | 'gap'

export type SemanticSkillJudgment = {
  requirement: string
  matched: boolean
  matchType: SemanticMatchType
  score: number
  bestSkill: string
  supportingSkills: string[]
  reason: string
}

export const SEMANTIC_MATCH_TYPE_SCORES: Record<SemanticMatchType, number> = {
  exact: 1,
  partial: 0.82,
  related: 0.68,
  gap: 0,
}

const normalizeText = (value: unknown) => String(value || '').trim()
const normalizeKey = (value: unknown) => normalizeText(value).toLowerCase().replace(/\s+/g, ' ')

export const scoreFromSemanticMatchType = (matchType: unknown) =>
  SEMANTIC_MATCH_TYPE_SCORES[String(matchType || '').toLowerCase() as SemanticMatchType] ?? 0

export const normalizeSemanticSkillJudgments = (
  payload: unknown,
  requirements: string[] = [],
) => {
  const rows = Array.isArray((payload as Record<string, unknown>)?.results)
    ? ((payload as Record<string, unknown>).results as Record<string, unknown>[])
    : []

  const byRequirement = new Map<string, SemanticSkillJudgment>()

  for (const row of rows) {
    const requirement = normalizeText(row.requirement)
    const key = normalizeKey(requirement)
    if (!requirement || !key) continue

    const normalizedType = (String(row.matchType || 'gap').toLowerCase() as SemanticMatchType)
    const matchType: SemanticMatchType =
      normalizedType === 'exact' || normalizedType === 'partial' || normalizedType === 'related'
        ? normalizedType
        : 'gap'

    const matched = row.matched === true && matchType !== 'gap'
    const fallbackScore = scoreFromSemanticMatchType(matchType)
    const rowScore = typeof row.score === 'number' && Number.isFinite(row.score)
      ? Math.max(0, Math.min(1, row.score))
      : fallbackScore

    byRequirement.set(key, {
      requirement,
      matched,
      matchType: matched ? matchType : 'gap',
      score: matched ? Math.max(rowScore, fallbackScore) : 0,
      bestSkill: normalizeText(row.bestSkill),
      supportingSkills: Array.isArray(row.supportingSkills)
        ? row.supportingSkills.map(normalizeText).filter(Boolean)
        : normalizeText(row.bestSkill) ? [normalizeText(row.bestSkill)] : [],
      reason: normalizeText(row.reason),
    })
  }

  for (const requirement of requirements) {
    const key = normalizeKey(requirement)
    if (!key || byRequirement.has(key)) continue
    byRequirement.set(key, {
      requirement,
      matched: false,
      matchType: 'gap',
      score: 0,
      bestSkill: '',
      supportingSkills: [],
      reason: '',
    })
  }

  return byRequirement
}

export const buildSemanticSkillJudgePrompt = ({
  requirements,
  userSkills,
  profileSignals = [],
}: {
  requirements: string[]
  userSkills: string[]
  profileSignals?: string[]
}) => `You are a conservative semantic skill matcher for a job platform.

Your task is to judge whether each job requirement is supported by the candidate's listed skills.

Rules:
- Be conservative. Do not invent experience or overgeneralize.
- "exact" means the same skill or a very near-equivalent wording.
- "partial" means strongly overlapping wording or nearly the same practical competency.
- "related" means a specific practical skill clearly supports a broader requirement.
- "gap" means there is not enough evidence.
- A broader soft/general requirement may be supported by a concrete technical skill if the connection is direct and defensible.
- Example: "Hardware Troubleshooting" can support "Problem Solving" because it involves diagnosing faults and resolving issues.
- Example: "Graphic Design" can support "Attention to Detail" because design work depends on precision, visual accuracy, layout consistency, and careful revision.
- Example: "Graphic Design" can support "Creativity" or "Visual Communication" when those requirements appear.
- Example: "Programming", "Debugging", or "Technical Support" can support "Analytical Thinking" or "Problem Solving".
- For soft-skill requirements such as "Attention to Detail", "Analytical Thinking", or "Problem Solving", use direct professional evidence when the candidate skill clearly demonstrates that competency.
- Do not mark something as matched just because both items are in the same industry.
- Use only the provided requirement list, candidate skills, and profile signals.
- Read the full candidate skill list and choose all skills that materially support the requirement, not just one representative skill.
- Return valid JSON only.

Requirements:
${requirements.map((item, index) => `${index + 1}. ${item}`).join('\n')}

Candidate Skills:
${userSkills.map((item, index) => `${index + 1}. ${item}`).join('\n')}

Additional Profile Signals:
${profileSignals.length > 0 ? profileSignals.map((item, index) => `${index + 1}. ${item}`).join('\n') : 'None'}

Return exactly:
{
  "results": [
    {
      "requirement": "Problem Solving",
      "matched": true,
      "matchType": "related",
      "score": 0.68,
      "bestSkill": "Hardware Troubleshooting",
      "supportingSkills": ["Hardware Troubleshooting", "Technical Support"],
      "reason": "Hardware Troubleshooting demonstrates diagnosing faults and resolving issues, which supports problem solving."
    }
  ]
}`

export const judgeSkillSemanticMatches = async ({
  requirements = [],
  userSkills = [],
  profileSignals = [],
}: {
  requirements: string[]
  userSkills: string[]
  profileSignals?: string[]
}) => {
  const cleanedRequirements = requirements.map(normalizeText).filter(Boolean)
  const cleanedSkills = userSkills.map(normalizeText).filter(Boolean).slice(0, 96)
  const cleanedSignals = profileSignals.map(normalizeText).filter(Boolean).slice(0, 48)

  if (cleanedRequirements.length === 0 || cleanedSkills.length === 0) {
    return normalizeSemanticSkillJudgments({ results: [] }, cleanedRequirements)
  }

  const prompt = buildSemanticSkillJudgePrompt({
    requirements: cleanedRequirements,
    userSkills: cleanedSkills,
    profileSignals: cleanedSignals,
  })

  const response = await chatJSON(prompt, { maxTokens: 1200, temperature: 0.1 })
  const parsed = JSON.parse(response.text)
  return normalizeSemanticSkillJudgments(parsed, cleanedRequirements)
}
