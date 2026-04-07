import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleCorsPreflightRequest, jsonResponse } from '../_shared/cors.ts'
import { ensureJobEmbedding } from '../_shared/embeddingStore.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface RefreshJobEmbeddingRequest {
  jobId?: string
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return handleCorsPreflightRequest()
    }

    const body = (await req.json()) as RefreshJobEmbeddingRequest
    const jobId = body.jobId

    if (!jobId) {
      return jsonResponse({ error: 'jobId is required' }, { status: 400 })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: job, error } = await supabase
      .from('job_postings')
      .select('id, title, category, description, requirements, required_skills, experience_level, education_level, type, location')
      .eq('id', jobId)
      .maybeSingle()

    if (error) throw error
    if (!job) {
      return jsonResponse({ error: 'Job not found' }, { status: 404 })
    }

    const ensured = await ensureJobEmbedding(supabase as never, job as unknown as Record<string, unknown>)

    return jsonResponse({
      jobId,
      updated: ensured.updated,
      reused: ensured.reused,
      contentHash: ensured.contentHash,
      embeddingModel: ensured.embeddingModel,
      embeddingDim: ensured.embeddingDim,
      updatedAt: ensured.updatedAt,
    })
  } catch (err) {
    console.error('refresh-job-embedding error:', err)
    return jsonResponse({ error: err.message }, { status: 500 })
  }
})
