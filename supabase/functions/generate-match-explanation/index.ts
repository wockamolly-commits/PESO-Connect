import { handleCorsPreflightRequest, jsonResponse } from '../_shared/cors.ts'

interface GenerateMatchExplanationRequest {
  userId?: string
  jobId?: string
  scores?: Record<string, unknown>
  matchingSkills?: string[]
  missingSkills?: string[]
}

const asNumber = (value: unknown, fallback = 0) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback

const asString = (value: unknown) => (typeof value === 'string' ? value : '')

const asArray = <T = unknown,>(value: unknown) => (Array.isArray(value) ? value as T[] : [])

const buildExplanation = (scores: Record<string, unknown>, matchingSkills: string[], missingSkills: string[]) => {
  const inferredSoftSkills = asArray<Record<string, unknown>>(scores.inferredSoftSkills)
  const overqualificationSignal = scores.overqualificationSignal && typeof scores.overqualificationSignal === 'object'
    ? scores.overqualificationSignal as Record<string, unknown>
    : null

  const strengths = matchingSkills.slice(0, 3).join(', ')
  const inferredLine = inferredSoftSkills[0]
    ? `${asString(inferredSoftSkills[0].requirement)} is being credited based on ${asString(inferredSoftSkills[0].recruiterReason).toLowerCase()}`
    : ''

  if (overqualificationSignal) {
    return `This profile reads as a ${asString(overqualificationSignal.title)}. The candidate already brings precision-oriented technical strengths that align with the role's detail requirements${strengths ? `, including ${strengths}` : ''}${inferredLine ? `. ${inferredLine.charAt(0).toUpperCase()}${inferredLine.slice(1)}.` : '.'}`
  }

  if (missingSkills.length > 0) {
    const firstGap = missingSkills[0]
    return `The candidate shows credible alignment for this role${strengths ? ` through ${strengths}` : ''}. The main gap is ${firstGap}, but the profile still offers transferable evidence${inferredLine ? `, and ${inferredLine}` : ''}.`
  }

  return `The candidate presents a strong overall fit${strengths ? `, with clear alignment in ${strengths}` : ''}.${inferredLine ? ` ${inferredLine.charAt(0).toUpperCase()}${inferredLine.slice(1)}.` : ''}`
}

const buildSkillBreakdown = (scores: Record<string, unknown>) => {
  const inferredSoftSkills = asArray<Record<string, unknown>>(scores.inferredSoftSkills)
  const overqualificationSignal = scores.overqualificationSignal && typeof scores.overqualificationSignal === 'object'
    ? scores.overqualificationSignal as Record<string, unknown>
    : null

  return [
    {
      category: 'Technical Competency',
      score: asNumber(scores.technicalCompetencyScore, asNumber(scores.skillScore, 0)),
      detail: overqualificationSignal
        ? asString(overqualificationSignal.detail)
        : 'Direct requirements, transferable technical fit, and relevant experience were weighted together here.',
    },
    {
      category: 'Inferred Soft Skills',
      score: asNumber(scores.inferredSoftSkillScore, 0),
      detail: inferredSoftSkills.length > 0
        ? inferredSoftSkills.map((item) => `${asString(item.requirement)}: ${asString(item.recruiterReason)}`).join(' ')
        : 'No inferred soft-skill adjustments were needed for this match.',
    },
    {
      category: 'Baseline Readiness',
      score: asNumber(scores.baselineScore, asNumber(scores.educationScore, 0)),
      detail: 'Education and baseline readiness were kept as supporting factors rather than the main driver of the score.',
    },
  ]
}

const buildActionItems = (scores: Record<string, unknown>, missingSkills: string[]) => {
  const rebrandingSuggestions = asArray<string>(scores.rebrandingSuggestions).filter(Boolean)

  if (rebrandingSuggestions.length > 0) {
    return rebrandingSuggestions.slice(0, 2).map((action, index) => ({
      action,
      type: 'positioning',
      priority: index === 0 ? 'high' : 'medium',
    }))
  }

  if (missingSkills.length > 0) {
    return [
      {
        action: `Reframe your existing experience to show practical evidence for ${missingSkills[0]}.`,
        type: 'positioning',
        priority: 'high',
      },
    ]
  }

  return [
    {
      action: 'Lead your application with the strongest matched requirements and quantify the outcomes behind them.',
      type: 'positioning',
      priority: 'medium',
    },
  ]
}

const buildImprovementTips = (scores: Record<string, unknown>, missingSkills: string[]) => {
  const inferredSoftSkills = asArray<Record<string, unknown>>(scores.inferredSoftSkills)
  const tips = []

  if (inferredSoftSkills.length > 0) {
    tips.push(inferredSoftSkills.map((item) => `Make ${asString(item.requirement)} explicit by citing work that demonstrates ${asString(item.inferredSkill).toLowerCase()}.`).join(' '))
  }

  if (missingSkills.length > 0) {
    tips.push(`For ${missingSkills[0]}, use examples from your current background instead of listing it as a separate unsupported skill.`)
  }

  if (tips.length === 0) {
    tips.push('Use your cover letter or profile summary to connect your strongest matched skills directly to the role priorities.')
  }

  return tips.slice(0, 2)
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return handleCorsPreflightRequest()
    }

    const body = (await req.json()) as GenerateMatchExplanationRequest

    if (!body.userId || !body.jobId) {
      return jsonResponse({ error: 'userId and jobId are required' }, { status: 400 })
    }

    const scores = body.scores && typeof body.scores === 'object' ? body.scores : {}
    const matchingSkills = Array.isArray(body.matchingSkills) ? body.matchingSkills : []
    const missingSkills = Array.isArray(body.missingSkills) ? body.missingSkills : []

    return jsonResponse({
      explanation: buildExplanation(scores, matchingSkills, missingSkills),
      skillBreakdown: buildSkillBreakdown(scores),
      actionItems: buildActionItems(scores, missingSkills),
      improvementTips: buildImprovementTips(scores, missingSkills),
      status: 'deterministic',
    })
  } catch (err) {
    console.error('generate-match-explanation error:', err)
    return jsonResponse({ error: err.message }, { status: 500 })
  }
})
