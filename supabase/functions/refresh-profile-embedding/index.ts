import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleCorsPreflightRequest, jsonResponse } from '../_shared/cors.ts'
import { ensureProfileEmbedding } from '../_shared/embeddingStore.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface RefreshProfileEmbeddingRequest {
  userId?: string
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return handleCorsPreflightRequest()
    }

    const body = (await req.json()) as RefreshProfileEmbeddingRequest
    const userId = body.userId

    if (!userId) {
      return jsonResponse({ error: 'userId is required' }, { status: 400 })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: profile, error } = await supabase
      .from('jobseeker_profiles')
      .select('id, predefined_skills, skills, work_experiences, highest_education, course_or_field, preferred_occupations, preferred_job_type, preferred_local_locations, preferred_overseas_locations, experience_categories, languages, certifications, professional_licenses, vocational_training, portfolio_url, employment_status, willing_to_relocate, expected_salary_min, expected_salary_max')
      .eq('id', userId)
      .maybeSingle()

    if (error) throw error
    if (!profile) {
      return jsonResponse({ error: 'Profile not found' }, { status: 404 })
    }

    const ensured = await ensureProfileEmbedding(supabase as never, { ...profile, user_id: profile.id } as unknown as Record<string, unknown>)

    return jsonResponse({
      userId,
      profileId: profile.id,
      updated: ensured.updated,
      reused: ensured.reused,
      contentHash: ensured.contentHash,
      embeddingModel: ensured.embeddingModel,
      embeddingDim: ensured.embeddingDim,
      updatedAt: ensured.updatedAt,
    })
  } catch (err) {
    console.error('refresh-profile-embedding error:', err)
    return jsonResponse({ error: err.message }, { status: 500 })
  }
})
