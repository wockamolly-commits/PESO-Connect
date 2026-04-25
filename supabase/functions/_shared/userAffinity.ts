// Personalization v1: category-level affinity boost.
//
// Usage:
//   const affinity = await getUserAffinity(supabase, userId)
//   for each scored job:
//     const adjust = computePersonalizationAdjust(job, affinity)
//     displayScore = clamp(cachedFinalScore + adjust, 0, 100)
//
// Design notes:
//   * One read per request, not per job. The returned object is a
//     pure in-memory Map — zero I/O to apply to each candidate.
//   * TTL-gated refresh. If the user's most recent refresh is older
//     than AFFINITY_TTL_SECONDS, call the RPC to recompute. Keeps
//     the edge function from aggregating applications/saved_jobs on
//     every request while still picking up brand-new signals within
//     the TTL.
//   * Cold-start guard. Users with fewer than MIN_SIGNALS_FOR_BOOST
//     underlying events get ZERO boost — a single click shouldn't
//     pin someone to one category.
//   * Positive only. No negative signal (shown-but-not-clicked) in
//     v1 — view intent is too noisy without dwell/scroll telemetry.

const AFFINITY_TTL_SECONDS = 15 * 60
const MIN_SIGNALS_FOR_BOOST = 3
const MAX_BOOST_POINTS = 5

type AffinityRow = {
  dimension: string
  key: string
  weight: number
  signal_count: number
  updated_at?: string
}

export type UserAffinity = {
  categoryWeights: Map<string, number>
  totalSignals: number
  refreshedAt: number | null
}

type SupabaseLike = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, value: string) => Promise<{ data: unknown; error: unknown }>
    }
  }
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ error: unknown }>
}

const normalizeCategory = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : ''

const parseRows = (rows: AffinityRow[]): UserAffinity => {
  const categoryWeights = new Map<string, number>()
  let totalSignals = 0
  let refreshedAt: number | null = null

  for (const row of rows) {
    if (row.dimension === 'category') {
      const key = normalizeCategory(row.key)
      if (!key) continue
      categoryWeights.set(key, Number(row.weight) || 0)
      totalSignals += Number(row.signal_count) || 0
    } else if (row.dimension === 'meta' && row.key === '_refreshed_at' && row.updated_at) {
      refreshedAt = new Date(row.updated_at).getTime()
    }
  }

  return { categoryWeights, totalSignals, refreshedAt }
}

export const getUserAffinity = async (
  supabase: SupabaseLike,
  userId: string,
): Promise<UserAffinity> => {
  const read = async () => {
    const { data, error } = await supabase
      .from('user_affinity')
      .select('dimension, key, weight, signal_count, updated_at')
      .eq('user_id', userId)
    if (error) throw error
    return (data || []) as AffinityRow[]
  }

  let rows = await read()
  let affinity = parseRows(rows)

  const stale =
    affinity.refreshedAt === null ||
    Date.now() - affinity.refreshedAt > AFFINITY_TTL_SECONDS * 1000

  if (stale) {
    const { error } = await supabase.rpc('refresh_user_affinity', { p_user_id: userId })
    if (error) throw error
    rows = await read()
    affinity = parseRows(rows)
  }

  return affinity
}

// Returns integer adjustment in [0, MAX_BOOST_POINTS].
// Applied additively to finalScore, then clamped at 100.
export const computePersonalizationAdjust = (
  job: Record<string, unknown>,
  affinity: UserAffinity,
): number => {
  if (affinity.totalSignals < MIN_SIGNALS_FOR_BOOST) return 0
  const category = normalizeCategory(job.category)
  if (!category) return 0
  const weight = affinity.categoryWeights.get(category) ?? 0
  if (weight <= 0) return 0
  return Math.round(MAX_BOOST_POINTS * weight)
}

export const PERSONALIZATION_CONFIG = {
  ttlSeconds: AFFINITY_TTL_SECONDS,
  minSignals: MIN_SIGNALS_FOR_BOOST,
  maxBoostPoints: MAX_BOOST_POINTS,
}
