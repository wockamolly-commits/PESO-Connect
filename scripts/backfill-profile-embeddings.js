/**
 * One-time backfill: regenerate stored embeddings for all jobseeker profiles.
 *
 * Run after switching embedding providers (Cohere → Voyage) so that
 * all profile vectors are in the same vector space as job vectors.
 *
 * Usage:
 *   node --experimental-vm-modules scripts/backfill-profile-embeddings.js
 *
 * Requires:
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const { data: profiles, error } = await supabase
  .from('jobseeker_profiles')
  .select('id')

if (error) {
  console.error('Failed to fetch profiles:', error.message)
  process.exit(1)
}

console.log(`Refreshing embeddings for ${profiles.length} profile(s)…`)

let updated = 0
let reused = 0
let failed = 0

const DELAY_MS = 21000 // 3 RPM limit on free Voyage tier — 1 call per 21s

for (const profile of profiles) {
  const res = await supabase.functions.invoke('refresh-profile-embedding', {
    body: { userId: profile.id },
  })

  if (res.error) {
    const detail = res.data ? JSON.stringify(res.data) : ''
    console.error(`  ✗ ${profile.id} — ${res.error.message}${detail ? ' | ' + detail : ''}`)
    failed++
  } else {
    const { updated: u } = res.data
    if (u) { updated++; console.log(`  ↑ ${profile.id} — updated`) }
    else    { reused++;  console.log(`  · ${profile.id} — unchanged`) }
  }

  if (profile !== profiles[profiles.length - 1]) {
    await new Promise((resolve) => setTimeout(resolve, DELAY_MS))
  }
}

console.log(`\nDone. updated=${updated} unchanged=${reused} failed=${failed}`)
