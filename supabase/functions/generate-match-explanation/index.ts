import { handleCorsPreflightRequest, jsonResponse } from '../_shared/cors.ts'

interface GenerateMatchExplanationRequest {
  userId?: string
  jobId?: string
  scores?: Record<string, unknown>
  matchingSkills?: string[]
  missingSkills?: string[]
}

const REQUIRED_WEIGHT = 0.8
const SUPPORT_WEIGHT = 0.2
const CREDIT_EXACT = 1.0
const CREDIT_PARTIAL = 0.75
const CREDIT_RELATED = 0.4

const asNumber = (value: unknown, fallback = 0) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback

const asString = (value: unknown) => (typeof value === 'string' ? value : '')

const asArray = <T = unknown,>(value: unknown) => (Array.isArray(value) ? value as T[] : [])

const uniqueStrings = (values: string[]) => Array.from(new Set(values.filter(Boolean)))

const formatList = (values: string[], limit = 3) => {
  const cleaned = uniqueStrings(values.map((value) => String(value || '').trim()))
  return cleaned.slice(0, limit)
}

const joinNatural = (values: string[]) => {
  if (values.length === 0) return ''
  if (values.length === 1) return values[0]
  if (values.length === 2) return `${values[0]} and ${values[1]}`
  return `${values.slice(0, -1).join(', ')}, and ${values[values.length - 1]}`
}

