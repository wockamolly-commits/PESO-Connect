// invite-admin — sends a Supabase auth invite and logs pending permissions
// Called by InviteAdminModal (super-admin only).
//
// Request body:
//   email        string   — the address to invite
//   templateId   string   — role template id (for logging only)
//   permissions  string[] — permissions to grant the new sub-admin
//
// The function:
//   1. Verifies the caller is authenticated and is a super-admin
//   2. Rejects if the email already belongs to a non-admin account
//   3. Sends the invite via supabase.auth.admin.inviteUserByEmail()
//   4. Inserts a pending admin_access row so permissions are ready
//      the moment the invitee completes account setup

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleCorsPreflightRequest()

  try {
    // ----------------------------------------------------------------
    // Parse body
    // ----------------------------------------------------------------
    const { email, templateId, permissions } = await req.json() as {
      email: string
      templateId: string
      permissions: string[]
    }

    if (!email || !templateId || !Array.isArray(permissions)) {
      return jsonResponse({ error: 'Missing required fields: email, templateId, permissions.' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()

    // ----------------------------------------------------------------
    // Verify caller is a super-admin using their JWT
    // ----------------------------------------------------------------
    const authHeader = req.headers.get('Authorization') ?? ''
    const callerToken = authHeader.replace(/^Bearer\s+/i, '')
    if (!callerToken) {
      return jsonResponse({ error: 'Missing authorization token.' }, { status: 401 })
    }

    // Admin client bypasses RLS — used for all privileged operations below.
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Resolve the caller's user id by verifying their JWT with the admin client.
    const { data: { user: callerUser }, error: callerError } = await adminClient.auth.getUser(callerToken)
    if (callerError || !callerUser) {
      return jsonResponse({ error: 'Could not verify caller identity.' }, { status: 401 })
    }

    // Check admin_access: caller must be a super-admin (admin_level = 'admin')
    const { data: callerAccess, error: accessError } = await adminClient
      .from('admin_access')
      .select('admin_level')
      .eq('user_id', callerUser.id)
      .maybeSingle()

    if (accessError) {
      console.error('[invite-admin] admin_access lookup failed:', accessError)
      return jsonResponse({ error: 'Permission check failed.' }, { status: 500 })
    }

    if (callerAccess?.admin_level !== 'admin') {
      return jsonResponse({ error: 'Only super-admins can invite new admins.' }, { status: 403 })
    }

    // ----------------------------------------------------------------
    // Guard: reject if email is already tied to a non-admin account
    // ----------------------------------------------------------------
    const { data: existingUser } = await adminClient
      .from('users')
      .select('id, role, subtype')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (existingUser) {
      // Allow if they are already an admin (idempotent re-invite).
      if (existingUser.role !== 'admin') {
        const accountType = existingUser.subtype
          ? `${existingUser.subtype} account`
          : `${existingUser.role} account`
        return jsonResponse({
          error:
            `This email is already registered as a ${accountType}. ` +
            'Please use an official or separate email address for admin access.',
        }, { status: 409 })
      }
    }

    // ----------------------------------------------------------------
    // Send the invite — the invitee receives an email with a magic link.
    // We pass role='admin' in user_metadata so the handle_new_user()
    // DB trigger creates the public.users row with the correct role.
    // ----------------------------------------------------------------
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      normalizedEmail,
      {
        data: { role: 'admin', needs_password_setup: true },
        redirectTo: `${Deno.env.get('APP_URL') ?? ''}/admin`,
      }
    )

    if (inviteError) {
      console.error('[invite-admin] inviteUserByEmail failed:', inviteError)
      // Supabase returns a 422 when the user already exists in auth.users.
      const msg = inviteError.message?.toLowerCase() ?? ''
      if (msg.includes('already been registered') || msg.includes('already registered')) {
        return jsonResponse({
          error: 'An auth account with this email already exists. Ask a super-admin to configure their admin_access directly.',
        }, { status: 409 })
      }
      return jsonResponse({ error: inviteError.message || 'Invite failed.' }, { status: 500 })
    }

    const invitedUserId = inviteData?.user?.id
    if (!invitedUserId) {
      return jsonResponse({ error: 'Invite sent but could not retrieve user ID.' }, { status: 500 })
    }

    // ----------------------------------------------------------------
    // Log pending permissions in admin_access so the invitee's
    // dashboard works the moment they accept the invite.
    //
    // The public.users row is created by handle_new_user() during
    // inviteUserByEmail — so the FK is safe to reference immediately.
    // ----------------------------------------------------------------
    const { error: accessInsertError } = await adminClient
      .from('admin_access')
      .upsert(
        {
          user_id: invitedUserId,
          admin_level: 'sub-admin',
          permissions,
          created_by: callerUser.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )

    if (accessInsertError) {
      // The invite was sent — don't fail the whole request.
      // Log the error and return a partial-success response.
      console.error('[invite-admin] admin_access insert failed:', accessInsertError)
      return jsonResponse({
        ok: true,
        warning: 'Invite sent but permissions could not be saved. Configure them manually in Admin Management.',
        userId: invitedUserId,
      })
    }

    return jsonResponse({ ok: true, userId: invitedUserId })
  } catch (err) {
    console.error('[invite-admin] unexpected error:', err)
    return jsonResponse({ error: 'Internal server error.' }, { status: 500 })
  }
})
