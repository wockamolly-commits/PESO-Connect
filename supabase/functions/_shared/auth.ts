type SupabaseClient = any

export const getBearerToken = (req: Request) => {
  const authHeader = req.headers.get('Authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) throw new Error('Missing authorization token')
  return token
}

export const getAuthenticatedUser = async (supabase: SupabaseClient, req: Request) => {
  const token = getBearerToken(req)
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) throw new Error('Invalid authorization token')
  return user
}

export const isAdminUser = async (supabase: SupabaseClient, userId: string) => {
  const { data, error } = await supabase
    .from('admin_access')
    .select('admin_level')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return Boolean(data?.admin_level)
}

export const assertUserCanAccessUser = async (
  supabase: SupabaseClient,
  req: Request,
  targetUserId: string,
) => {
  const user = await getAuthenticatedUser(supabase, req)
  if (user.id === targetUserId) return user
  if (await isAdminUser(supabase, user.id)) return user
  throw new Error('Forbidden')
}

export const assertUserCanAccessJob = async (
  supabase: SupabaseClient,
  req: Request,
  jobId: string,
) => {
  const user = await getAuthenticatedUser(supabase, req)
  if (await isAdminUser(supabase, user.id)) return user

  const { data: job, error } = await supabase
    .from('job_postings')
    .select('employer_id')
    .eq('id', jobId)
    .maybeSingle()
  if (error) throw error
  if (job?.employer_id === user.id) return user
  throw new Error('Forbidden')
}

export const authErrorResponse = (error: unknown, jsonResponse: (body: unknown, init?: ResponseInit) => Response) => {
  const message = error instanceof Error ? error.message : 'Unauthorized'
  if (message === 'Forbidden') return jsonResponse({ error: 'Forbidden' }, { status: 403 })
  return jsonResponse({ error: message }, { status: 401 })
}
