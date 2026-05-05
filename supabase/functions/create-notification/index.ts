import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getAuthenticatedUser, isAdminUser } from '../_shared/auth.ts'
import { handleCorsPreflightRequest, jsonResponse } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const MAX_TITLE_LENGTH = 140
const MAX_MESSAGE_LENGTH = 500
const ALLOWED_TYPES = new Set([
  'application_submitted',
  'new_application',
  'application_status_change',
  'account_status',
])
const ALLOWED_ACCOUNT_STATUSES = new Set(['approved', 'verified', 'rejected'])
const ALLOWED_APPLICATION_STATUSES = new Set(['pending', 'shortlisted', 'hired', 'rejected'])
type SupabaseClient = any

const cleanText = (value: unknown, maxLength: number) =>
  String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength)

const cleanData = (data: unknown) => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {}
  return Object.fromEntries(
    Object.entries(data as Record<string, unknown>).filter(([key]) => /^[a-zA-Z0-9_]+$/.test(key)),
  )
}

const requireUuidish = (value: unknown, field: string) => {
  const text = cleanText(value, 80)
  if (!/^[0-9a-fA-F-]{32,36}$/.test(text)) throw new Error(`Invalid ${field}`)
  return text
}

const getJob = async (supabase: SupabaseClient, jobId: string) => {
  const { data, error } = await supabase
    .from('job_postings')
    .select('id, employer_id')
    .eq('id', jobId)
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Job not found')
  return data
}

const getApplication = async (
  supabase: SupabaseClient,
  filters: { applicationId?: string; jobId?: string; userId?: string },
) => {
  let query = supabase
    .from('applications')
    .select('id, job_id, user_id, status')

  if (filters.applicationId) query = query.eq('id', filters.applicationId)
  if (filters.jobId) query = query.eq('job_id', filters.jobId)
  if (filters.userId) query = query.eq('user_id', filters.userId)

  const { data, error } = await query.maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Application not found')
  return data
}

const validateNotification = async (
  supabase: SupabaseClient,
  actorId: string,
  recipientId: string,
  type: string,
  data: Record<string, unknown>,
) => {
  if (!ALLOWED_TYPES.has(type)) throw new Error('Unsupported notification type')

  if (type === 'application_submitted') {
    if (recipientId !== actorId) throw new Error('Forbidden')
    const jobId = requireUuidish(data.job_id, 'job_id')
    const applicationId = data.application_id ? requireUuidish(data.application_id, 'application_id') : undefined
    const application = await getApplication(supabase, { applicationId, jobId, userId: actorId })
    if (application.job_id !== jobId) throw new Error('Forbidden')
    return
  }

  if (type === 'new_application') {
    const jobId = requireUuidish(data.job_id, 'job_id')
    const job = await getJob(supabase, jobId)
    if (job.employer_id !== recipientId) throw new Error('Forbidden')
    const applicationId = data.application_id ? requireUuidish(data.application_id, 'application_id') : undefined
    await getApplication(supabase, { applicationId, jobId, userId: actorId })
    return
  }

  if (type === 'application_status_change') {
    const applicationId = requireUuidish(data.application_id, 'application_id')
    const status = cleanText(data.status, 40)
    if (!ALLOWED_APPLICATION_STATUSES.has(status)) throw new Error('Invalid application status')
    const application = await getApplication(supabase, { applicationId })
    if (application.user_id !== recipientId) throw new Error('Forbidden')
    const job = await getJob(supabase, application.job_id)
    const actorIsAdmin = await isAdminUser(supabase, actorId)
    if (job.employer_id !== actorId && !actorIsAdmin) throw new Error('Forbidden')
    return
  }

  if (type === 'account_status') {
    const actorIsAdmin = await isAdminUser(supabase, actorId)
    const status = cleanText(data.status, 40)
    if (!actorIsAdmin) throw new Error('Forbidden')
    if (!ALLOWED_ACCOUNT_STATUSES.has(status)) throw new Error('Invalid account status')
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleCorsPreflightRequest()
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, { status: 405 })

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const actor = await getAuthenticatedUser(supabase, req)
    const body = await req.json()
    const recipientId = requireUuidish(body.userId, 'userId')
    const type = cleanText(body.type, 80)
    const title = cleanText(body.title, MAX_TITLE_LENGTH)
    const message = cleanText(body.message, MAX_MESSAGE_LENGTH)
    const data = cleanData(body.data)

    if (!title || !message) {
      return jsonResponse({ error: 'Missing title or message' }, { status: 400 })
    }

    await validateNotification(supabase, actor.id, recipientId, type, data)

    const { data: inserted, error } = await supabase
      .from('notifications')
      .insert({ user_id: recipientId, type, title, message, data })
      .select('id')
      .single()

    if (error) throw error
    return jsonResponse({ success: true, id: inserted.id })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to create notification'
    const status = message === 'Forbidden' ? 403 : message.includes('Invalid') || message.includes('Missing') ? 400 : 401
    return jsonResponse({ error: message }, { status })
  }
})
