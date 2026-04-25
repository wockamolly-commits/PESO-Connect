import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { embedTexts } from '../_shared/cohere.ts'
import { handleCorsPreflightRequest, jsonResponse } from '../_shared/cors.ts'
import {
  calculateDeterministicScore,
  classifyRequirements,
  educationSatisfied,
  getJobEducationOrdinal,
  getUserEducationOrdinal,
  isEducationRequirement,
  isLanguageRequirement,
  languageSatisfied,
  matchRequirementToSkillSet,
} from '../_shared/deterministicScore.ts'
import { ensureProfileEmbedding } from '../_shared/embeddingStore.ts'
import { sha256 } from '../_shared/hash.ts'
import { getOrCreateRequirementEmbeddings } from '../_shared/requirementEmbeddingStore.ts'
import { calibrateSemantic } from '../_shared/semanticCalibration.ts'
import { computePersonalizationAdjust, getUserAffinity } from '../_shared/userAffinity.ts'
import { buildJobText } from '../_shared/matchingText.ts'
import { cosineSimilarity, normalizeCosineScore } from '../_shared/similarity.ts'
import { judgeSkillSemanticMatches, type SemanticSkillJudgment } from '../_shared/semanticSkillJudge.ts'
import { isTechnicalJob } from '../_shared/technicalRole.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const MAX_CANDIDATES = 500
const SEMANTIC_SHORTLIST_SIZE = 50
const MAX_USER_SKILL_TEXTS = 96
const MATCHER_VERSION = 'inferential-v10'

// Per-skill status thresholds. These drive the JobDetail UI's
// three-state checks AND the Requirements pill coloring, so the
// per-row display always agrees with the aggregate score.
//   match   — strong direct or near-direct fit (rule hit, or
//             calibrated semantic >= 0.85)
//   partial — inferred / transferable / weakly-related fit
//   gap     — score below partial threshold
const STATUS_MATCH_THRESHOLD = 0.85
const STATUS_PARTIAL_THRESHOLD = 0.5

const statusFromScore = (score: number): 'match' | 'partial' | 'gap' => {
  if (score >= STATUS_MATCH_THRESHOLD) return 'match'
  if (score >= STATUS_PARTIAL_THRESHOLD) return 'partial'
  return 'gap'
}

type SkillBreakdownEntry = {
  label: string
  tier: 'required' | 'preferred'
  kind: 'skill' | 'education' | 'language'
  score: number
  status: 'match' | 'partial' | 'gap'
  reason?: string
  matchedSkill?: string
  supportingSkills?: string[]
  matchType?: string
}

type MatchEvidenceEntry = {
  type: string
  jobField: string
  jobValue: string
  candidateField: string
  candidateValue: string
  matchMode: string
  score?: number
}

type MatchGapEntry = {
  type: string
  jobField: string
  jobValue: string
}

interface MatchJobsRequest {
  userId?: string
  filters?: Record<string, unknown>
  limit?: number
  offset?: number
  rerank?: boolean
}

type JobRecord = Record<string, unknown>
type ProfileRecord = Record<string, unknown>

const chunk = <T,>(items: T[], size: number) => {
  const result: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size))
  }
  return result
}

const uniqueStrings = (values: string[]) => {
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of values) {
    const trimmed = value.trim()
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(trimmed)
  }
  return result
}

type HardFilterReason =
  | 'education_not_met'
  | 'language_not_met'
  | 'license_not_met'

const profileHasLicense = (profile: ProfileRecord, required: string): boolean => {
  const needle = required.toLowerCase().trim()
  if (!needle) return true

  const pools: unknown[] = [
    profile.professional_licenses,
    profile.certifications,
    profile.vocational_training,
  ]

  for (const pool of pools) {
    if (!Array.isArray(pool)) continue
    for (const item of pool) {
      const text = typeof item === 'string'
        ? item
        : item && typeof item === 'object'
          ? String((item as Record<string, unknown>).name ?? (item as Record<string, unknown>).title ?? '')
          : ''
      if (text && text.toLowerCase().includes(needle)) return true
    }
  }
  return false
}

// Stage-1 hard filters: pass/fail gates evaluated BEFORE any embedding work.
// Rejected jobs never hit Cohere, never enter the shortlist, never get scored.
// Returns null if the job passes, or a reason code if it fails.
const rejectOnHardFilters = (job: JobRecord, profile: ProfileRecord): HardFilterReason | null => {
  if (job.education_is_required === true) {
    const jobOrdinal = getJobEducationOrdinal(String(job.education_level || ''))
    const userOrdinal = getUserEducationOrdinal(profile)
    if (jobOrdinal > 0 && userOrdinal < jobOrdinal) return 'education_not_met'
  }

  if (job.languages_are_required === true) {
    const required = Array.isArray(job.required_languages) ? job.required_languages : []
    for (const lang of required) {
      if (typeof lang !== 'string' || !lang.trim()) continue
      if (!languageSatisfied(lang, profile.languages)) return 'language_not_met'
    }
  }

  if (job.licenses_are_required === true) {
    const required = Array.isArray(job.required_licenses) ? job.required_licenses : []
    for (const lic of required) {
      if (typeof lic !== 'string' || !lic.trim()) continue
      if (!profileHasLicense(profile, lic)) return 'license_not_met'
    }
  }

  return null
}

