import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { embedTexts } from '../_shared/cohere.ts'
import { handleCorsPreflightRequest, jsonResponse } from '../_shared/cors.ts'
import {
  calculateDeterministicScore,
  classifyRequirements,
  educationSatisfied,
  hierarchyCoversRequirement,
  isEducationRequirement,
  isLanguageRequirement,
  languageSatisfied,
  skillMatches,
  synonymMatches,
} from '../_shared/deterministicScore.ts'
import { ensureProfileEmbedding } from '../_shared/embeddingStore.ts'
import { sha256 } from '../_shared/hash.ts'
import { buildJobText } from '../_shared/matchingText.ts'
import { cosineSimilarity, normalizeCosineScore } from '../_shared/similarity.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const MAX_CANDIDATES = 500
const SEMANTIC_SHORTLIST_SIZE = 50
const MAX_USER_SKILL_TEXTS = 96
const MATCHER_VERSION = 'inferential-v1'

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

const getJobRequirements = (job: JobRecord) => {
  const raw = Array.isArray(job.requirements) ? job.requirements : []

  return raw
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean)
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

const getRuleSignal = (
  requirement: string,
  userSkills: string[],
  aliasMap: Record<string, string[]>,
) => {
  for (const skill of userSkills) {
    if (skillMatches(requirement, skill)) return 1
  }

  for (const skill of userSkills) {
    if (synonymMatches(requirement, skill)) return 0.7
  }

  for (const skill of userSkills) {
    const aliases = Array.isArray(aliasMap[skill]) ? aliasMap[skill] : []
    for (const alias of aliases) {
      if (skillMatches(requirement, alias) || synonymMatches(requirement, alias)) {
        return 0.7
      }
    }
  }

  if (hierarchyCoversRequirement(requirement, userSkills, aliasMap)) return 0.5
  return 0
}

const normalizeRequirementCosine = (cosine: number) => {
  const min = 0.55
  const max = 0.85
  const normalized = (cosine - min) / (max - min)
  return Math.max(0, Math.min(1, normalized))
}

