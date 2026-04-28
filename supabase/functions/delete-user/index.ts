// delete-user — permanently removes a user account (super-admin or sub-admin with delete_users).
//
// Request body:
//   target_id  string  — UUID of the user to delete
//
// Sequence:
//   1. Validate target_id
//   2. Verify caller JWT → super-admin OR sub-admin with delete_users permission
//   3. Fetch target from public.users
//   4. Guard: block if target is a super-admin
//   5. Guard: block self-deletion
//   6. Delete role profile row
//   7. Delete public.users row
//   8. Delete auth.users row
//   9. Insert audit log record

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}
const jsonResponse = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), { ...init, headers: { ...corsHeaders, ...(init.headers ?? {}) } })
const handleCorsPreflightRequest = () => new Response('ok', { headers: corsHeaders })

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const ROLE_PROFILE_TABLE: Record<string, string> = {
  jobseeker: 'jobseeker_profiles',
  employer: 'employer_profiles',
  individual: 'individual_profiles',
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleCorsPreflightRequest()

  try {
    // ----------------------------------------------------------------
    // Parse & validate body
    // ----------------------------------------------------------------
    const { target_id } = await req.json() as { target_id: string }

    if (!target_id || typeof target_id !== 'string') {
      return jsonResponse({ error: 'Missing required field: target_id.' }, { status: 400 })
    }
    if (!UUID_REGEX.test(target_id)) {
      return jsonResponse({ error: 'Invalid target_id format.' }, { status: 400 })
    }

    // ----------------------------------------------------------------
    // Verify caller identity and permission
    // ----------------------------------------------------------------
    const authHeader = req.headers.get('Authorization') ?? ''
    const callerToken = authHeader.replace(/^Bearer\s+/i, '')
    if (!callerToken) {
      return jsonResponse({ error: 'Missing authorization token.' }, { status: 401 })
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: { user: callerUser }, error: callerError } = await adminClient.auth.getUser(callerToken)
    if (callerError || !callerUser) {
      return jsonResponse({ error: 'Could not verify caller identity.' }, { status: 401 })
    }

    const { data: callerAccess, error: accessError } = await adminClient
      .from('admin_access')
      .select('admin_level, permissions')
      .eq('user_id', callerUser.id)
      .maybeSingle()

    if (accessError) {
      console.error('[delete-user] admin_access lookup failed:', accessError)
      return jsonResponse({ error: 'Permission check failed.' }, { status: 500 })
    }

    const isSuperAdmin = callerAccess?.admin_level === 'admin'
    const isSubAdminWithDeletePermission =
      callerAccess?.admin_level === 'sub-admin' &&
      Array.isArray(callerAccess?.permissions) &&
      callerAccess.permissions.includes('delete_users')

    if (!isSuperAdmin && !isSubAdminWithDeletePermission) {
      return jsonResponse({ error: 'You do not have permission to delete users.' }, { status: 403 })
    }

    // ----------------------------------------------------------------
    // Self-deletion guard
    // ----------------------------------------------------------------
    if (target_id === callerUser.id) {
      return jsonResponse({ error: 'You cannot delete your own account.' }, { status: 403 })
    }

    // ----------------------------------------------------------------
    // Fetch target user
    // ----------------------------------------------------------------
    const { data: targetUser, error: targetError } = await adminClient
      .from('users')
      .select('id, name, email, role, subtype, is_verified, created_at')
      .eq('id', target_id)
      .maybeSingle()

    if (targetError || !targetUser) {
      return jsonResponse({ error: 'User not found.' }, { status: 404 })
    }

    // ----------------------------------------------------------------
    // Super-admin protection guard
    // ----------------------------------------------------------------
    if (targetUser.role === 'admin') {
      const { data: targetAccess } = await adminClient
        .from('admin_access')
        .select('admin_level')
        .eq('user_id', target_id)
        .maybeSingle()

      if (targetAccess?.admin_level === 'admin') {
        return jsonResponse({ error: 'Super-admin accounts cannot be deleted.' }, { status: 403 })
      }
    }

    // ----------------------------------------------------------------
    // Build snapshot before any deletion
    // ----------------------------------------------------------------
    const snapshot = {
      name: targetUser.name,
      email: targetUser.email,
      role: targetUser.role,
      subtype: targetUser.subtype,
      is_verified: targetUser.is_verified,
      created_at: targetUser.created_at,
    }

    // ----------------------------------------------------------------
    // Delete role profile → public.users → auth.users
    // ----------------------------------------------------------------
    const profileTable = ROLE_PROFILE_TABLE[targetUser.role] ?? null
    if (profileTable) {
      const { error: profileError } = await adminClient
        .from(profileTable)
        .delete()
        .eq('id', target_id)
      if (profileError) {
        console.error('[delete-user] profile delete failed:', profileError)
      }
    }

    await adminClient.from('users').delete().eq('id', target_id)

    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(target_id)
    if (authDeleteError) {
      console.error('[delete-user] auth.admin.deleteUser failed:', authDeleteError)
      return jsonResponse({ error: 'Failed to delete user account.' }, { status: 500 })
    }

    // ----------------------------------------------------------------
    // Insert audit log
    // ----------------------------------------------------------------
    const { error: auditError } = await adminClient.from('admin_audit_log').insert({
      action: 'delete_user',
      actor_id: callerUser.id,
      actor_email: callerUser.email,
      target_id,
      snapshot,
    })

    if (auditError) {
      // User is already deleted — log to console for manual recovery.
      console.error('[delete-user] audit log insert failed:', auditError, JSON.stringify({
        actor: callerUser.email,
        target: targetUser.email,
        timestamp: new Date().toISOString(),
      }))
    }

    return jsonResponse({ ok: true })
  } catch (err) {
    console.error('[delete-user] unexpected error:', err)
    return jsonResponse({ error: 'Internal server error.' }, { status: 500 })
  }
})
