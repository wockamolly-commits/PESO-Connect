import { embedTexts, type CohereInputType } from './cohere.ts'
import { sha256 } from './hash.ts'

const COHERE_BATCH_LIMIT = 96

// Content hash must include model + input_type so we never serve a
// search_document vector where search_query was requested (or vice
// versa), and so a future model change invalidates the cache cleanly.
const hashKey = async (
  normalizedText: string,
  inputType: CohereInputType,
  model: string,
): Promise<string> =>
  sha256(`${normalizedText}::${inputType}::${model}`)

const chunk = <T,>(items: T[], size: number): T[][] => {
  const result: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size))
  }
  return result
}

type SupabaseLike = {
  from: (table: string) => {
    select: (cols: string) => {
      in: (col: string, values: string[]) => Promise<{ data: unknown; error: unknown }>
    }
    upsert: (
      rows: Record<string, unknown>[],
      opts: { onConflict: string },
    ) => Promise<{ error: unknown }>
  }
}

/**
 * Given a list of normalized requirement strings, return a Map keyed by the
 * normalized string -> embedding vector. Looks up cached rows first, embeds
 * only the misses via Cohere (chunked at 96), and upserts the new rows.
 *
 * Assumes caller has already normalized inputs (lowercased, whitespace
 * collapsed). De-dupes internally so a caller passing duplicates is fine.
 */
export const getOrCreateRequirementEmbeddings = async (
  supabase: SupabaseLike,
  normalizedTexts: string[],
  inputType: CohereInputType = 'search_query',
): Promise<{
  map: Map<string, number[]>
  stats: { requested: number; hits: number; misses: number }
}> => {
  const result = new Map<string, number[]>()
  const unique = Array.from(new Set(normalizedTexts.filter((t) => t && t.length > 0)))

  if (unique.length === 0) {
    return { map: result, stats: { requested: 0, hits: 0, misses: 0 } }
  }

  // Model is fixed for now but we pull it from embedTexts' return below
  // on the miss path. For lookup we need to know the model up front —
  // keep this in sync with _shared/cohere.ts.
  const LOOKUP_MODEL = 'embed-v4.0'

  const hashes = await Promise.all(
    unique.map((text) => hashKey(text, inputType, LOOKUP_MODEL)),
  )
  const textByHash = new Map<string, string>()
  unique.forEach((text, i) => textByHash.set(hashes[i], text))

  const { data: cachedRows, error: fetchError } = await supabase
    .from('requirement_embeddings')
    .select('content_hash, embedding')
    .in('content_hash', hashes)

  if (fetchError) throw fetchError

  const cachedHashes = new Set<string>()
  for (const row of (cachedRows || []) as Record<string, unknown>[]) {
    const hash = String(row.content_hash)
    const text = textByHash.get(hash)
    if (!text) continue
    if (Array.isArray(row.embedding)) {
      result.set(text, row.embedding as number[])
      cachedHashes.add(hash)
    }
  }

  const missingEntries = unique
    .map((text, i) => ({ text, hash: hashes[i] }))
    .filter((entry) => !cachedHashes.has(entry.hash))

  let misses = 0
  if (missingEntries.length > 0) {
    const rowsToUpsert: Record<string, unknown>[] = []

    for (const batch of chunk(missingEntries, COHERE_BATCH_LIMIT)) {
      const { embeddings, model, dimension } = await embedTexts(
        batch.map((e) => e.text),
        inputType,
      )

      batch.forEach((entry, i) => {
        const embedding = embeddings[i] as number[]
        result.set(entry.text, embedding)
        rowsToUpsert.push({
          content_hash: entry.hash,
          normalized_text: entry.text,
          input_type: inputType,
          embedding,
          embedding_model: model,
          embedding_dim: dimension,
        })
      })
      misses += batch.length
    }

    // Upsert once at the end. onConflict=content_hash is a no-op if
    // another request inserted the same row in parallel — harmless.
    const { error: upsertError } = await supabase
      .from('requirement_embeddings')
      .upsert(rowsToUpsert, { onConflict: 'content_hash' })

    if (upsertError) throw upsertError
  }

  return {
    map: result,
    stats: {
      requested: unique.length,
      hits: unique.length - misses,
      misses,
    },
  }
}