const computeHybridSkillScore = async (job: JobRecord, profile: ProfileRecord) => {
  const requirements = getJobRequirements(job)
  if (requirements.length === 0) return 100

  const userSkills = getUserSkillNames(profile)
  const aliasMap = getAliasMap(profile)
  const userSkillTexts = getUserSkillTexts(profile)

  const filteredSkillRequirements = requirements.filter(
    (req) => !isEducationRequirement(req) && !isLanguageRequirement(req),
  )

  if (filteredSkillRequirements.length === 0) {
    const { matchingSkills } = classifyRequirements(requirements, userSkills, aliasMap, profile)
    return matchingSkills.length === requirements.length ? 100 : 0
  }

  let userSkillEmbeddings: number[][] = []
  if (userSkillTexts.length > 0) {
    const { embeddings } = await embedTexts(userSkillTexts, 'search_document')
    userSkillEmbeddings = embeddings as number[][]
  }

  const scores: number[] = []
  const requirementTextsToEmbed = filteredSkillRequirements.slice(0, 96)
  const requirementEmbeddingMap = new Map<string, number[]>()

  if (requirementTextsToEmbed.length > 0) {
    const { embeddings } = await embedTexts(requirementTextsToEmbed, 'search_document')
    requirementTextsToEmbed.forEach((req, index) => {
      requirementEmbeddingMap.set(req, embeddings[index] as number[])
    })
  }

  for (const requirement of requirements) {
    if (isEducationRequirement(requirement)) {
      scores.push(educationSatisfied(requirement, profile.highest_education) ? 1 : 0)
      continue
    }

    if (isLanguageRequirement(requirement)) {
      scores.push(languageSatisfied(requirement, profile.languages) ? 1 : 0)
      continue
    }

    const ruleSignal = getRuleSignal(requirement, userSkills, aliasMap)

    if (userSkillEmbeddings.length === 0) {
      scores.push(0.25 * ruleSignal)
      continue
    }

    const requirementEmbedding = requirementEmbeddingMap.get(requirement)
    if (!requirementEmbedding) {
      scores.push(0.25 * ruleSignal)
      continue
    }

    let maxCosine = 0
    for (const skillEmbedding of userSkillEmbeddings) {
      maxCosine = Math.max(maxCosine, cosineSimilarity(requirementEmbedding, skillEmbedding))
    }

    const semanticScore = normalizeRequirementCosine(maxCosine)
    const combined = Math.min(1, 0.75 * semanticScore + 0.25 * ruleSignal)
    scores.push(combined)
  }

  if (scores.length === 0) return 0
  return Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 100)
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
        .select('id, user_id, predefined_skills, skills, skill_aliases, work_experiences, highest_education, date_of_birth, course_or_field, preferred_occupations, preferred_job_type, preferred_local_locations, preferred_overseas_locations, experience_categories, languages, certifications, professional_licenses, vocational_training, portfolio_url, employment_status, willing_to_relocate, expected_salary_min, expected_salary_max')
      .eq('id', userId)
      .maybeSingle()

    if (profileError) throw profileError
    if (!profile) {
      return jsonResponse({ error: 'Profile not found' }, { status: 404 })
    }

    const profileEmbedding = await ensureProfileEmbedding(supabase as never, profile as ProfileRecord)

    let jobs: JobRecord[] = []
    const jobIdFilter = typeof filters.jobId === 'string' ? filters.jobId : ''
    if (jobIdFilter) {
        const { data: singleJob, error: singleJobError } = await supabase
          .from('job_postings')
          .select('id, title, category, description, requirements, experience_level, education_level, type, location, salary_min, salary_max, status, deadline, created_at, filter_mode')
        .eq('id', jobIdFilter)
        .maybeSingle()

      if (singleJobError) throw singleJobError
      jobs = singleJob ? [singleJob as JobRecord] : []
    } else {
      const today = new Date().toISOString().split('T')[0]
        let query = supabase
          .from('job_postings')
          .select('id, title, category, description, requirements, experience_level, education_level, type, location, salary_min, salary_max, status, deadline, created_at, filter_mode')
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
      .select('job_id, profile_hash, job_hash, semantic_score, hybrid_skill_score, deterministic_score, experience_score, education_score, final_score, match_level, explanation')
      .eq('user_id', userId)
      .in('job_id', shortlistedIds)

    if (cacheError) throw cacheError

    const cacheMap = new Map<string, Record<string, unknown>>(
      (cachedRows || []).map((row: Record<string, unknown>) => [String(row.job_id), row]),
    )

    const results = []

    for (const item of shortlist) {
      const det = calculateDeterministicScore(item.job, profile as ProfileRecord)
      const cached = cacheMap.get(String(item.job.id))
      const versionedProfileHash = `${profileEmbedding.contentHash}:${MATCHER_VERSION}`
      const versionedJobHash = `${item.jobHash}:${MATCHER_VERSION}`
      const cacheValid =
        cached &&
        cached.profile_hash === versionedProfileHash &&
        cached.job_hash === versionedJobHash

      const hybridSkillScore = cacheValid
        ? Number(cached.hybrid_skill_score ?? 0)
        : await computeHybridSkillScore(item.job, profile as ProfileRecord)

      const semanticScore = cacheValid
        ? Number(cached.semantic_score ?? item.semanticScore)
        : item.semanticScore

      const experienceScore = det.experienceScore
      const educationScore = det.educationScore
      const deterministicScore = det.matchScore
      const finalScore = deterministicScore

      const matchLevel = cacheValid && typeof cached.match_level === 'string'
        ? cached.match_level
        : finalScore >= 80
          ? 'Excellent'
          : finalScore >= 60
            ? 'Good'
            : finalScore >= 40
              ? 'Fair'
              : 'Low'

      if (!cacheValid) {
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
              deterministic_score: deterministicScore,
              experience_score: experienceScore,
              education_score: det.baselineScore ?? educationScore,
              final_score: finalScore,
              match_level: matchLevel,
              explanation: cached?.explanation || null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,job_id' },
          )

        if (upsertCacheError) throw upsertCacheError
      }

      results.push({
        jobId: item.job.id,
        semanticScore,
        hybridSkillScore,
        deterministicScore,
        experienceScore,
        educationScore: det.baselineScore ?? educationScore,
        finalScore,
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
        explanation: cacheValid ? cached?.explanation || null : null,
      })
    }

    results.sort((a, b) => b.finalScore - a.finalScore)
    const pagedResults = results.slice(offset, offset + limit)

    return jsonResponse({
      results: pagedResults,
      meta: {
        source: 'hybrid_matcher',
        candidateCount: jobs.length,
        semanticShortlistCount: shortlist.length,
        reranked: body.rerank === true,
        filters,
      },
    })
  } catch (err) {
    console.error('match-jobs error:', err)
    return jsonResponse({ error: err.message }, { status: 500 })
  }
})
