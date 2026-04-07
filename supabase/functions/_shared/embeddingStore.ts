import { embedTexts } from './cohere.ts'
import { sha256 } from './hash.ts'
import { buildJobText, buildProfileText } from './matchingText.ts'

type SupabaseClientLike = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: { message?: string } | null }>
      }
    }
    upsert: (
      value: Record<string, unknown>,
      options: { onConflict: string },
    ) => Promise<{ error: { message?: string } | null }>
  }
}

export const ensureJobEmbedding = async (
  supabase: SupabaseClientLike,
  job: Record<string, unknown>,
) => {
  const jobId = String(job.id || '')
  if (!jobId) throw new Error('Job record is missing id')

  const sourceText = buildJobText(job)
  const contentHash = await sha256(sourceText)

  const { data: existing, error: existingError } = await supabase
    .from('job_embeddings')
    .select('job_id, content_hash, embedding, embedding_model, embedding_dim, updated_at')
    .eq('job_id', jobId)
    .maybeSingle()

  if (existingError) throw new Error(existingError.message || 'Failed to load job embedding')

  if (existing && existing.content_hash === contentHash) {
    return {
      jobId,
      updated: false,
      reused: true,
      contentHash,
      embedding: existing.embedding,
      embeddingModel: existing.embedding_model,
      embeddingDim: existing.embedding_dim,
      updatedAt: existing.updated_at,
      sourceText,
    }
  }

  const { embeddings, model, dimension } = await embedTexts([sourceText], 'search_document')
  const embedding = embeddings[0]

  const { error: upsertError } = await supabase
    .from('job_embeddings')
    .upsert(
      {
        job_id: jobId,
        content_hash: contentHash,
        embedding,
        embedding_model: model,
        embedding_dim: dimension,
        source_text: sourceText,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'job_id' },
    )

  if (upsertError) throw new Error(upsertError.message || 'Failed to save job embedding')

  return {
    jobId,
    updated: true,
    reused: false,
    contentHash,
    embedding,
    embeddingModel: model,
    embeddingDim: dimension,
    updatedAt: new Date().toISOString(),
    sourceText,
  }
}

export const ensureProfileEmbedding = async (
  supabase: SupabaseClientLike,
  profile: Record<string, unknown>,
) => {
  const profileId = String(profile.id || '')
  const userId = String(profile.user_id || '')
  if (!profileId || !userId) throw new Error('Profile record is missing id or user_id')

  const sourceText = buildProfileText(profile)
  const contentHash = await sha256(sourceText)

  const { data: existing, error: existingError } = await supabase
    .from('profile_embeddings')
    .select('profile_id, content_hash, embedding, embedding_model, embedding_dim, updated_at')
    .eq('profile_id', profileId)
    .maybeSingle()

  if (existingError) throw new Error(existingError.message || 'Failed to load profile embedding')

  if (existing && existing.content_hash === contentHash) {
    return {
      profileId,
      userId,
      updated: false,
      reused: true,
      contentHash,
      embedding: existing.embedding,
      embeddingModel: existing.embedding_model,
      embeddingDim: existing.embedding_dim,
      updatedAt: existing.updated_at,
      sourceText,
    }
  }

  const { embeddings, model, dimension } = await embedTexts([sourceText], 'search_document')
  const embedding = embeddings[0]

  const { error: upsertError } = await supabase
    .from('profile_embeddings')
    .upsert(
      {
        profile_id: profileId,
        user_id: userId,
        content_hash: contentHash,
        embedding,
        embedding_model: model,
        embedding_dim: dimension,
        source_text: sourceText,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'profile_id' },
    )

  if (upsertError) throw new Error(upsertError.message || 'Failed to save profile embedding')

  return {
    profileId,
    userId,
    updated: true,
    reused: false,
    contentHash,
    embedding,
    embeddingModel: model,
    embeddingDim: dimension,
    updatedAt: new Date().toISOString(),
    sourceText,
  }
}
