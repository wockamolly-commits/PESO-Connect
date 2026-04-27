/**
 * One-time backfill: regenerate stored embeddings for all job postings.
 *
 * Run after deploying the course_strand embedding change so that
 * `buildJobText` picks up the new field for every existing job.
 *
 * Usage:
 *   node scripts/backfill-job-embeddings.js
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

const { data: jobs, error } = await supabase
  .from('job_postings')
  .select('id, title')
  .neq('status', 'deleted')

if (error) {
  console.error('Failed to fetch jobs:', error.message)
  process.exit(1)
}

console.log(`Refreshing embeddings for ${jobs.length} job(s)…`)

let updated = 0
let reused = 0
let failed = 0

const DELAY_MS = 21000 // 3 RPM limit on free Voyage tier — 1 call per 21s

for (const job of jobs) {
  const res = await supabase.functions.invoke('refresh-job-embedding', {
    body: { jobId: job.id },
  })
  if (res.error) {
    const detail = res.data ? JSON.stringify(res.data) : ''
    console.error(`  ✗ ${job.id} "${job.title}" — ${res.error.message}${detail ? ' | ' + detail : ''}`)
    failed++
  } else {
    const { updated: u } = res.data
    if (u) { updated++; console.log(`  ↑ ${job.id} "${job.title}" — updated`) }
    else    { reused++;  console.log(`  · ${job.id} "${job.title}" — unchanged`) }
  }

  // Stay under Voyage free tier limit (3 RPM) — skip delay after last job
  if (job !== jobs[jobs.length - 1]) {
    await new Promise((resolve) => setTimeout(resolve, DELAY_MS))
  }
}

console.log(`\nDone. updated=${updated} unchanged=${reused} failed=${failed}`)