const buildTransferableDetails = (scores: Record<string, unknown>) => {
  const breakdown = asArray<Record<string, unknown>>(scores.skillBreakdown)
  const entries = breakdown
    .filter((entry) =>
      asString(entry.kind) === 'skill' &&
      asString(entry.tier) === 'required' &&
      asString(entry.matchType) === 'related',
    )
    .map((entry) => {
      const label = asString(entry.label)
      const matchedSkill = asString(entry.matchedSkill)
      const supportingSkills = uniqueStrings(
        asArray<string>(entry.supportingSkills).concat(matchedSkill ? [matchedSkill] : []),
      )
      const reason = asString(entry.reason)
      return {
        label,
        reason,
        supportingSkills,
      }
    })
    .filter((entry) => entry.label)

  const seen = new Set<string>()
  return entries.filter((entry) => {
    const key = `${entry.label.toLowerCase()}|${entry.reason.toLowerCase()}|${entry.supportingSkills.join('|').toLowerCase()}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const buildStrongMatchDetails = (scores: Record<string, unknown>) => {
  const breakdown = asArray<Record<string, unknown>>(scores.skillBreakdown)
  const entries = breakdown
    .filter((entry) =>
      asString(entry.kind) === 'skill' &&
      asString(entry.tier) === 'required' &&
      asString(entry.status) === 'match',
    )
    .map((entry) => {
      const label = asString(entry.label)
      const matchedSkill = asString(entry.matchedSkill)
      const matchType = asString(entry.matchType)
      const supportingSkills = uniqueStrings(
        asArray<string>(entry.supportingSkills).concat(matchedSkill ? [matchedSkill] : []),
      )
      const reason = asString(entry.reason)
      return {
        label,
        matchedSkill,
        matchType,
        supportingSkills,
        reason,
      }
    })
    .filter((entry) => entry.label)

  const seen = new Set<string>()
  return entries.filter((entry) => {
    const key = `${entry.label.toLowerCase()}|${entry.matchedSkill.toLowerCase()}|${entry.reason.toLowerCase()}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const splitStrongDetails = (strongMatchDetails: ReturnType<typeof buildStrongMatchDetails>) => {
  const exactDetails: typeof strongMatchDetails = []
  const partialDetails: typeof strongMatchDetails = []
  for (const entry of strongMatchDetails) {
    if (entry.matchType === 'partial') {
      partialDetails.push(entry)
    } else {
      exactDetails.push(entry)
    }
  }
  return { exactDetails, partialDetails }
}

const buildScoreAttribution = (scores: Record<string, unknown>) => {
  const requiredSkillSummary = scores.requiredSkillSummary && typeof scores.requiredSkillSummary === 'object'
    ? scores.requiredSkillSummary as Record<string, unknown>
    : {}
  const scoreComposition = scores.scoreComposition && typeof scores.scoreComposition === 'object'
    ? scores.scoreComposition as Record<string, unknown>
    : {}

  const total = Math.max(asNumber(requiredSkillSummary.total, 0), 0)
  const exactCount = asNumber(requiredSkillSummary.exact, 0)
  const partialCount = asNumber(requiredSkillSummary.partial, 0)
  const relatedCount = asNumber(requiredSkillSummary.related, 0)
  const missingCount = asNumber(requiredSkillSummary.missing, 0)

  const supportScore = asNumber(scoreComposition.supportScore, asNumber(scores.supportScore, 0))
  const preferredBonus = asNumber(scoreComposition.preferredBonus, asNumber(scores.preferredSkillBonus, 0))

  // Decompose the requiredSkillScore by tier into final-score points.
  // Each required slot contributes (credit / total) * 100 to requiredSkillScore,
  // which is then multiplied by REQUIRED_WEIGHT to express it in final-score points.
  const tierPoints = (count: number, credit: number) => {
    if (total === 0) return 0
    return (count * credit / total) * 100 * REQUIRED_WEIGHT
  }

  const exactPoints = tierPoints(exactCount, CREDIT_EXACT)
  const partialPoints = tierPoints(partialCount, CREDIT_PARTIAL)
  const relatedPoints = tierPoints(relatedCount, CREDIT_RELATED)
  const missingLost = tierPoints(missingCount, CREDIT_EXACT)
  const supportPoints = supportScore * SUPPORT_WEIGHT

  // Express each as % of the total accountable signal so the four bars sum to 100%.
  const accountable = exactPoints + partialPoints + relatedPoints + supportPoints + missingLost
  const safeAccountable = accountable > 0 ? accountable : 1

  const buckets = [
    { key: 'exact', raw: (exactPoints + partialPoints) / safeAccountable * 100 },
    { key: 'related', raw: relatedPoints / safeAccountable * 100 },
    { key: 'support', raw: supportPoints / safeAccountable * 100 },
    { key: 'missing', raw: missingLost / safeAccountable * 100 },
  ]

  const rounded = buckets.map((b) => ({ ...b, percent: Math.round(b.raw) }))
  const drift = 100 - rounded.reduce((sum, b) => sum + b.percent, 0)
  if (drift !== 0 && rounded.length > 0) {
    rounded.sort((a, b) => b.raw - a.raw)
    rounded[0].percent += drift
  }
  const percentByKey: Record<string, number> = {}
  for (const b of rounded) percentByKey[b.key] = b.percent

  const breakdown = asArray<Record<string, unknown>>(scores.skillBreakdown)
  const exactSkills = breakdown
    .filter((e) => asString(e.kind) === 'skill' && asString(e.tier) === 'required'
      && asString(e.status) === 'match' && asString(e.matchType) !== 'partial')
    .map((e) => asString(e.label))
    .filter(Boolean)
  const partialSkills = breakdown
    .filter((e) => asString(e.kind) === 'skill' && asString(e.tier) === 'required'
      && asString(e.status) === 'match' && asString(e.matchType) === 'partial')
    .map((e) => asString(e.label))
    .filter(Boolean)
  const relatedSkills = breakdown
    .filter((e) => asString(e.kind) === 'skill' && asString(e.tier) === 'required'
      && asString(e.matchType) === 'related')
    .map((e) => asString(e.label))
    .filter(Boolean)
  const missingSkillLabels = breakdown
    .filter((e) => asString(e.kind) === 'skill' && asString(e.tier) === 'required' && asString(e.status) === 'gap')
    .map((e) => asString(e.label))
    .filter(Boolean)
  const preferredSkills = breakdown
    .filter((e) => asString(e.tier) === 'preferred' && (asString(e.status) === 'match' || asString(e.status) === 'partial'))
    .map((e) => asString(e.label))
    .filter(Boolean)

  return {
    exact: {
      points: Math.round(exactPoints + partialPoints),
      percent: percentByKey.exact ?? 0,
      count: exactCount + partialCount,
      skills: uniqueStrings([...exactSkills, ...partialSkills]),
    },
    related: {
      points: Math.round(relatedPoints),
      percent: percentByKey.related ?? 0,
      count: relatedCount,
      skills: uniqueStrings(relatedSkills),
    },
    missing: {
      lostPoints: Math.round(missingLost),
      percent: percentByKey.missing ?? 0,
      count: missingCount,
      skills: uniqueStrings(missingSkillLabels),
    },
    support: {
      points: Math.round(supportPoints),
      percent: percentByKey.support ?? 0,
      detail: `Education and experience contribute alongside your skill evidence.`,
    },
    preferredBonus: {
      points: Math.round(preferredBonus),
      skills: uniqueStrings(preferredSkills),
    },
  }
}

const buildExplanation = (
  scores: Record<string, unknown>,
  matchingSkills: string[],
  missingSkills: string[],
  attribution: ReturnType<typeof buildScoreAttribution>,
) => {
  const matchScore = asNumber(scores.matchScore, asNumber(scores.finalScore, 0))
  const matchLevel = asString(scores.matchLevel) || (
    matchScore >= 80 ? 'strong'
      : matchScore >= 60 ? 'good'
      : matchScore >= 40 ? 'fair'
      : 'limited'
  ).toLowerCase()
  const strongMatchDetails = buildStrongMatchDetails(scores)
  const { exactDetails, partialDetails } = splitStrongDetails(strongMatchDetails)
  const transferableDetails = buildTransferableDetails(scores)

  const exactCount = attribution.exact.count
  const relatedCount = attribution.related.count
  const missingCount = attribution.missing.count

  const headline = `You scored ${matchScore}/100 — a ${matchLevel} fit for this role.`

  const evidenceParts: string[] = []
  if (exactCount > 0) {
    const labels = formatList(exactDetails.map((d) => d.label).concat(partialDetails.map((d) => d.label)), 3)
    evidenceParts.push(`${exactCount} exact match${exactCount === 1 ? '' : 'es'} (${joinNatural(labels)})`)
  }
  if (relatedCount > 0) {
    const labels = formatList(transferableDetails.map((d) => d.label), 3)
    evidenceParts.push(`${relatedCount} related skill${relatedCount === 1 ? '' : 's'} bridging the gap on ${joinNatural(labels)}`)
  }

  let evidenceLine: string
  if (evidenceParts.length > 0) {
    evidenceLine = `Your strongest evidence came from ${joinNatural(evidenceParts)}.`
  } else {
    evidenceLine = `Your profile does not yet show direct evidence for this role's required skills.`
  }

  let missingLine = ''
  if (missingCount > 0) {
    const top = formatList(missingSkills.length > 0 ? missingSkills : attribution.missing.skills, 2)
    if (top.length > 0) {
      missingLine = exactCount === 0
        ? `Adding evidence for ${joinNatural(top)} would unlock the rest of the score.`
        : `To raise your score, add evidence for ${joinNatural(top)}.`
    }
  }

  // Transparency clause: surface up to two alias/synonym-based matches.
  const aliasNotes = partialDetails.slice(0, 2).map((d) => {
    if (d.matchedSkill && d.matchedSkill.toLowerCase() !== d.label.toLowerCase()) {
      return `'${d.label}' was matched through your '${d.matchedSkill}' experience`
    }
    return null
  }).filter((note): note is string => Boolean(note))

  let transparencyLine = ''
  if (aliasNotes.length > 0) {
    transparencyLine = `Note: ${joinNatural(aliasNotes)}.`
  }

  return [headline, evidenceLine, missingLine, transparencyLine]
    .filter(Boolean)
    .join(' ')
}

const buildSkillBreakdown = (attribution: ReturnType<typeof buildScoreAttribution>) => {
  const exactDetail = attribution.exact.count > 0
    ? `${attribution.exact.count} skill${attribution.exact.count === 1 ? '' : 's'} directly matched: ${joinNatural(formatList(attribution.exact.skills, 3))}.`
    : `No skills directly matched the role's required list yet.`

  const relatedDetail = attribution.related.count > 0
    ? `${attribution.related.count} skill${attribution.related.count === 1 ? '' : 's'} bridged from your background: ${joinNatural(formatList(attribution.related.skills, 3))}.`
    : `No transferable skills credited.`

  const missingDetail = attribution.missing.count > 0
    ? `${attribution.missing.count} requirement${attribution.missing.count === 1 ? '' : 's'} without evidence: ${joinNatural(formatList(attribution.missing.skills, 3))}.`
    : `No remaining gaps in the required-skill list.`

  return [
    {
      category: 'Exact Matches',
      score: attribution.exact.percent,
      detail: exactDetail,
    },
    {
      category: 'Related / Transferable',
      score: attribution.related.percent,
      detail: relatedDetail,
    },
    {
      category: 'Missing / Gaps',
      score: attribution.missing.percent,
      detail: missingDetail,
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
  const tips: string[] = []

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

    const scoreAttribution = buildScoreAttribution(scores)

    return jsonResponse({
      explanation: buildExplanation(scores, matchingSkills, missingSkills, scoreAttribution),
      skillBreakdown: buildSkillBreakdown(scoreAttribution),
      scoreAttribution,
      actionItems: buildActionItems(scores, missingSkills),
      improvementTips: buildImprovementTips(scores, missingSkills),
      status: 'deterministic',
    })
  } catch (err) {
    console.error('generate-match-explanation error:', err)
    return jsonResponse({ error: err.message }, { status: 500 })
  }
})
