import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Annual Verification Reset Edge Function
 *
 * Intended to run on January 1 each year (Asia/Manila time) via a cron trigger
 * or manual invocation. Resets verification for all jobseekers and employers
 * whose verified_for_year is earlier than the current year.
 *
 * Homeowners and admins are never affected.
 *
 * The function calls the database helper `reset_expired_verifications()` which
 * handles the actual row updates atomically.
 *
 * Schedule this with Supabase cron or an external scheduler. All cron
 * expressions below are interpreted in UTC — Supabase's pg_cron does NOT
 * evaluate cron in Asia/Manila, so the UTC offset must be baked in.
 *
 * Asia/Manila is UTC+08:00 with no DST, so midnight PHT is 16:00 UTC the
 * previous day. The correct expression is:
 *
 *   0 16 31 12 *   (16:00 UTC on Dec 31 == 00:00 PHT on Jan 1)
 *
 * Do NOT use `0 0 1 1 *` — that fires at 00:00 UTC (08:00 PHT) on Jan 1,
 * so users in Manila would already be into the new year for 8 hours
 * before verification flips. The function itself is idempotent (it keys
 * off EXTRACT(YEAR FROM now()) at Asia/Manila inside the SQL helper),
 * but scheduling at the right wall-clock moment keeps the audit log
 * honest.
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req: Request) => {
  try {
    // Optional: verify authorization header for manual invocations
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Call the database function that performs the reset
    const { data, error } = await supabase.rpc('reset_expired_verifications')

    if (error) {
      console.error('reset_expired_verifications RPC error:', error)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const affectedCount = data as number
    console.log(`Annual verification reset complete. ${affectedCount} user(s) expired.`)

    return new Response(
      JSON.stringify({
        success: true,
        affected_count: affectedCount,
        reset_at: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (err) {
    console.error('Unexpected error in annual-verification-reset:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})