const PREFERRED_BONUS_CAP = 10

// The "required tier" is the structured list we backfilled via the
// hard-filter migration. When it's populated we use it verbatim.
// When it's empty (legacy rows or flexible jobs that skipped the
// heuristic), fall back to the full `requirements` blob minus
// education/language phrases — preserves prior behavior.
const getRequiredSkillList = (job: JobRecord): string[] => {
  const structured = Array.isArray(job.required_skills)
    ? (job.required_skills as unknown[]).filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    : []
  if (structured.length > 0) return structured

  return getJobRequirements(job).filter(
    (req) => !isEducationRequirement(req) && !isLanguageRequirement(req),
  )
}

const getPreferredSkillList = (job: JobRecord): string[] =>
  Array.isArray(job.preferred_skills)
    ? (job.preferred_skills as unknown[]).filter(
      (s): s is string => typeof s === 'string' && s.trim().length > 0,
    )
    : []

const getJobRequirements = (job: JobRecord) => {
  const raw = Array.isArray(job.requirements) ? job.requirements : []

  return raw
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean)
}

const hasText = (value: unknown) => typeof value === 'string' && value.trim().length > 0

const getProfileLicenseTexts = (profile: ProfileRecord) => {
  const values: string[] = []
  const pools: unknown[] = [
    profile.professional_licenses,
    profile.certifications,
    profile.vocational_training,
  ]

  for (const pool of pools) {
    if (!Array.isArray(pool)) continue
    for (const item of pool) {
      if (typeof item === 'string' && item.trim()) {
        values.push(item.trim())
        continue
      }
      if (item && typeof item === 'object') {
        const text = String((item as Record<string, unknown>).name ?? (item as Record<string, unknown>).title ?? '').trim()
        if (text) values.push(text)
      }
    }
  }

  return uniqueStrings(values)
}

const hasStructuredJobRequirements = (job: JobRecord) =>
  getRequiredSkillList(job).length > 0 ||
  getPreferredSkillList(job).length > 0 ||
  getJobRequirements(job).length > 0 ||
  hasText(job.education_level) ||
  hasText(job.experience_level) ||
  (Array.isArray(job.required_languages) && job.required_languages.length > 0) ||
  (Array.isArray(job.required_licenses) && job.required_licenses.length > 0) ||
  job.education_is_required === true ||
  job.languages_are_required === true ||
  job.licenses_are_required === true

const buildEvidenceLedger = (
  job: JobRecord,
  profile: ProfileRecord,
  skillBreakdown: SkillBreakdownEntry[],
): { evidence: MatchEvidenceEntry[]; gaps: MatchGapEntry[] } => {
  const evidence: MatchEvidenceEntry[] = []
  const gaps: MatchGapEntry[] = []

  for (const entry of skillBreakdown) {
    if (!entry.label) continue
    if (entry.status === 'gap') {
      gaps.push({
        type: `${entry.kind}_${entry.tier}_gap`,
        jobField: entry.kind,
        jobValue: entry.label,
      })
      continue
    }

    evidence.push({
      type: `${entry.kind}_${entry.tier}_${entry.status}`,
      jobField: entry.kind,
      jobValue: entry.label,
      candidateField: entry.kind,
      candidateValue: entry.label,
      matchMode: entry.status,
      score: entry.score,
    })
  }

  if (hasText(job.education_level) && hasText(profile.highest_education) && educationSatisfied(String(job.education_level), profile.highest_education)) {
    evidence.push({
      type: 'job_education_match',
      jobField: 'education_level',
      jobValue: String(job.education_level).trim(),
      candidateField: 'highest_education',
      candidateValue: String(profile.highest_education).trim(),
      matchMode: 'matched',
      score: 1,
    })
  }

  if (Array.isArray(job.required_languages) && Array.isArray(profile.languages)) {
    for (const lang of job.required_languages) {
      if (typeof lang !== 'string' || !lang.trim()) continue
      if (languageSatisfied(lang, profile.languages)) {
        evidence.push({
          type: 'required_language_match',
          jobField: 'required_languages',
          jobValue: lang.trim(),
          candidateField: 'languages',
          candidateValue: lang.trim(),
          matchMode: 'matched',
          score: 1,
        })
      } else {
        gaps.push({
          type: 'required_language_gap',
          jobField: 'required_languages',
          jobValue: lang.trim(),
        })
      }
    }
  }

  const licenseTexts = getProfileLicenseTexts(profile)
  if (Array.isArray(job.required_licenses)) {
    for (const license of job.required_licenses) {
      if (typeof license !== 'string' || !license.trim()) continue
      const matchedLicense = licenseTexts.find((text) => text.toLowerCase().includes(license.toLowerCase().trim()))
      if (matchedLicense) {
        evidence.push({
          type: 'required_license_match',
          jobField: 'required_licenses',
          jobValue: license.trim(),
          candidateField: 'licenses',
          candidateValue: matchedLicense,
          matchMode: 'matched',
          score: 1,
        })
      } else {
        gaps.push({
          type: 'required_license_gap',
          jobField: 'required_licenses',
          jobValue: license.trim(),
        })
      }
    }
  }

  const dedupe = <T extends { type: string; jobField: string; jobValue: string }>(items: T[]) => {
    const seen = new Set<string>()
    return items.filter((item) => {
      const key = `${item.type}:${item.jobField}:${item.jobValue}:${'candidateValue' in item ? (item as MatchEvidenceEntry).candidateValue : ''}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  return {
    evidence: dedupe(evidence),
    gaps: dedupe(gaps),
  }
}

const computeMatchConfidence = (job: JobRecord, profile: ProfileRecord) => {
  const profileSkills = getUserSkillNames(profile)
  const profileLicenses = getProfileLicenseTexts(profile)
  const jobHasSkills = getRequiredSkillList(job).length > 0 || getPreferredSkillList(job).length > 0
  const jobHasExperience = hasText(job.experience_level) || hasText(job.category)
  const jobHasEducation = hasText(job.education_level) || getJobRequirements(job).some((req) => isEducationRequirement(req))
  const jobHasCredentials =
    (Array.isArray(job.required_languages) && job.required_languages.length > 0) ||
    (Array.isArray(job.required_licenses) && job.required_licenses.length > 0)

  const components = [
    { weight: 0.45, applicable: jobHasSkills, active: jobHasSkills && profileSkills.length > 0 },
    {
      weight: 0.2,
      applicable: jobHasExperience,
      active: jobHasExperience && (
        (Array.isArray(profile.work_experiences) && profile.work_experiences.length > 0) ||
        (Array.isArray(profile.experience_categories) && profile.experience_categories.length > 0)
      ),
    },
    { weight: 0.1, applicable: jobHasEducation, active: jobHasEducation && hasText(profile.highest_education) },
    {
      weight: 0.15,
      applicable: jobHasCredentials,
      active: jobHasCredentials && (
        (Array.isArray(profile.languages) && profile.languages.length > 0) ||
        profileLicenses.length > 0
      ),
    },
  ]

  const applicableWeight = components
    .filter((component) => component.applicable)
    .reduce((sum, component) => sum + component.weight, 0)

  if (applicableWeight <= 0) return 0

  const activeWeight = components
    .filter((component) => component.active)
    .reduce((sum, component) => sum + component.weight, 0)

  return Number((activeWeight / applicableWeight).toFixed(4))
}

const getUserSkillNames = (profile: ProfileRecord) => {
  const merged = [
    ...(Array.isArray(profile.predefined_skills) ? profile.predefined_skills : []),
    ...(Array.isArray(profile.skills) ? profile.skills : []),
  ]

  return uniqueStrings(
    merged.map((item) => {
      if (typeof item === 'string') return item
      if (item && typeof item === 'object' && 'name' in item && typeof item.name === 'string') {
        return item.name
      }
      return ''
    }),
  )
}

const getAliasMap = (profile: ProfileRecord) =>
  profile.skill_aliases && typeof profile.skill_aliases === 'object'
    ? (profile.skill_aliases as Record<string, string[]>)
    : {}

const getUserSkillTexts = (profile: ProfileRecord) => {
  const skills = getUserSkillNames(profile)
  const aliasMap = getAliasMap(profile)
  const texts = [...skills]

  for (const skill of skills) {
    const aliases = Array.isArray(aliasMap[skill]) ? aliasMap[skill] : []
    for (const alias of aliases) {
      if (typeof alias === 'string') texts.push(alias)
    }
  }

  return uniqueStrings(texts).slice(0, MAX_USER_SKILL_TEXTS)
}

const getProfileSignalsForSemanticJudge = (profile: ProfileRecord) => {
  const signals: string[] = []

  const workExperiences = Array.isArray(profile.work_experiences) ? profile.work_experiences : []
  for (const item of workExperiences.slice(0, 8)) {
    if (item && typeof item === 'object') {
      const position = String((item as Record<string, unknown>).position ?? (item as Record<string, unknown>).title ?? '').trim()
      const company = String((item as Record<string, unknown>).company ?? '').trim()
      const summary = [position, company].filter(Boolean).join(' at ')
      if (summary) signals.push(summary)
    }
  }

  const educationSignals = [
    String(profile.course_or_field || '').trim(),
    String(profile.highest_education || '').trim(),
  ].filter(Boolean)

  signals.push(...educationSignals)

  return uniqueStrings(signals).slice(0, 24)
}

const getRuleSignal = (
  requirement: string,
  userSkills: string[],
  aliasMap: Record<string, string[]>,
) => {
  const match = matchRequirementToSkillSet(requirement, userSkills, aliasMap)
  return match.matched ? match.credit : 0
}

// Normalize a requirement to its cache key. Keep stable across rows —
// lowercasing + whitespace collapse is enough to dedupe the common cases
// ("React" / "react" / "  React  ") without being so aggressive that we
// merge semantically-distinct phrases.
const normalizeRequirementKey = (req: string) =>
  req.toLowerCase().replace(/\s+/g, ' ').trim()

// Score one skill/requirement string against the user's skills using the
// rule-union-semantic logic. Returns [0, 1]. Pure — no I/O.
const scoreOneSkill = (
  skill: string,
  userSkills: string[],
  aliasMap: Record<string, string[]>,
  userSkillEmbeddings: number[][],
  requirementEmbeddingMap: Map<string, number[]>,
  llmJudgments: Map<string, SemanticSkillJudgment> = new Map(),
): number => {
  const ruleSignal = getRuleSignal(skill, userSkills, aliasMap)
  if (ruleSignal >= 1) return 1
  const llmSignal = llmJudgments.get(normalizeRequirementKey(skill))?.score ?? 0
  if (userSkillEmbeddings.length === 0) return Math.max(ruleSignal, llmSignal)

  const requirementEmbedding = requirementEmbeddingMap.get(normalizeRequirementKey(skill))
  if (!requirementEmbedding) return Math.max(ruleSignal, llmSignal)

  let maxCosine = 0
  for (const skillEmbedding of userSkillEmbeddings) {
    maxCosine = Math.max(maxCosine, cosineSimilarity(requirementEmbedding, skillEmbedding))
  }

  const semanticScore = calibrateSemantic(maxCosine)
  return Math.max(ruleSignal, llmSignal, semanticScore)
}

// Weakest-link aggregation: the score is dragged down by the single
// weakest required skill, but not to zero if everything else is strong.
// One missing required skill in a list of ten should hurt visibly
// without obliterating the match.
const weakestLinkAggregate = (scores: number[]): number => {
  if (scores.length === 0) return 1
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length
  const min = Math.min(...scores)
  return 0.7 * mean + 0.3 * min
}

// Pure scoring function. All embeddings come in precomputed — no network I/O.
// Callers are responsible for ensuring `requirementEmbeddingMap` contains
// entries for every required AND preferred skill on the job, keyed by
// `normalizeRequirementKey`.
//
// Returns:
//   hybridSkillScore — [0, 100], weakest-link over required tier
//   preferredScore   — [0, 1],   mean over preferred tier (bonus-normalized)
const computeHybridSkillScore = (
  job: JobRecord,
  profile: ProfileRecord,
  userSkillEmbeddings: number[][],
  requirementEmbeddingMap: Map<string, number[]>,
  llmJudgments: Map<string, SemanticSkillJudgment> = new Map(),
): {
  hybridSkillScore: number
  preferredScore: number
  skillBreakdown: SkillBreakdownEntry[]
} => {
  const userSkills = getUserSkillNames(profile)
  const aliasMap = getAliasMap(profile)

  const requiredSkills = getRequiredSkillList(job)
  const preferredSkills = getPreferredSkillList(job)
  const breakdown: SkillBreakdownEntry[] = []

  // Education & language that are NOT gated as hard filters still count
  // as required-tier signals here (pass/fail into the weakest-link pool).
  // When the hard-filter flag IS set, such jobs have already been
  // rejected upstream for non-matching profiles, so this path only runs
  // for profiles that pass them — the 1.0 is correct.
  const eduLangScores: number[] = []
  for (const req of getJobRequirements(job)) {
    if (isEducationRequirement(req)) {
      const score = educationSatisfied(req, profile.highest_education) ? 1 : 0
      eduLangScores.push(score)
      breakdown.push({
        label: req,
        tier: 'required',
        kind: 'education',
        score,
        status: statusFromScore(score),
      })
    } else if (isLanguageRequirement(req)) {
      const score = languageSatisfied(req, profile.languages) ? 1 : 0
      eduLangScores.push(score)
      breakdown.push({
        label: req,
        tier: 'required',
        kind: 'language',
        score,
        status: statusFromScore(score),
      })
    }
  }

  const requiredScores = requiredSkills.map((skill) => {
    const llmJudgment = llmJudgments.get(normalizeRequirementKey(skill))
    const score = scoreOneSkill(skill, userSkills, aliasMap, userSkillEmbeddings, requirementEmbeddingMap, llmJudgments)
    breakdown.push({
      label: skill,
      tier: 'required',
      kind: 'skill',
      score,
      status: statusFromScore(score),
      reason: llmJudgment?.reason || undefined,
      matchedSkill: llmJudgment?.bestSkill || llmJudgment?.supportingSkills?.[0] || undefined,
      supportingSkills: llmJudgment?.supportingSkills?.length ? llmJudgment.supportingSkills : undefined,
      matchType: llmJudgment?.matchType || undefined,
    })
    return score
  })

  const preferredScores = preferredSkills.map((skill) => {
    const llmJudgment = llmJudgments.get(normalizeRequirementKey(skill))
    const score = scoreOneSkill(skill, userSkills, aliasMap, userSkillEmbeddings, requirementEmbeddingMap, llmJudgments)
    breakdown.push({
      label: skill,
      tier: 'preferred',
      kind: 'skill',
      score,
      status: statusFromScore(score),
      reason: llmJudgment?.reason || undefined,
      matchedSkill: llmJudgment?.bestSkill || llmJudgment?.supportingSkills?.[0] || undefined,
      supportingSkills: llmJudgment?.supportingSkills?.length ? llmJudgment.supportingSkills : undefined,
      matchType: llmJudgment?.matchType || undefined,
    })
    return score
  })

  const preferredScore = preferredScores.length > 0
    ? preferredScores.reduce((a, b) => a + b, 0) / preferredScores.length
    : 0

  // Nothing at all to score → use the legacy classifier path so jobs
  // with only descriptive text still get a sensible baseline.
  if (requiredScores.length === 0 && eduLangScores.length === 0) {
    const raw = getJobRequirements(job)
    if (raw.length === 0) {
      return { hybridSkillScore: 100, preferredScore, skillBreakdown: breakdown }
    }
    const { matchingSkills } = classifyRequirements(raw, userSkills, aliasMap, profile)
    const hybridSkillScore = matchingSkills.length === raw.length ? 100 : 0
    return { hybridSkillScore, preferredScore, skillBreakdown: breakdown }
  }

  const requiredPool = [...requiredScores, ...eduLangScores]
  const hybridSkillScore = Math.round(weakestLinkAggregate(requiredPool) * 100)

  return { hybridSkillScore, preferredScore, skillBreakdown: breakdown }
}

const ensureJobEmbeddings = async (supabase: ReturnType<typeof createClient>, jobs: JobRecord[]) => {
  if (jobs.length === 0) return new Map<string, { embedding: number[]; contentHash: string }>()

  const descriptors = await Promise.all(
    jobs.map(async (job) => {
      const sourceText = buildJobText(job)
      const contentHash = await sha256(sourceText)
      return { job, sourceText, contentHash }
    }),
  )

  const jobIds = descriptors.map((item) => String(item.job.id))
  const { data: existingRows, error: existingError } = await supabase
    .from('job_embeddings')
    .select('job_id, content_hash, embedding')
    .in('job_id', jobIds)

  if (existingError) throw existingError

  const existingMap = new Map<string, Record<string, unknown>>(
    (existingRows || []).map((row: Record<string, unknown>) => [String(row.job_id), row]),
  )

  const result = new Map<string, { embedding: number[]; contentHash: string }>()
  const missing = descriptors.filter((descriptor) => {
    const row = existingMap.get(String(descriptor.job.id))
    if (row && row.content_hash === descriptor.contentHash && Array.isArray(row.embedding)) {
      result.set(String(descriptor.job.id), {
        embedding: row.embedding as number[],
        contentHash: descriptor.contentHash,
      })
      return false
    }
    return true
  })

  for (const group of chunk(missing, 96)) {
    const texts = group.map((item) => item.sourceText)
    const { embeddings, model, dimension } = await embedTexts(texts, 'search_document')
    const rows = group.map((item, index) => ({
      job_id: item.job.id,
      content_hash: item.contentHash,
      embedding: embeddings[index],
      embedding_model: model,
      embedding_dim: dimension,
      source_text: item.sourceText,
      updated_at: new Date().toISOString(),
    }))

    const { error: upsertError } = await supabase
      .from('job_embeddings')
      .upsert(rows, { onConflict: 'job_id' })

    if (upsertError) throw upsertError

    group.forEach((item, index) => {
      result.set(String(item.job.id), {
        embedding: embeddings[index] as number[],
        contentHash: item.contentHash,
      })
    })
  }

  return result
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return handleCorsPreflightRequest()
    }

    const body = (await req.json()) as MatchJobsRequest
    const userId = body.userId

    if (!userId) {
      return jsonResponse({ error: 'userId is required' }, { status: 400 })
    }

    const limit = Math.max(1, Math.min(Number(body.limit ?? 20), 50))
    const offset = Math.max(0, Number(body.offset ?? 0))
    const filters = body.filters || {}

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: profile, error: profileError } = await supabase
      .from('jobseeker_profiles')
      .select('id, predefined_skills, skills, skill_aliases, work_experiences, highest_education, date_of_birth, course_or_field, preferred_occupations, preferred_job_type, preferred_local_locations, preferred_overseas_locations, experience_categories, languages, certifications, professional_licenses, vocational_training, portfolio_url, employment_status, willing_to_relocate, expected_salary_min, expected_salary_max')
      .eq('id', userId)
      .maybeSingle()

    if (profileError) throw profileError
    if (!profile) {
      return jsonResponse({ error: 'Profile not found' }, { status: 404 })
    }

    // jobseeker_profiles.id === auth user id; ensureProfileEmbedding needs both id and user_id
    const profileWithUserId = { ...profile, user_id: userId }
    const profileEmbedding = await ensureProfileEmbedding(supabase as never, profileWithUserId as ProfileRecord)

    let jobs: JobRecord[] = []
    const jobIdFilter = typeof filters.jobId === 'string' ? filters.jobId : ''
    if (jobIdFilter) {
      const { data: singleJob, error: singleJobError } = await supabase
        .from('job_postings')
        .select('id, title, category, description, requirements, preferred_skills, experience_level, education_level, type, location, salary_min, salary_max, status, deadline, created_at, filter_mode, required_skills, required_licenses, required_languages, education_is_required, languages_are_required, licenses_are_required')
        .eq('id', jobIdFilter)
        .maybeSingle()

      if (singleJobError) throw singleJobError
      jobs = singleJob ? [singleJob as JobRecord] : []
    } else {
      const today = new Date().toISOString().split('T')[0]
      let query = supabase
        .from('job_postings')
        .select('id, title, category, description, requirements, preferred_skills, experience_level, education_level, type, location, salary_min, salary_max, status, deadline, created_at, filter_mode, required_skills, required_licenses, required_languages, education_is_required, languages_are_required, licenses_are_required')
        .eq('status', 'open')
        .or(`deadline.is.null,deadline.gte.${today}`)
        .order('created_at', { ascending: false })
        .range(0, MAX_CANDIDATES - 1)

      if (typeof filters.category === 'string' && filters.category) query = query.eq('category', filters.category)
      if (typeof filters.location === 'string' && filters.location) query = query.eq('location', filters.location)
      if (typeof filters.type === 'string' && filters.type) query = query.eq('type', filters.type)
      if (filters.salaryMin !== undefined && filters.salaryMin !== null && filters.salaryMin !== '') {
        query = query.gte('salary_max', Number(filters.salaryMin))
      }
      if (filters.salaryMax !== undefined && filters.salaryMax !== null && filters.salaryMax !== '') {
        query = query.lte('salary_min', Number(filters.salaryMax))
      }

      const { data: jobsData, error: jobsError } = await query
      if (jobsError) throw jobsError
      jobs = (jobsData || []) as JobRecord[]
    }

    if (jobs.length === 0) {
      return jsonResponse({
        results: [],
        meta: {
          source: 'hybrid_matcher',
          candidateCount: 0,
          semanticShortlistCount: 0,
          reranked: body.rerank === true,
          filters,
          hardFilterRejections: { education_not_met: 0, language_not_met: 0, license_not_met: 0 },
        },
      })
    }

    // Stage 1: hard filters (pass/fail) — runs before any Cohere call.
    // A single-job request (jobIdFilter) bypasses the gate so the caller
    // can still see why that specific job is a non-fit via the score.
    const hardFilterRejections = { education_not_met: 0, language_not_met: 0, license_not_met: 0 }
    const prefilteredCount = jobs.length
    if (!jobIdFilter) {
      jobs = jobs.filter((job) => {
        const reason = rejectOnHardFilters(job, profileWithUserId as ProfileRecord)
        if (reason) {
          hardFilterRejections[reason] += 1
          return false
        }
        return true
      })
    }

    if (jobs.length === 0) {
      return jsonResponse({
        results: [],
        meta: {
          source: 'hybrid_matcher',
          candidateCount: 0,
          prefilterCandidateCount: prefilteredCount,
          semanticShortlistCount: 0,
          reranked: body.rerank === true,
          filters,
          hardFilterRejections,
        },
      })
    }

    const jobEmbeddings = await ensureJobEmbeddings(supabase, jobs)

    const semanticRanked = jobs
      .map((job) => {
        const embeddingData = jobEmbeddings.get(String(job.id))
        const cosine = embeddingData?.embedding
          ? cosineSimilarity(profileEmbedding.embedding as number[], embeddingData.embedding)
          : 0

        return {
          job,
          cosine,
          semanticScore: Math.round(normalizeCosineScore(cosine)),
          jobHash: embeddingData?.contentHash || '',
        }
      })
      .sort((a, b) => b.semanticScore - a.semanticScore)

    const shortlist = semanticRanked.slice(0, Math.min(SEMANTIC_SHORTLIST_SIZE, semanticRanked.length))

    const shortlistedIds = shortlist.map(item => String(item.job.id))
    const { data: cachedRows, error: cacheError } = await supabase
      .from('match_scores_cache')
      .select('job_id, profile_hash, job_hash, semantic_score, hybrid_skill_score, preferred_score, deterministic_score, experience_score, education_score, final_score, match_level, explanation, skill_breakdown')
      .eq('user_id', userId)
      .in('job_id', shortlistedIds)

    if (cacheError) throw cacheError

    const cacheMap = new Map<string, Record<string, unknown>>(
      (cachedRows || []).map((row: Record<string, unknown>) => [String(row.job_id), row]),
    )

    // Personalization: fetch once per request. Affinity rarely changes
    // between calls (TTL-gated refresh inside the helper), so cost is
    // usually a single select. Applied at response time — never cached
    // into match_scores_cache, so the canonical score stays stable.
    const userAffinity = await getUserAffinity(supabase as never, userId)

    // Identify which shortlisted jobs need a fresh hybrid-skill score.
    // Everything else is served from match_scores_cache with zero Cohere cost.
    const versionedProfileHash = `${profileEmbedding.contentHash}:${MATCHER_VERSION}`
    const jobsNeedingHybridScore = shortlist.filter((item) => {
      const cached = cacheMap.get(String(item.job.id))
      const versionedJobHash = `${item.jobHash}:${MATCHER_VERSION}`
      return !(
        cached &&
        cached.profile_hash === versionedProfileHash &&
        cached.job_hash === versionedJobHash
      )
    })

    // Embed user skills ONCE per request, only if at least one shortlisted
    // job will be scored from scratch. Full cache hit => zero Cohere calls.
    let userSkillEmbeddings: number[][] = []
    if (jobsNeedingHybridScore.length > 0) {
      const userSkillTexts = getUserSkillTexts(profileWithUserId as ProfileRecord)
      if (userSkillTexts.length > 0) {
        const { embeddings } = await embedTexts(userSkillTexts, 'search_document')
        userSkillEmbeddings = embeddings as number[][]
      }
    }

    // Collect every distinct requirement key across the non-cached jobs
    // (skipping education/language entries — those are handled without
    // embeddings). requirement_embeddings table serves cross-request cache;
    // only genuine first-sightings go to Cohere.
    const requirementEmbeddingMap = new Map<string, number[]>()
    let requirementCacheStats = { requested: 0, hits: 0, misses: 0 }
    if (jobsNeedingHybridScore.length > 0) {
      const uniqueKeys = new Set<string>()
      for (const item of jobsNeedingHybridScore) {
        for (const req of getJobRequirements(item.job)) {
          if (isEducationRequirement(req) || isLanguageRequirement(req)) continue
          const key = normalizeRequirementKey(req)
          if (key) uniqueKeys.add(key)
        }
      }

      // Preferred skills go through the same cache — they're scored
      // with identical rule∪semantic machinery, and their strings
      // frequently overlap with required requirements ("react",
      // "docker"), so sharing the cache maximizes hit rate.
      for (const item of jobsNeedingHybridScore) {
        for (const skill of getPreferredSkillList(item.job)) {
          const key = normalizeRequirementKey(skill)
          if (key) uniqueKeys.add(key)
        }
        for (const skill of getRequiredSkillList(item.job)) {
          const key = normalizeRequirementKey(skill)
          if (key) uniqueKeys.add(key)
        }
      }

      if (uniqueKeys.size > 0) {
        const { map, stats } = await getOrCreateRequirementEmbeddings(
          supabase as never,
          Array.from(uniqueKeys),
          'search_query',
        )
        for (const [key, embedding] of map) requirementEmbeddingMap.set(key, embedding)
        requirementCacheStats = stats
      }
    }

    // Does a cached breakdown already contain LLM enrichment? We gate on
    // the presence of `reason` on any skill entry — the LLM judge always
    // produces a reason string when it runs, so the absence of one across
    // the whole breakdown reliably signals a listings-path write.
    const breakdownHasLlmEnrichment = (entries: unknown): boolean =>
      Array.isArray(entries) &&
      (entries as SkillBreakdownEntry[]).some(
        (entry) => entry?.kind === 'skill' && typeof entry?.reason === 'string' && entry.reason.length > 0,
      )

    const results = []

    for (const item of shortlist) {
      const det = calculateDeterministicScore(item.job, profileWithUserId as ProfileRecord)
      const cached = cacheMap.get(String(item.job.id))
      const versionedJobHash = `${item.jobHash}:${MATCHER_VERSION}`
      const cacheValid =
        cached &&
        cached.profile_hash === versionedProfileHash &&
        cached.job_hash === versionedJobHash

      // On the single-job (JobDetail) path we want LLM-enriched breakdowns.
      // Run the judge when either (a) we're computing fresh, or (b) the
      // cached breakdown came from a listings write and has no reasons.
      // This backfills enrichment once per (user, job) and reuses it on
      // subsequent reads (including listings calls, which share the cache).
      let llmJudgments = new Map<string, SemanticSkillJudgment>()
      if (jobIdFilter) {
        const cachedNeedsEnrichment = cacheValid && !breakdownHasLlmEnrichment(cached?.skill_breakdown)
        if (!cacheValid || cachedNeedsEnrichment) {
          try {
            llmJudgments = await judgeSkillSemanticMatches({
              requirements: [...getRequiredSkillList(item.job), ...getPreferredSkillList(item.job)],
              userSkills: getUserSkillTexts(profileWithUserId as ProfileRecord),
              profileSignals: getProfileSignalsForSemanticJudge(profileWithUserId as ProfileRecord),
            })
          } catch (error) {
            console.warn('LLM semantic skill matching failed, using rule+embedding fallback:', (error as Error).message)
          }
        }
      }

      const enrichBreakdown = (
        entries: SkillBreakdownEntry[],
        judgments: Map<string, SemanticSkillJudgment>,
      ): SkillBreakdownEntry[] =>
        entries.map((entry) => {
          if (entry.kind !== 'skill') return entry
          const judgment = judgments.get(normalizeRequirementKey(entry.label))
          if (!judgment) return entry
          return {
            ...entry,
            reason: entry.reason || judgment.reason || undefined,
            matchedSkill: entry.matchedSkill || judgment.bestSkill || judgment.supportingSkills?.[0] || undefined,
            supportingSkills: entry.supportingSkills && entry.supportingSkills.length > 0
              ? entry.supportingSkills
              : (judgment.supportingSkills?.length ? judgment.supportingSkills : undefined),
            matchType: entry.matchType || judgment.matchType || undefined,
          }
        })

      let hybridSkillScore: number
      let preferredScore: number
      let skillBreakdown: SkillBreakdownEntry[]
      let breakdownEnrichedFromCache = false
      if (cacheValid) {
        hybridSkillScore = Number(cached.hybrid_skill_score ?? 0)
        preferredScore = Number(cached.preferred_score ?? 0)
        skillBreakdown = Array.isArray(cached.skill_breakdown)
          ? (cached.skill_breakdown as SkillBreakdownEntry[])
          : []
        if (llmJudgments.size > 0) {
          skillBreakdown = enrichBreakdown(skillBreakdown, llmJudgments)
          breakdownEnrichedFromCache = true
        }
      } else {
        const scored = computeHybridSkillScore(
          item.job,
          profileWithUserId as ProfileRecord,
          userSkillEmbeddings,
          requirementEmbeddingMap,
          llmJudgments,
        )
        hybridSkillScore = scored.hybridSkillScore
        preferredScore = scored.preferredScore
        skillBreakdown = scored.skillBreakdown
      }

      const semanticScore = cacheValid
        ? Number(cached.semantic_score ?? item.semanticScore)
        : item.semanticScore

      const experienceScore = det.experienceScore
      const educationScore = det.educationScore
      const deterministicScore = det.matchScore
      const confidenceScore = Math.min(
        1,
        Math.max(det.confidenceScore ?? 0, computeMatchConfidence(item.job, profileWithUserId as ProfileRecord)),
      )
      const isLowDensityJob = !hasStructuredJobRequirements(item.job)
      const preferredBonus = Math.round(preferredScore * PREFERRED_BONUS_CAP)
      // Canonical / unpersonalized score. This is what lands in the
      // cache and what employer-facing / audit views should consume.
      const isTechnical = isTechnicalJob(item.job)

      const weights = isTechnical
        ? { deterministic: 0.25, hybrid: 0.60, semantic: 0.15 }
        : { deterministic: 0.50, hybrid: 0.30, semantic: 0.20 }

      let blendedScore = Math.min(
        100,
        Math.round(
          deterministicScore * weights.deterministic +
          hybridSkillScore   * weights.hybrid +
          semanticScore      * weights.semantic,
        ) + preferredBonus,
      )

      // Technical kill-switch: prevent "False Fair" matches where a candidate
      // has zero relevant skills but high education/semantic scores.
      if (isTechnical) {
        if (hybridSkillScore === 0)       blendedScore = Math.min(blendedScore, 25)
        else if (hybridSkillScore < 30)   blendedScore = Math.min(blendedScore, 40)
      }

      const baseFinalScore = isLowDensityJob
        ? Math.min(blendedScore, 55)
        : confidenceScore < 0.35
          ? Math.min(blendedScore, 55)
          : confidenceScore < 0.7
            ? Math.round(blendedScore * 0.92)
            : blendedScore

      const baseMatchLevel = cacheValid && typeof cached.match_level === 'string'
        ? cached.match_level
        : baseFinalScore >= 80
          ? 'Excellent'
          : baseFinalScore >= 60
            ? 'Good'
            : baseFinalScore >= 40
              ? 'Fair'
              : 'Low'

      if (!cacheValid || breakdownEnrichedFromCache) {
        const { error: upsertCacheError } = await supabase
          .from('match_scores_cache')
          .upsert(
            {
              user_id: userId,
              job_id: item.job.id,
              profile_hash: versionedProfileHash,
              job_hash: versionedJobHash,
              semantic_score: semanticScore,
              hybrid_skill_score: hybridSkillScore,
              preferred_score: preferredScore,
              deterministic_score: deterministicScore,
              experience_score: experienceScore,
              education_score: det.baselineScore ?? educationScore,
              final_score: baseFinalScore,
              match_level: baseMatchLevel,
              explanation: cached?.explanation || null,
              skill_breakdown: skillBreakdown,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,job_id' },
          )

        if (upsertCacheError) throw upsertCacheError
      }

      // Personalization layered ON TOP of the cached base. Different
      // users see different finalScore for the same job — intended.
      const personalizationAdjust = computePersonalizationAdjust(item.job, userAffinity)
      const finalScore = Math.min(100, Math.max(0, baseFinalScore + personalizationAdjust))

      // matchLevel reflects what the user actually sees, not the base.
      const matchLevel =
        finalScore >= 80 ? 'Excellent'
          : finalScore >= 60 ? 'Good'
            : finalScore >= 40 ? 'Fair'
              : 'Low'

      const { evidence, gaps } = buildEvidenceLedger(
        item.job,
        profileWithUserId as ProfileRecord,
        skillBreakdown,
      )

      results.push({
        jobId: item.job.id,
        semanticScore,
        hybridSkillScore,
        deterministicScore,
        experienceScore,
        educationScore: det.baselineScore ?? educationScore,
        finalScore,
        baseFinalScore,
        personalizationAdjust,
        matchLevel,
        matchingSkills: det.matchingSkills,
        missingSkills: det.missingSkills,
        inferredSoftSkills: det.inferredSoftSkills,
        technicalCompetencyScore: det.technicalCompetencyScore,
        inferredSoftSkillScore: det.inferredSoftSkillScore,
        baselineScore: det.baselineScore,
        candidateSignals: det.candidateSignals,
        overqualificationSignal: det.overqualificationSignal,
        rebrandingSuggestions: det.rebrandingSuggestions,
        preferredSkillBonus: preferredBonus,
        preferredScore,
        confidenceScore,
        lowEvidence: confidenceScore < 0.35,
        lowDensityJob: isLowDensityJob,
        skillBreakdown,
        evidence,
        gaps,
        explanation: cacheValid ? cached?.explanation || null : null,
      })
    }

    // Sort by the personalized score — this is how personalization
    // actually reorders the list for the user.
    results.sort((a, b) => b.finalScore - a.finalScore)
    const pagedResults = results.slice(offset, offset + limit)

    return jsonResponse({
      results: pagedResults,
      meta: {
        source: 'hybrid_matcher',
        candidateCount: jobs.length,
        prefilterCandidateCount: prefilteredCount,
        semanticShortlistCount: shortlist.length,
        reranked: body.rerank === true,
        filters,
        hardFilterRejections,
        requirementCache: requirementCacheStats,
        personalization: {
          totalSignals: userAffinity.totalSignals,
          topCategories: Array.from(userAffinity.categoryWeights.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([category, weight]) => ({ category, weight })),
        },
      },
    })
  } catch (err) {
    console.error('match-jobs error:', err)
    return jsonResponse({ error: err.message }, { status: 500 })
  }
})
